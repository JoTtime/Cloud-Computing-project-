# Doctor Microservice

Spring Boot microservice for doctor listing and doctor onboarding/profile endpoints used by the frontend.

## Port

- `8088`

## Base URL

- `/api/doctors`

## Endpoints

- `GET /api/doctors?specialty=...&search=...`
- `GET /api/doctors/{id}`
- `PATCH /api/doctors/profile`
- `PATCH /api/doctors/complete-onboarding`

All endpoints require `Authorization: Bearer <token>`.
