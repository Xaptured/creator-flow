# CreatorFlow

![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen?logo=springboot)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)

[![CI](https://github.com/Xaptured/creator-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/Xaptured/creator-flow/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/Xaptured/creator-flow/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/Xaptured/creator-flow/actions/workflows/dependabot/dependabot-updates)

> AI-powered content studio for creators — schedule, publish, and analyze content across YouTube, Instagram, and Twitter/X from a single workspace.

---

## What Is CreatorFlow?

CreatorFlow is a full-stack platform built for content creators who manage multiple social media platforms. Instead of switching between 5 different dashboards, logging into each platform manually, and guessing when to post — CreatorFlow brings everything into one intelligent workspace.

**Core problems it solves:**

- Scheduling and publishing content to YouTube, Instagram, and Twitter/X from one place
- Storing and organizing media files (videos, images, thumbnails) in a secure vault
- AI-generated captions, hashtag suggestions, and post performance insights
- Detecting content gaps — topics you haven't covered that are trending in your niche
- Scoring thumbnails automatically using vision AI before you publish

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Spring Boot 3.3 + Java 21 | Microservices — auth, media, scheduler, analytics |
| Frontend | Next.js 14 (App Router) | Creator dashboard, post composer, calendar UI |
| AI Service | Python 3.11 + FastAPI | LLM integration, RAG pipeline, vision AI |
| Auth | Keycloak 24 | Identity provider — OAuth 2.0 + OIDC |
| Database | PostgreSQL 16 + pgvector | Primary DB + vector embeddings for RAG |
| Cache | Redis 7 | Session cache, rate limiting, token storage |
| Event Streaming | Apache Kafka | Async post dispatch, analytics ingestion |
| File Storage | AWS S3 | Media vault with presigned URL upload/serve |
| Infrastructure | AWS ECS Fargate + Terraform | Serverless containers, infra as code |
| CI/CD | GitHub Actions | Build → test → push to ECR → deploy to ECS |
| Observability | OpenTelemetry + Grafana + Loki | Distributed tracing, logs, dashboards |

---

## Repository Structure

```
creatorflow/
├── backend/
│   ├── auth-service/          # Keycloak JWT validation, user management
│   ├── media-service/         # S3 upload/serve, file metadata
│   ├── scheduler-service/     # Content scheduling, Quartz jobs, Kafka producer
│   └── analytics-service/     # Platform metrics ingestion, Kafka consumer
├── frontend/                  # Next.js 14 App Router — creator dashboard
├── ai-service/                # FastAPI — Claude API, RAG, embeddings, vision
├── infra/                     # Terraform modules — VPC, ECS, RDS, ALB, S3
├── docs/                      # Architecture diagrams, ADRs, API contracts
├── docker-compose.yml         # Local dev — Postgres, Redis, Kafka, Keycloak
└── .github/
    └── workflows/             # GitHub Actions CI/CD pipelines
```

---

## Architecture Overview

```
Browser (Next.js 14)
        │
        ▼
  [Auth.js v5] ──────────────────► [Keycloak 24]
        │                               │
        ▼                               │ JWT
  Spring Boot Services ◄───────────────┘
  ┌─────────────────────────────────────────────┐
  │  auth-service  │  media-service             │
  │  scheduler-service  │  analytics-service    │
  └─────────────────────────────────────────────┘
        │                     │
        ▼                     ▼
  [PostgreSQL 16]        [Apache Kafka]
  [Redis 7]                   │
  [AWS S3]                    ▼
                        [FastAPI AI Service]
                        ├── Claude API (insights, captions)
                        ├── pgvector (embeddings, RAG)
                        └── Vision AI (thumbnail scoring)
```

Full architecture diagrams are in [`docs/architecture-overview.md`](docs/architecture-overview.md).

---

## Local Development

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | Latest | [docker.com](https://docker.com) |
| Java | 21 (LTS) | [sdkman.io](https://sdkman.io) |
| Node.js | 20 (LTS) | [nodejs.org](https://nodejs.org) |
| Python | 3.11 | [pyenv](https://github.com/pyenv/pyenv) |
| AWS CLI | v2 | [aws.amazon.com/cli](https://aws.amazon.com/cli) |

### Start the local stack

```bash
# Clone the repo
git clone https://github.com/<your-github-username>/creatorflow.git
cd creatorflow

# Start all local infrastructure (Postgres, Redis, Kafka, Keycloak)
docker-compose up -d

# Verify everything is running
docker-compose ps
```

### Start individual services

```bash
# Backend — auth-service
cd backend/auth-service
./mvnw spring-boot:run

# Frontend
cd frontend
pnpm install
pnpm dev

# AI service
cd ai-service
python -m uvicorn main:app --reload
```

### Environment setup

Each service has a `.env.example` file. Copy it and fill in values:

```bash
cp frontend/.env.example frontend/.env.local
cp ai-service/.env.example ai-service/.env
```

> **Never commit `.env` files.** See `.gitignore` for the full exclusion list.

---

## Documentation

| Doc | Description |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branching strategy, commit convention, PR process |
| [`docs/architecture-overview.md`](docs/architecture-overview.md) | System design, service map, data flow |
| [`docs/local-dev-setup.md`](docs/local-dev-setup.md) | Full local setup walkthrough |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records |
| [`docs/api-contracts.md`](docs/api-contracts.md) | API specs per service |

---

## License

MIT — see [LICENSE](LICENSE) for details.
