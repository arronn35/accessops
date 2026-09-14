#!/usr/bin/env bash
#
# One-time (idempotent) durability + secret hygiene for the Percevia GCP
# project. Separate from deploy-cloud-run.sh on purpose: this touches
# irreversible-loss protections, not the deployment.
#
# What it does:
#   1. Firestore delete protection      — blocks `databases delete`
#   2. Firestore PITR                   — 7-day point-in-time recovery window
#   3. Firestore backup schedules       — daily + weekly, retained off-instance
#   4. Secret Manager version hygiene   — reports (and with APPLY=1 destroys)
#                                         every enabled version except latest
#
# Steps 1-3 are additive and safe to re-run. Step 4 is DESTRUCTIVE and stays a
# dry run unless you pass APPLY=1: destroying a secret version that a live
# revision still references breaks that revision.
#
# Usage:
#   PROJECT=my-project ./scripts/harden-gcp.sh
#   PROJECT=my-project APPLY=1 ./scripts/harden-gcp.sh     # actually destroy old versions
#
# Verify afterwards:
#   gcloud firestore databases describe --database='(default)' --project "$PROJECT"
#   gcloud firestore backups schedules list --database='(default)' --project "$PROJECT"
set -euo pipefail

: "${PROJECT:?set PROJECT to your Firebase/GCP project id}"

DATABASE="${DATABASE:-(default)}"
# Firestore validates these ranges itself; see
# `gcloud firestore backups schedules create --help` for the accepted spans.
DAILY_RETENTION="${DAILY_RETENTION:-7d}"
WEEKLY_RETENTION="${WEEKLY_RETENTION:-4w}"
WEEKLY_DAY="${WEEKLY_DAY:-SUN}"
# Secrets whose old versions should be retired. Space-separated.
SECRETS="${SECRETS:-scan-worker-internal-secret}"

echo "==> Enabling Firestore delete protection on '$DATABASE'"
gcloud firestore databases update \
  --database "$DATABASE" \
  --delete-protection \
  --project "$PROJECT"

echo "==> Enabling point-in-time recovery on '$DATABASE'"
gcloud firestore databases update \
  --database "$DATABASE" \
  --enable-pitr \
  --project "$PROJECT"

echo "==> Ensuring a daily backup schedule (retention $DAILY_RETENTION)"
if gcloud firestore backups schedules list \
     --database "$DATABASE" --project "$PROJECT" \
     --format 'value(recurrence)' 2>/dev/null | grep -qi 'daily'; then
  echo "    daily schedule already exists — leaving it alone"
else
  gcloud firestore backups schedules create \
    --database "$DATABASE" \
    --recurrence daily \
    --retention "$DAILY_RETENTION" \
    --project "$PROJECT"
fi

echo "==> Ensuring a weekly backup schedule ($WEEKLY_DAY, retention $WEEKLY_RETENTION)"
if gcloud firestore backups schedules list \
     --database "$DATABASE" --project "$PROJECT" \
     --format 'value(recurrence)' 2>/dev/null | grep -qi 'weekly'; then
  echo "    weekly schedule already exists — leaving it alone"
else
  gcloud firestore backups schedules create \
    --database "$DATABASE" \
    --recurrence weekly \
    --day-of-week "$WEEKLY_DAY" \
    --retention "$WEEKLY_RETENTION" \
    --project "$PROJECT"
fi

echo
echo "==> Secret Manager version hygiene"
for secret in $SECRETS; do
  if ! gcloud secrets describe "$secret" --project "$PROJECT" >/dev/null 2>&1; then
    echo "    $secret: not found in $PROJECT — skipping"
    continue
  fi
  # Newest first; everything after the first line is a stale enabled version.
  # Read into a plain array rather than `mapfile` so this still runs under the
  # bash 3.2 that ships with macOS.
  enabled=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && enabled+=("$line")
  done < <(
    gcloud secrets versions list "$secret" \
      --project "$PROJECT" \
      --filter 'state=ENABLED' \
      --sort-by '~createTime' \
      --format 'value(name)'
  )
  if [[ ${#enabled[@]} -le 1 ]]; then
    echo "    $secret: ${#enabled[@]} enabled version(s) — nothing to retire"
    continue
  fi
  echo "    $secret: keeping ${enabled[0]}, retiring $(( ${#enabled[@]} - 1 )) older version(s)"
  for version in "${enabled[@]:1}"; do
    if [[ "${APPLY:-0}" == "1" ]]; then
      echo "      destroying version $version"
      gcloud secrets versions destroy "$version" \
        --secret "$secret" --project "$PROJECT" --quiet
    else
      echo "      would destroy version $version (re-run with APPLY=1)"
    fi
  done
done

echo
echo "Done. Restore drill (do this at least once, it is the only real proof):"
echo "  gcloud firestore backups list --location <LOCATION> --project $PROJECT"
echo "  gcloud firestore databases restore --source-backup <BACKUP> \\"
echo "    --destination-database restore-drill --project $PROJECT"
