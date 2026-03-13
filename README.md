# Internal Database Tracking System (Spring Boot + Python Parser + Postgres + MinIO)

This repo contains:
- `apps/web` : Next.js frontend (internal dashboard UI)
- `services/spring-api` : Spring Boot backend (System of Record)
- `services/python-parser` : FastAPI resume parser service (suggested extraction)
- `infra/docker-compose.yml` : local dev stack with Postgres + MinIO + both services

## Prereqs
- Docker + Docker Compose
- Java 17+
- (Optional) Gradle installed (wrapper included)

## Quickstart (local)
```bash
cd infra
docker compose up --build
```

Services:
- Web UI: http://localhost:3000
- Spring API: http://localhost:8080
- Python Parser: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (user: minioadmin / pass: minioadmin)
- Postgres: localhost:5432 (db: talentdb, user: talentdb, pass: talentdb)

## Auth (MVP)
Spring API uses a simple email/password login seeded at startup:
- admin: admin@local.test / admin123
- viewer: viewer@local.test / viewer123

Login:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local.test","password":"admin123"}'
```
Use returned `accessToken` as:
`Authorization: Bearer <token>`

## Notes
- Resume uploads are stored in MinIO (S3-compatible). In production, point the same config to AWS S3.
- Parsing is **always** followed by **mandatory admin review**. The parser output is saved as `parsedSnapshot`,
  and publishing happens only after `/confirm`.
