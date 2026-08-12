# Contributing to CreatorFlow

This document covers everything you need to know before writing a single line of code — branching strategy, commit conventions, PR process, and code standards. Read this first.

---

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Local Setup](#local-setup)

---

## Branching Strategy

We follow a simplified **Gitflow** model with three types of branches.

### Branch Overview

```
main
 │
 └── develop
       │
       ├── feature/CF-12-keycloak-setup
       ├── feature/CF-24-s3-presigned-urls
       └── feature/CF-37-kafka-post-dispatcher
```

### Branch Definitions

| Branch | Purpose | Who pushes here | Merges into |
|---|---|---|---|
| `main` | Production-ready code only. What is deployed to AWS ECS. | Nobody directly — PRs only | — |
| `develop` | Integration branch. All features land here first. | Nobody directly — PRs only | `main` |
| `feature/*` | One branch per JIRA ticket. Short-lived. | Developer working on that ticket | `develop` |
| `hotfix/*` | Urgent production fixes only. | Senior dev only | `main` + `develop` |

### Branch Naming Rules

Always name branches after the JIRA ticket. No exceptions.

```
# Format
feature/CF-{ticket-number}-{short-description-kebab-case}

# Examples — good
feature/CF-12-keycloak-realm-setup
feature/CF-24-s3-presigned-upload-url
feature/CF-37-kafka-post-dispatcher
feature/CF-51-claude-caption-endpoint

# Examples — bad
feature/keycloak             ← no ticket number
feature/CF12                 ← missing hyphen
my-changes                   ← no context at all
fix/random-bug               ← not linked to JIRA
```

### Creating a Feature Branch

Always branch from `develop`, never from `main`.

```bash
# Make sure develop is up to date first
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/CF-12-keycloak-realm-setup

# Push and set upstream
git push -u origin feature/CF-12-keycloak-realm-setup
```

### Keeping Your Branch Up to Date

If `develop` moves ahead while you are working, rebase your branch — do not merge develop into your feature branch.

```bash
git fetch origin
git rebase origin/develop
```

If you hit conflicts, resolve them, then `git rebase --continue`.

### Deleting Branches After Merge

Feature branches are deleted automatically after merge (configured in GitHub settings). Do not keep stale branches around.

---

## Commit Message Convention

We follow a simplified **Conventional Commits** format, prefixed with the JIRA ticket number. Every commit must reference a ticket.

### Format

```
CF-{number} {type}: {short description}

{optional body — explain WHY, not what}

{optional footer — breaking changes or references}
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature or endpoint |
| `fix` | A bug fix |
| `chore` | Build setup, config, dependencies, tooling |
| `docs` | Documentation only — README, ADR, Confluence links |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `ci` | Changes to GitHub Actions workflows |
| `perf` | Performance improvement |
| `style` | Formatting, missing semicolons — no logic change |

### Examples

```bash
# Feature
CF-12 feat: add Keycloak realm and CREATOR role config

# Bug fix
CF-18 fix: JWT decoder missing issuer URI in resource server config

# Chore — setup work
CF-1 chore: init monorepo folder structure and base docker-compose

# Config / environment
CF-5 chore: add Keycloak 24 to docker-compose with admin credentials

# Refactor
CF-44 refactor: extract PlatformAdapter interface for YouTube, Instagram, Twitter

# Tests
CF-29 test: add Testcontainers integration tests for media-service upload flow

# Docs
CF-7 docs: add ADR-001 auth strategy — Keycloak vs Auth0 decision

# CI
CF-61 ci: add GitHub Actions workflow for backend build and test

# With a body (use when the why is not obvious)
CF-33 fix: handle expired platform OAuth tokens before API call

Previously the scheduler would attempt to publish with an expired
access token and silently fail. Now we check token expiry 5 minutes
before the scheduled publish time and refresh proactively.

Closes CF-33
```

### Rules

- Subject line is **50 characters max** — keep it tight
- Use **imperative mood** — "add feature" not "added feature" or "adds feature"
- Do **not** end the subject line with a period
- Separate body from subject with a blank line
- Body lines wrap at **72 characters**
- Every commit must have a `CF-` prefix — no orphan commits

### What Makes a Bad Commit Message

```bash
# Bad — no ticket
feat: add some stuff

# Bad — vague
CF-12 fix: bug fix

# Bad — past tense
CF-15 added the Keycloak configuration

# Bad — too long subject
CF-18 feat: added the new JWT decoder configuration for the Keycloak resource server integration in auth-service

# Bad — no type
CF-22 Kafka consumer for content.scheduled topic
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Your branch is rebased on the latest `develop`
- [ ] All existing tests pass locally — `./mvnw test` or `pnpm test`
- [ ] You have added tests for new functionality
- [ ] No `.env` files, secrets, or API keys in the diff
- [ ] Code compiles and the service starts cleanly

### PR Title Format

Match the commit format:

```
CF-{number} {type}: {description}

# Examples
CF-12 feat: Keycloak realm setup and JWT role mapping
CF-24 fix: S3 presigned URL expiry set to 1 hour
```

### PR Description Template

When you open a PR, fill in this template:

```markdown
## What does this PR do?
<!-- One paragraph. What problem does it solve? -->

## JIRA Ticket
<!-- Link: https://<your-jira-workspace>.atlassian.net/browse/CF-XX -->

## Type of change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Config / chore
- [ ] Documentation

## How to test
<!-- Step-by-step: what should the reviewer run or check? -->
1.
2.
3.

## Screenshots (if frontend change)
<!-- Add before/after screenshots for any UI change -->

## Checklist
- [ ] Tests added / updated
- [ ] No secrets in code
- [ ] Confluence / docs updated if needed
- [ ] JIRA ticket status updated
```

### Review Process

- Every PR into `develop` requires **1 approval**
- Every PR into `main` requires **1 approval + all CI checks green**
- The author merges after approval — not the reviewer
- Resolve all review comments before merging — do not dismiss reviews

### Merge Strategy

The merge type depends on the target branch. This is not a style preference — using the wrong one on `main` causes recurring conflicts.

| PR | Merge type | Why |
|---|---|---|
| `feature/*` → `develop` | **Squash merge** | One ticket, one commit. Keeps `develop` history readable and matches one-branch-per-JIRA-ticket. |
| `hotfix/*` → `main` | **Squash merge** | Same reasoning — a hotfix is a single logical change. |
| `hotfix/*` → `develop` | **Merge commit** | Preserves the link to the commit already on `main`, so the fix is not applied twice. |
| **`develop` → `main`** | **Merge commit** | See below. Never squash a release. |

#### Why `develop` → `main` must not be squashed

Squashing collapses every commit on `develop` into one new commit on `main` that has no ancestry link back to those originals. `main` and `develop` then never share real history.

The consequence shows up on the *next* release: Git still calculates the merge base from the last true common ancestor, so the PR re-lists commits that are already in production and can raise conflicts on code nobody touched. Each release compounds the problem.

A merge commit keeps `main` a true ancestor-linked superset of released work. `git log main` still shows the individual feature commits, and `git merge-base main develop` stays meaningful — which also means release diffs and rollbacks are accurate.

Concretely, when releasing:

```bash
# Open the PR: base = main, compare = develop
# Merge using "Create a merge commit" — NOT "Squash and merge"
```

If GitHub's merge button defaults to squash, change it in the dropdown before merging. Repository settings can also allow both types so the correct one can be chosen per PR.

### Draft PRs

Open a draft PR early if you want feedback on direction before the work is complete. Prefix the title with `[DRAFT]`.

```
[DRAFT] CF-37 feat: Kafka post dispatcher consumer
```

---

## Code Standards

### Java / Spring Boot

- Follow standard Java naming conventions — `camelCase` for methods and variables, `PascalCase` for classes
- All Spring Boot services must expose `/actuator/health` — never disable Actuator
- Every REST endpoint must be covered by at least one integration test using Testcontainers
- Use `@PreAuthorize` for role-based access — never implement manual role checks in service layer
- No hardcoded URLs, credentials, or config values — use `application.yml` and `@ConfigurationProperties`
- Every service must have a `application.yml` and a `application-local.yml.example`

### TypeScript / Next.js

- Use TypeScript strictly — no `any` types
- All API calls go through a typed service layer — no raw `fetch` calls scattered in components
- Use server components by default — only add `'use client'` when genuinely needed
- Environment variables accessed via a typed `env.ts` wrapper — not `process.env` directly in components

### Python / FastAPI

- Use Pydantic models for all request and response bodies — no untyped dicts
- All endpoints must have type hints — no bare `def route()`
- Use `async def` for all route handlers — FastAPI is async first
- Never import `os.environ` directly in route handlers — use a settings class with `pydantic-settings`

### General

- No commented-out code in PRs — delete it or open a follow-up ticket
- No `TODO` comments without a JIRA ticket reference — `# TODO CF-45: implement retry logic`
- All new Confluence ADRs must be linked in the PR description

---

## Local Setup

See [`README.md`](README.md) for the full local development setup. For any environment variables you need, ask in the team channel — never share them over email or Slack messages.
