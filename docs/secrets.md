# Secrets

Percevia keeps production secrets in managed host secret stores and local developer secrets in an encrypted SOPS file.

## Local Admin Key

Install the local tools once:

```bash
brew install sops age
```

The admin age private key is stored outside the repository:

```bash
~/.config/sops/age/percevia-keys.txt
```

Keep this file readable only by the admin user:

```bash
chmod 600 ~/.config/sops/age/percevia-keys.txt
```

The matching public recipient is configured in `.sops.yaml`. Public recipients are safe to commit; private keys are not.

## Daily Workflow

Decrypt local secrets before running the app:

```bash
npm run secrets:decrypt
```

This writes `.env.local` with `600` permissions. `.env.local` stays ignored by git.

After changing `.env.local`, refresh the encrypted file:

```bash
npm run secrets:encrypt
```

Check that the encrypted file is readable without writing plaintext:

```bash
npm run secrets:check
```

Commit `secrets/percevia.env.enc` when the encrypted payload changes. Do not commit plaintext files under `secrets/` or any `.env*` file.

## Production

Production secrets stay in the platform secret stores:

- Vercel production environment variables for the web app.
- Cloud Run runtime identity + Secret Manager for the worker shared secret.
- The Cloud Run worker uses Application Default Credentials and does not store a
  Firebase private key.

The encrypted repo file is for local/admin-controlled recovery and development. It does not replace Vercel or Cloud Run runtime secrets.

## Rotation

To rotate local encryption access:

1. Generate a new age key outside the repo.
2. Replace the recipient in `.sops.yaml`.
3. Run `npm run secrets:encrypt`.
4. Remove access to the old private key.

Rotate provider API keys separately in the provider dashboard and then update Vercel/Cloud Run plus the encrypted local file.
