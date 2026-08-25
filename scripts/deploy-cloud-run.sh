#!/usr/bin/env bash
#
# Deploy the AccessOps scan worker to Cloud Run (scale-to-zero), including its
# Artifact Registry image, service accounts, IAM, Cloud Tasks queue and Cloud
# Scheduler jobs. Idempotent: re-running updates the same resources.
#
# Prereqs:
#   gcloud auth login && gcloud config set project <PROJECT>
#   The Firebase Admin service-account email used by the Vercel web app. Its
#   existing private key remains only on Vercel; Cloud Run uses ADC.
#
# Usage:
#   PROJECT=my-fb-project REGION=europe-west1 \
#   TASK_CREATOR_SERVICE_ACCOUNT=...@....iam.gserviceaccount.com \
#   INTERNAL_WORKER_SECRET=... CRON_SECRET=... \
#   VERCEL_APP_URL=https://app.example.com \
#   ./scripts/deploy-cloud-run.sh
set -euo pipefail

: "${PROJECT:?set PROJECT to your Firebase/GCP project id}"
# Keep compute close to Firestore. For the eur3 multi-region, europe-west1 is
# the preferred worker/queue region.
: "${REGION:?set REGION to your Firestore region, e.g. europe-west1}"
: "${TASK_CREATOR_SERVICE_ACCOUNT:?set TASK_CREATOR_SERVICE_ACCOUNT to the Firebase Admin service account used by Vercel}"
: "${INTERNAL_WORKER_SECRET:?set INTERNAL_WORKER_SECRET (shared with Vercel)}"
: "${CRON_SECRET:?set CRON_SECRET (bearer for the sweep)}"
: "${VERCEL_APP_URL:?set VERCEL_APP_URL, e.g. https://app.example.com}"

SERVICE="${SERVICE:-scan-worker}"
QUEUE="${QUEUE:-scan-jobs}"
SWEEP_JOB="${SWEEP_JOB:-scan-sweep}"
MONITOR_JOB="${MONITOR_JOB:-monitor-scheduler}"
SWEEP_SCHEDULE="${SWEEP_SCHEDULE:-*/2 * * * *}"
MONITOR_SCHEDULE="${MONITOR_SCHEDULE:-*/5 * * * *}"
ARTIFACT_REPO="${ARTIFACT_REPO:-accessops-workers}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-scan-worker-runtime}"
TASK_INVOKER_SA_NAME="${TASK_INVOKER_SA_NAME:-scan-task-invoker}"
INTERNAL_SECRET_NAME="${INTERNAL_SECRET_NAME:-scan-worker-internal-secret}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)-$(date -u +%Y%m%d%H%M%S)}"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
TASK_INVOKER_SA="${TASK_INVOKER_SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format 'value(projectNumber)')"
CLOUD_TASKS_SERVICE_AGENT="service-${PROJECT_NUMBER}@gcp-sa-cloudtasks.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${ARTIFACT_REPO}/${SERVICE}:${IMAGE_TAG}"

echo "==> Enabling Google Cloud APIs"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudtasks.googleapis.com \
  cloudscheduler.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT"

echo "==> Ensuring Artifact Registry repository '$ARTIFACT_REPO'"
gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --project "$PROJECT" --location "$REGION" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --project "$PROJECT" --location "$REGION" \
    --repository-format docker \
    --description "AccessOps worker containers"

ensure_service_account() {
  local name="$1"
  local display_name="$2"
  gcloud iam service-accounts describe \
    "${name}@${PROJECT}.iam.gserviceaccount.com" \
    --project "$PROJECT" >/dev/null 2>&1 \
    || gcloud iam service-accounts create "$name" \
      --project "$PROJECT" --display-name "$display_name"
}

echo "==> Ensuring worker service accounts"
ensure_service_account "$RUNTIME_SA_NAME" "AccessOps scan worker runtime"
ensure_service_account "$TASK_INVOKER_SA_NAME" "AccessOps Cloud Tasks invoker"

echo "==> Granting least-privilege IAM"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:${RUNTIME_SA}" \
  --role roles/datastore.user \
  --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:${TASK_CREATOR_SERVICE_ACCOUNT}" \
  --role roles/cloudtasks.enqueuer \
  --condition=None >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$TASK_INVOKER_SA" \
  --project "$PROJECT" \
  --member "serviceAccount:${TASK_CREATOR_SERVICE_ACCOUNT}" \
  --role roles/iam.serviceAccountUser >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$TASK_INVOKER_SA" \
  --project "$PROJECT" \
  --member "serviceAccount:${CLOUD_TASKS_SERVICE_AGENT}" \
  --role roles/iam.serviceAccountUser >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$TASK_INVOKER_SA" \
  --project "$PROJECT" \
  --member "serviceAccount:${CLOUD_TASKS_SERVICE_AGENT}" \
  --role roles/iam.serviceAccountOpenIdTokenCreator >/dev/null

echo "==> Storing the worker shared secret in Secret Manager"
gcloud secrets describe "$INTERNAL_SECRET_NAME" --project "$PROJECT" >/dev/null 2>&1 \
  || gcloud secrets create "$INTERNAL_SECRET_NAME" \
    --project "$PROJECT" --replication-policy automatic
printf '%s' "$INTERNAL_WORKER_SECRET" \
  | gcloud secrets versions add "$INTERNAL_SECRET_NAME" \
      --project "$PROJECT" --data-file=- >/dev/null
gcloud secrets add-iam-policy-binding "$INTERNAL_SECRET_NAME" \
  --project "$PROJECT" \
  --member "serviceAccount:${RUNTIME_SA}" \
  --role roles/secretmanager.secretAccessor >/dev/null

echo "==> Building worker image from Dockerfile.worker"
gcloud builds submit . \
  --project "$PROJECT" \
  --config cloudbuild.worker.yaml \
  --substitutions "_IMAGE=${IMAGE}"

echo "==> Deploying Cloud Run service '$SERVICE'"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --image "$IMAGE" \
  --service-account "$RUNTIME_SA" \
  --memory 2Gi --cpu 1 \
  --concurrency 1 \
  --min-instances 0 --max-instances "${MAX_INSTANCES:-5}" \
  --timeout 600 \
  --invoker-iam-check \
  --no-allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=${PROJECT},SCAN_RENDER_PROFILE=real,WORKER_CONCURRENCY=${WORKER_CONCURRENCY:-2},WORKER_PROCESS_BUDGET_MS=${WORKER_PROCESS_BUDGET_MS:-240000},WORKER_HEARTBEAT_MS=${WORKER_HEARTBEAT_MS:-15000},WORKER_STALE_RUNNING_MS=${WORKER_STALE_RUNNING_MS:-45000},WORKER_MAX_RSS_MB=${WORKER_MAX_RSS_MB:-1536},WORKER_BROWSER_RECYCLE_JOBS=${WORKER_BROWSER_RECYCLE_JOBS:-50},WORKER_BROWSER_RELAUNCH_ATTEMPTS=${WORKER_BROWSER_RELAUNCH_ATTEMPTS:-3},WORKER_BROWSER_RELAUNCH_BASE_MS=${WORKER_BROWSER_RELAUNCH_BASE_MS:-500},SCAN_MAX_CONCURRENT_CONTEXTS=${SCAN_MAX_CONCURRENT_CONTEXTS:-2},SCAN_PAGE_CONCURRENCY=${SCAN_PAGE_CONCURRENCY:-2}" \
  --set-secrets "INTERNAL_WORKER_SECRET=${INTERNAL_SECRET_NAME}:latest"

WORKER_URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
echo "==> Worker URL: $WORKER_URL  (set SCAN_WORKER_URL to this on Vercel)"

echo "==> Allowing Cloud Tasks OIDC identity to invoke the private worker"
gcloud run services add-iam-policy-binding "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --member "serviceAccount:${TASK_INVOKER_SA}" \
  --role roles/run.invoker >/dev/null

echo "==> Ensuring Cloud Tasks queue '$QUEUE'"
gcloud tasks queues describe "$QUEUE" --project "$PROJECT" --location "$REGION" >/dev/null 2>&1 \
  || gcloud tasks queues create "$QUEUE" --project "$PROJECT" --location "$REGION"
gcloud tasks queues update "$QUEUE" \
  --project "$PROJECT" --location "$REGION" \
  --max-concurrent-dispatches "${MAX_INSTANCES:-5}" \
  --max-dispatches-per-second "${MAX_DISPATCHES_PER_SECOND:-5}" \
  --max-attempts "${TASK_MAX_ATTEMPTS:-8}" \
  --min-backoff "${TASK_MIN_BACKOFF:-10s}" \
  --max-backoff "${TASK_MAX_BACKOFF:-300s}" >/dev/null

ensure_scheduler_job() {
  local name="$1"
  local schedule="$2"
  local uri="$3"
  if gcloud scheduler jobs describe "$name" \
    --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "$name" \
      --project "$PROJECT" --location "$REGION" \
      --schedule "$schedule" --time-zone UTC \
      --uri "$uri" --http-method POST \
      --attempt-deadline 300s \
      --max-retry-attempts 3 \
      --update-headers "Authorization=Bearer ${CRON_SECRET}"
  else
    gcloud scheduler jobs create http "$name" \
      --project "$PROJECT" --location "$REGION" \
      --schedule "$schedule" --time-zone UTC \
      --uri "$uri" --http-method POST \
      --attempt-deadline 300s \
      --max-retry-attempts 3 \
      --headers "Authorization=Bearer ${CRON_SECRET}"
  fi
}

echo "==> Ensuring Cloud Scheduler sweep '$SWEEP_JOB' ($SWEEP_SCHEDULE)"
ensure_scheduler_job \
  "$SWEEP_JOB" "$SWEEP_SCHEDULE" \
  "${VERCEL_APP_URL%/}/api/internal/scans/sweep"

echo "==> Ensuring monitor scheduler '$MONITOR_JOB' ($MONITOR_SCHEDULE)"
ensure_scheduler_job \
  "$MONITOR_JOB" "$MONITOR_SCHEDULE" \
  "${VERCEL_APP_URL%/}/api/internal/monitors/run"

if [[ "${CONFIGURE_FIRESTORE:-1}" == "1" ]]; then
  if ! command -v firebase >/dev/null 2>&1; then
    echo "firebase CLI is required when CONFIGURE_FIRESTORE=1" >&2
    exit 1
  fi

  echo "==> Deploying Firestore indexes"
  firebase deploy --only firestore:indexes --project "$PROJECT"

  echo "==> Enabling Firestore TTL policies"
  gcloud firestore fields ttls update expireAt \
    --collection-group rateLimits \
    --enable-ttl \
    --project "$PROJECT" \
    --quiet
  gcloud firestore fields ttls update expireAt \
    --collection-group workerHeartbeats \
    --enable-ttl \
    --project "$PROJECT" \
    --quiet
fi

if [[ "${CONFIGURE_VERCEL:-0}" == "1" ]]; then
  if ! command -v vercel >/dev/null 2>&1; then
    echo "vercel CLI is required when CONFIGURE_VERCEL=1" >&2
    exit 1
  fi

  set_vercel_env() {
    local name="$1"
    local value="$2"
    local visibility="${3:-sensitive}"
    local args=(env add "$name" production --value "$value" --force --yes)
    if [[ "$visibility" == "plain" ]]; then
      args+=(--no-sensitive)
    else
      args+=(--sensitive)
    fi
    vercel "${args[@]}" >/dev/null
  }

  echo "==> Configuring Vercel production dispatch environment"
  set_vercel_env SCAN_DISPATCH_MODE cloud-tasks plain
  set_vercel_env GCP_PROJECT_ID "$PROJECT" plain
  set_vercel_env CLOUD_TASKS_LOCATION "$REGION" plain
  set_vercel_env CLOUD_TASKS_QUEUE "$QUEUE" plain
  set_vercel_env SCAN_WORKER_URL "$WORKER_URL" plain
  set_vercel_env CLOUD_TASKS_OIDC_SERVICE_ACCOUNT "$TASK_INVOKER_SA" plain
  set_vercel_env INTERNAL_WORKER_SECRET "$INTERNAL_WORKER_SECRET"
  set_vercel_env CRON_SECRET "$CRON_SECRET"
  set_vercel_env PAGE_JOBS_ENABLED true plain
  set_vercel_env SWEEP_MAX_FANOUT "${SWEEP_MAX_FANOUT:-3}" plain
  set_vercel_env MONITOR_SCHEDULER_BATCH_SIZE \
    "${MONITOR_SCHEDULER_BATCH_SIZE:-25}" plain
  set_vercel_env MONITOR_SCHEDULER_RETRY_MS \
    "${MONITOR_SCHEDULER_RETRY_MS:-900000}" plain

  if [[ "${DEPLOY_VERCEL:-1}" == "1" ]]; then
    echo "==> Deploying web application to Vercel production"
    vercel --prod --yes
  fi
fi

cat <<EOF

==> Done. Vercel production values:
    SCAN_DISPATCH_MODE=cloud-tasks
    GCP_PROJECT_ID=$PROJECT
    CLOUD_TASKS_LOCATION=$REGION
    CLOUD_TASKS_QUEUE=$QUEUE
    SCAN_WORKER_URL=$WORKER_URL
    CLOUD_TASKS_OIDC_SERVICE_ACCOUNT=$TASK_INVOKER_SA
    INTERNAL_WORKER_SECRET=(same as above)
    CRON_SECRET=(same as above)
    PAGE_JOBS_ENABLED=true

    Image: $IMAGE
EOF
