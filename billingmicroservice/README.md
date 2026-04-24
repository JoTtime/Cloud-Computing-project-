# Billing Microservice

Spring Boot microservice for invoice generation and billing records.

## Port

- `8090`

## Base URL

- `/api/billing`

## Endpoints

- `POST /api/billing/invoices/generate`
- `GET /api/billing/invoices/my`

All money values are stored in `FCFA`.
All endpoints require `Authorization: Bearer <token>`.
