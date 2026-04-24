# Deploy Med-Connect to Render

This repo now includes:

- `render.yaml` (Render Blueprint with all services)
- `.github/workflows/ci.yml` (CI pipeline for frontend + all microservices)

## 1) Push project to GitHub

1. Create a GitHub repo.
2. Push this codebase.
3. Make sure default branch is `main`.

## 2) Create Render services from Blueprint

1. Go to Render Dashboard.
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repo.
4. Select this repo and deploy.

Render will create:

- `medconnect-db` (PostgreSQL)
- `usermicroservice`
- `doctormicroservice`
- `patientmicroservice`
- `appointmentmicroservice`
- `billingmicroservice`
- `medconnect-frontend` (static site)

## 3) Set required environment variables

After first sync, set these values in Render:

### Shared for all Java microservices

- `JWT_SECRET` -> same value in **all 5** microservices.
- `APP_CORS_ALLOWED_ORIGINS` -> your frontend domain, for example:
  - `https://medconnect-frontend.onrender.com`

### Frontend (`medconnect-frontend`)

Set these with your deployed backend URLs:

- `USER_API_URL` -> `https://<usermicroservice>.onrender.com/api`
- `APPOINTMENT_API_URL` -> `https://<appointmentmicroservice>.onrender.com/api`
- `DOCTOR_API_URL` -> `https://<doctormicroservice>.onrender.com/api`
- `PATIENT_API_URL` -> `https://<patientmicroservice>.onrender.com/api`
- `BILLING_API_URL` -> `https://<billingmicroservice>.onrender.com/api`

## 4) Redeploy frontend and backends

After setting env vars:

1. Trigger **Manual Deploy** for all 5 microservices.
2. Trigger **Manual Deploy** for frontend.

## 5) Verify app

1. Open frontend URL.
2. Create/login users.
3. Check:
   - doctor onboarding
   - find doctors names
   - notifications + real-time updates
   - patient connected doctor count

## Notes

- Eureka is disabled in Render via env vars in `render.yaml`.
- DB auto-create is disabled in Render (`MEDCONNECT_DATABASE_CREATE_IF_NOT_EXISTS=false`) to avoid permission issues.
- CI (`.github/workflows/ci.yml`) runs on push/PR to `main`.
