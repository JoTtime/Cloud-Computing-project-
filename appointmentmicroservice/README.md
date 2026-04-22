# Appointment Microservice

Spring Boot microservice that powers the Angular appointment flow.

## API Base

`/api/appointments`

## Implemented Endpoints

- `GET /doctor/{doctorId}/availability?date=YYYY-MM-DD`
- `POST /book`
- `GET /patient?status=...`
- `GET /doctor?status=...&date=YYYY-MM-DD`
- `PATCH /{appointmentId}/respond`
- `PATCH /{appointmentId}/cancel`

All endpoints require `Authorization: Bearer <jwt>`.

## Run

From this folder:

```bash
mvn spring-boot:run
```

## Notes

- Uses PostgreSQL database `medconnect_appointments` by default.
- Automatically creates database if it does not exist and your DB user has permission.
- Uses the same JWT secret format as your `usermicroservice` (`JWT_SECRET` env var).
