# Promise Ecosystem Monorepo

<p align="center">
	<img src="apps/PromiseLandingPage/docs/LOGO-OSCURO.png" alt="Promise Logo" width="360" />
</p>

<p align="center">
	AI + Voice + Chat + Dashboard platform for candidate outreach, scheduling, and operational visibility.
</p>

---

## What Is In This Repository

This repository centralizes the full Promise ecosystem in one place:

- User-facing web experiences
- Operational dashboard
- Voice and chatbot backend services
- Queueing, scheduling, and post-call automation services

It is organized as a multi-app workspace under `apps/`.

---

## Monorepo Structure

```text
apps/
	dashboardRiwicall/     # Dashboard SPA (operations, calls, events, metrics)
	PromiseLandingPage/    # Corporate multi-page site
	SofIA/                 # SofiaConnect backend (calls + WhatsApp orchestration)
	SofIA-Integral/        # Dispatcher + queue + post-call automation backend
	SofiaChat/             # Python/FastAPI AI chat microservice for WhatsApp
	SofiaModular/          # Modular backend variant for chatbot operations
```

---

## Product Snapshot

### 1) PromiseLandingPage
- Type: Frontend website (Vite + Vanilla JS)
- Purpose: Brand communication, product narrative, pricing, company pages
- Path: `apps/PromiseLandingPage`

### 2) DashboardRiwiCall
- Type: Frontend dashboard SPA (Vite + Vanilla JS)
- Purpose: Operational visibility, candidate follow-up, events/calls tracking
- Path: `apps/dashboardRiwicall`

### 3) SofiaConnect (SofIA)
- Type: Node.js backend service
- Purpose: Outbound call orchestration + WhatsApp chatbot triggering + webhook updates
- Path: `apps/SofIA`

### 4) SofIA-Integral
- Type: Node.js backend service
- Purpose: Queue filling, call dispatcher, post-call transactional workflow
- Path: `apps/SofIA-Integral`

### 5) SofiaChat
- Type: Python/FastAPI microservice
- Purpose: AI-driven WhatsApp conversation handling and intent resolution
- Path: `apps/SofiaChat`

### 6) SofiaModular
- Type: Node.js backend variant
- Purpose: Alternative modular structure for chatbot-driven operations and scripts
- Path: `apps/SofiaModular`

---

## Screenshot Gallery (Reserved Spaces)

The following sections are intentionally reserved for official product captures.

### PromiseLandingPage

`Screenshot slot reserved`

Suggested file path:
`Docs/screenshots/promise-landingpage.png`

### SofiaConnect (SofIA)

`Screenshot slot reserved`

Suggested file path:
`Docs/screenshots/sofiaconnect-sofia.png`

### DashboardRiwiCall

`Screenshot slot reserved`

Suggested file path:
`Docs/screenshots/dashboard-riwicall.png`

---

## Brand Assets

You can use official Promise brand assets from:

- `apps/PromiseLandingPage/docs/LOGO-CLARO.png`
- `apps/PromiseLandingPage/docs/LOGO-OSCURO.png`
- `apps/PromiseLandingPage/docs/ISOLOGO-CLARO.png`
- `apps/PromiseLandingPage/docs/ISOLOGO-OSCURO.png`
- `apps/PromiseLandingPage/public/assets/brand/`

---

## Quick Start By App

### PromiseLandingPage

```bash
cd apps/PromiseLandingPage
npm install
npm run dev
```

### DashboardRiwiCall

```bash
cd apps/dashboardRiwicall
npm install
npm run dev
```

### SofiaConnect (SofIA)

```bash
cd apps/SofIA
npm install
npm run dev
```

### SofIA-Integral

```bash
cd apps/SofIA-Integral
npm install
npm run dev
```

### SofiaModular

```bash
cd apps/SofiaModular
npm install
npm run dev
```

### SofiaChat (Python)

```bash
cd apps/SofiaChat
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Integration Flow (High-Level)

1. Candidate outreach starts via outbound voice and scheduling services.
2. If calls fail or fallback is needed, WhatsApp chatbot flow is triggered.
3. AI service resolves user intent and scheduling outcomes.
4. Webhooks return final status to core services.
5. Dashboard surfaces operational data and progress.

---

## Notes

- This repository contains multiple independently deployable applications.
- Most frontend apps are Vite-based.
- Backend services depend on environment variables (`.env`) and external providers (DB, webhook endpoints, voice APIs).

---

## Maintainers

Promise team workspace.

