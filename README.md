<div align="center">

<img src="https://img.shields.io/badge/VedaAI-Teacher's%20Assessment%20Creator-6366f1?style=for-the-badge&logo=sparkles&logoColor=white" alt="VedaAI" />

<br /><br />

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%202.0-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Zustand](https://img.shields.io/badge/State-Zustand-FFB300?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![WebSocket](https://img.shields.io/badge/Realtime-WebSocket-009688?style=flat-square&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Monorepo](https://img.shields.io/badge/Monorepo-npm%20Workspaces-CB3837?style=flat-square&logo=npm&logoColor=white)](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](./LICENSE)

<br />

**VedaAI** is a teacher-facing web application for building school assignments, generating structured, AI-powered question papers, and downloading them as polished, exam-ready PDFs — all with real-time job progress updates.

</div>

---

## Table of Contents

- [Product Overview](#product-overview)
- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [Tech Stack](#tech-stack)
- [Approach](#approach)
  - [AI Generation Pipeline](#ai-generation-pipeline)
  - [Data Flow](#data-flow)
  - [State Management](#state-management)
  - [Realtime Updates](#realtime-updates)
  - [PDF Export](#pdf-export)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Workspace Scripts](#workspace-scripts)
- [Question Type Catalog](#question-type-catalog)

---

## Product Overview

VedaAI enables a teacher to:

- **Build** an assignment from a structured form (title, subject, class, due date, instructions, question configuration)
- **Attach** an optional reference document (image/PDF) as a style guide for the AI
- **Generate** a normalized, section-structured question paper via Google Gemini
- **Monitor** generation in real time via a WebSocket-driven progress indicator
- **View** the output in a clean, exam-style paper layout
- **Download** the finished paper as a formatted A4 PDF

---

## Architecture Overview

VedaAI follows a **three-tier, event-driven monorepo architecture**. The frontend, API server, background worker, and shared types are co-located but independently deployable.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js)                          │
│                                                                     │
│  ┌──────────────┐   REST /api   ┌──────────────┐   ws://…/ws       │
│  │  Zustand     │ ◄───────────► │  Express API  │ ◄──────────────   │
│  │  Store       │               │  :4001        │                   │
│  └──────────────┘               └──────┬────────┘                  │
│                                        │                            │
│                               ┌────────┴────────┐                  │
│                               │    MongoDB       │                  │
│                               │  (Assignments,   │                  │
│                               │  GeneratedPapers,│                  │
│                               │  MediaAssets,    │                  │
│                               │  QuestionTypes)  │                  │
│                               └────────┬────────┘                  │
│                                        │                            │
│                          ┌─────────────┴──────────────┐            │
│                          │        Redis / BullMQ        │            │
│                          │   Queue: assignment-generation│            │
│                          └─────────────┬──────────────┘            │
│                                        │                            │
│                          ┌─────────────▼──────────────┐            │
│                          │       Background Worker      │            │
│                          │  (generate-assignment.job)   │            │
│                          │                              │            │
│                          │  1. Build structured prompt  │            │
│                          │  2. Call Gemini 2.0 Flash    │            │
│                          │  3. Parse + normalize JSON   │            │
│                          │  4. Persist GeneratedPaper   │            │
│                          │  5. Cache PDF buffer         │            │
│                          │  6. Broadcast WS event       │            │
│                          └──────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Concern | Decision | Rationale |
|---|---|---|
| **Monorepo** | npm workspaces | Keeps `@shared` types in sync across `api`, `web`, and `worker` without a build step |
| **Queue** | BullMQ over Redis | Durable, retryable background jobs; decouples HTTP request lifetime from AI call duration |
| **Realtime** | Native WebSocket (`ws`) | Lightweight; no Socket.IO overhead needed for simple broadcast events |
| **AI provider** | Gemini via adapter | Adapter pattern isolates the SDK; swapping providers requires only one file change |
| **PDF** | PDFKit on the server | Consistent A4 output regardless of browser; cached in Redis for 15 minutes post-generation |
| **State** | Zustand + `persist` | Lightweight, zero-boilerplate; the workflow step and draft survive page refresh |
| **Validation** | Zod on API env config | Fail-fast at boot if required env vars are missing or malformed |

---

## Repository Structure

```
veda-ai/
├── apps/
│   ├── api/                        # Express API + WebSocket server
│   │   └── src/
│   │       ├── adapters/
│   │       │   └── gemini.adapter.ts       # Google Gemini integration
│   │       ├── bootstrap/
│   │       │   └── seed.ts                 # DB seeding (QuestionTypes)
│   │       ├── config/
│   │       │   ├── env.ts                  # Zod-validated env schema
│   │       │   ├── mongo.ts                # Mongoose connection
│   │       │   ├── redis.ts                # ioredis client
│   │       │   └── socket.ts               # WebSocket server + broadcast
│   │       ├── controllers/
│   │       │   └── assignments.controller.ts
│   │       ├── models/                     # Mongoose schemas
│   │       │   ├── Assignment.ts
│   │       │   ├── GeneratedPaper.ts
│   │       │   ├── MediaAsset.ts
│   │       │   └── QuestionType.ts
│   │       ├── queues/
│   │       │   └── generation.queue.ts     # BullMQ queue definition
│   │       ├── routes/
│   │       │   └── assignments.ts          # REST route declarations
│   │       ├── services/
│   │       │   ├── assignment.service.ts
│   │       │   ├── cache.service.ts        # In-process TTL cache
│   │       │   ├── generation.service.ts   # Core generation orchestration
│   │       │   ├── pdf.service.ts          # PDFKit A4 paper renderer
│   │       │   └── question-type.service.ts
│   │       └── workers/
│   │           └── generation.worker.ts    # BullMQ worker bootstrap
│   │
│   ├── web/                        # Next.js 15 frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── assignment/             # Builder, workspace, confirmation, progress
│   │       │   ├── avatar/                 # DiceBear school avatar
│   │       │   ├── navigation/             # Side nav
│   │       │   ├── output/                 # Generated paper renderer
│   │       │   ├── shell/                  # Desktop + mobile layout shells
│   │       │   └── ui/                     # Confirmation modal, toast
│   │       ├── lib/
│   │       │   ├── api.ts                  # Typed fetch wrappers
│   │       │   └── websocket.ts            # WS client + event dispatcher
│   │       ├── store/
│   │       │   ├── assignment-store.ts     # Main Zustand workflow store
│   │       │   ├── notification-store.ts
│   │       │   └── ui-store.ts
│   │       └── types/
│   │           └── assignment.ts
│   │
│   └── worker/                     # Standalone BullMQ worker process
│       └── src/
│           ├── jobs/
│           │   ├── generate-assignment.job.ts
│           │   └── export-pdf.job.ts
│           └── index.ts
│
├── packages/
│   └── shared/                     # Shared types, schemas, workflow logic
│       └── src/
│           ├── schemas/
│           │   ├── assignment.ts           # Assignment + Question types
│           │   ├── generated-paper.ts      # Paper output schema
│           │   └── websocket.ts            # WS event type map
│           └── workflow/
│               └── assignment-generation.ts  # Prompt builder + normalizer
│
├── package.json                    # Root workspace config
└── tsconfig.base.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (React 19, App Router) |
| **Language** | TypeScript 5.8 across all packages |
| **Styling** | Tailwind CSS + custom CSS variables (globals.css) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Avatars** | [DiceBear](https://www.dicebear.com/) (`@dicebear/collection`) |
| **State Management** | [Zustand 5](https://zustand-demo.pmnd.rs/) with `persist` middleware |
| **API Server** | [Express 4](https://expressjs.com/) on Node.js |
| **Realtime** | Native WebSocket via [`ws`](https://github.com/websockets/ws) |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Mongoose 8](https://mongoosejs.com/) |
| **Cache / Queue** | [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis) + [BullMQ 5](https://bullmq.io/) |
| **AI Provider** | [Google Gemini 2.0 Flash](https://ai.google.dev/) (`@google/generative-ai`) |
| **PDF Generation** | [PDFKit](https://pdfkit.org/) |
| **Schema Validation** | [Zod](https://zod.dev/) (env config) |
| **Runtime** | [tsx](https://github.com/privatenumber/tsx) (dev), TypeScript compiler (build) |

---

## Approach

### AI Generation Pipeline

The generation pipeline lives in `packages/shared/src/workflow/assignment-generation.ts`, making it testable and usable by both the API and any future worker.

```
Teacher submits form
        │
        ▼
POST /api/assignments/:id/confirm
        │
        ▼
┌───────────────────────────────────────────┐
│  generation.service.ts                    │
│                                           │
│  1. Mark assignment status → "processing" │
│  2. Broadcast WS: assignment:processing   │
│                                           │
│  3. [Optional] Analyze reference doc      │
│     via Gemini Vision (gemini-2.0-flash)  │
│     → Extract: structure, question types, │
│       marking scheme, language style      │
│                                           │
│  4. buildStructuredAssignmentPrompt()     │
│     Constructs a deterministic prompt:    │
│     - Subject, class, title, due date     │
│     - Per-type question counts + marks    │
│     - Question type catalog labels        │
│     - JSON output schema hint             │
│     - Reference document analysis (if any)│
│                                           │
│  5. Call Gemini (generateContent)         │
│                                           │
│  6. extractJsonPayload() — strips any     │
│     markdown fences or prose preamble     │
│                                           │
│  7. normalizeGeneratedPaper()             │
│     - Fills missing IDs, texts, marks     │
│     - Calculates totalMarks if absent     │
│     - Infers totalTimeMinutes (≥30 min)   │
│     - Builds answerKey from sections      │
│                                           │
│  8. ensurePersistableAnswerKey()          │
│     - Cross-references answer key with    │
│       question IDs; fills any gaps        │
│                                           │
│  9. Persist GeneratedPaper to MongoDB     │
│ 10. Render PDF → cache in Redis (15 min)  │
│ 11. Broadcast WS: assignment:completed    │
└───────────────────────────────────────────┘
```

The prompt instructs Gemini to return **only strict JSON** (no markdown, no prose) matching a defined schema, which makes `extractJsonPayload()` a simple brace-extraction rather than a fragile regex parse.

---

### Data Flow

```
┌──────────┐  POST /assignments      ┌──────────┐
│          │ ─────────────────────► │          │  save draft
│          │                        │  Express  │ ──────────► MongoDB
│  Next.js │  POST /confirm         │   API     │
│  Client  │ ─────────────────────► │  :4001    │  enqueue job
│          │                        │          │ ──────────► Redis/BullMQ
│          │  WS assignment:*       │          │
│          │ ◄───────────────────── │ WebSocket │ ◄──────────── Worker
│          │                        └──────────┘   broadcasts
│          │  GET /pdf                              on each stage
│          │ ─────────────────────► PDFKit → Redis cache → binary download
└──────────┘
```

**Assignment lifecycle stages:**

| Status | Stage | Progress |
|---|---|---|
| `draft` | `builder` | 0% |
| `queued` | `confirmation` | 10% |
| `processing` | `generating` | 20% → 40% → 75% |
| `completed` | `ready` | 100% |
| `failed` | `error` | 0% |

---

### State Management

The frontend uses a single **Zustand** store (`assignment-store.ts`) that models the entire teacher workflow as a finite-state machine with these steps:

```
empty → builder → confirmation → generating → result
             ▲___________________________|
                    (return to builder)
```

The store is persisted to `localStorage` under the key `veda-ai-assignment-workflow` (step, catalog, and draft only — never sensitive data or binary assets). This means a teacher can close the tab mid-form and resume where they left off.

Key store responsibilities:
- Holding `AssignmentDraft` (form data + question type rows)
- Tracking `progress` and `progressMessage` fed by WebSocket events
- Holding the final `GeneratedPaper` once generation completes
- Managing `assignmentId` for create vs. update flows

---

### Realtime Updates

The WebSocket server is mounted on the same HTTP server as Express at path `/ws`. It maintains a `Set<WsClient>` and broadcasts typed JSON envelopes to all connected clients:

```typescript
// WebSocket event envelope shape (packages/shared)
interface WebSocketServerEnvelope<T extends WebSocketEventName> {
  type: T;           // 'assignment:queued' | 'assignment:processing' | ...
  data: WebSocketEventPayloadMap[T];
}
```

The frontend WebSocket client (`apps/web/src/lib/websocket.ts`) listens for these events and dispatches progress updates directly into the Zustand store — no polling required.

---

### PDF Export

`pdf.service.ts` uses **PDFKit** to produce an A4 document server-side with:

- School name header (centered, bold)
- Subject, class, time allowed, maximum marks metadata row
- Name / Roll Number fields for the student
- Sections labeled **Section A, Section B, …** with per-section instructions
- Questions numbered per section with marks annotation
- Answer key appended at the end

The PDF buffer is cached in Redis for **15 minutes** after generation. Subsequent download requests (`GET /assignments/:id/pdf`) serve the cached buffer; if it has expired it is regenerated on demand via `createPaperPdfBuffer()`.

---

## API Reference

Base URL: `http://localhost:4001/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/assignments/question-types` | List available question type options |
| `GET` | `/assignments` | List all assignments (sorted newest first) |
| `POST` | `/assignments` | Create a new assignment draft |
| `PUT` | `/assignments/:id` | Update an existing draft |
| `DELETE` | `/assignments/:id` | Delete assignment + generated paper + media |
| `POST` | `/assignments/:id/confirm` | Trigger AI generation (queues job + blocks until done) |
| `POST` | `/assignments/:id/regenerate` | Re-run generation for an existing assignment |
| `GET` | `/assignments/:id` | Get assignment by ID |
| `GET` | `/assignments/:id/paper` | Get the generated paper JSON |
| `GET` | `/assignments/:id/pdf` | Download the generated paper as A4 PDF |

**WebSocket** endpoint: `ws://localhost:4001/ws`

Emitted events: `assignment:queued`, `assignment:processing`, `assignment:completed`, `assignment:failed`

---

## Data Models

### Assignment

```typescript
{
  title: string
  subject: string
  className: string
  dueDate: string
  instructions: string
  sourceFileName?: string
  sourceAssetId?: ObjectId        // ref → MediaAsset
  questionTypes: QuestionConfig[]
  status: 'draft' | 'queued' | 'processing' | 'completed' | 'failed'
  stage: 'builder' | 'confirmation' | 'generating' | 'ready' | 'error'
  progress: number                // 0–100
  progressMessage: string
  generationRequestedAt?: Date
  generatedPaperId?: ObjectId     // ref → GeneratedPaper
  questionTypeSnapshot: QuestionTypeOption[]  // catalog snapshot at generation time
  lastError?: string
}
```

### GeneratedPaper

```typescript
{
  assignmentId: ObjectId
  title: string
  subject: string
  className: string
  totalMarks: number
  totalTimeMinutes: number
  sections: Array<{
    title: string
    instruction: string
    questions: Array<{
      id: string
      text: string
      marks: number
      difficulty: 'easy' | 'moderate' | 'hard'
      answer?: string
    }>
  }>
  answerKey: GeneratedQuestion[]
  notes?: string[]
}
```

### MediaAsset

Stores uploaded reference documents as binary buffers in MongoDB (base64-decoded at ingest time). Used by the Gemini Vision analysis step.

---

## Environment Variables

Create a `.env` file at the repository root:

```env
# Server
NODE_ENV=development
API_PORT=4001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/veda-ai

# Redis (optional — queue falls back to in-process if unset)
REDIS_URL=redis://localhost:6379

# Google Gemini (required for AI generation)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Storage mode
ASSIGNMENT_STORAGE=database      # or 'memory' for ephemeral dev

# Upload limit
UPLOAD_MAX_MB=10

# CORS
CORS_ORIGIN=*
```

> The env schema is validated with Zod at startup (`apps/api/src/config/env.ts`). The server will exit immediately if required variables are missing or malformed.

---

## Getting Started

**Prerequisites:** Node.js ≥ 18, MongoDB, Redis (optional)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/veda-ai.git
cd veda-ai

# 2. Install all workspace dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# → Set GEMINI_API_KEY at minimum

# 4. Start the Next.js frontend
npm run dev:web
# → http://localhost:3000

# 5. (Separate terminal) Start the API server
npm run dev --workspace @veda-ai/api
# → http://localhost:4001

# 6. (Optional) Start the background worker
npm run dev --workspace @veda-ai/worker
```

---

## Workspace Scripts

Run from the repository root:

| Script | Description |
|---|---|
| `npm run dev` | Start all packages in parallel |
| `npm run dev:web` | Start only the Next.js frontend |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | Type-check all packages |

---

## Question Type Catalog

The database is seeded on first boot with four default question types:

| Type | Label | Default Marks | Default Difficulty | Max Questions |
|---|---|---|---|---|
| `multiple-choice-questions` | Multiple Choice Questions | 1 | Easy | 20 |
| `short-questions` | Short Questions | 2 | Moderate | 15 |
| `diagram-graph-based-questions` | Diagram/Graph-Based Questions | 5 | Moderate | 10 |
| `numerical-problems` | Numerical Problems | 5 | Hard | 10 |

These are stored in the `QuestionType` collection and served via `GET /api/assignments/question-types`. Teachers can configure count, marks per question, and difficulty per type when building an assignment.

---

<div align="center">

Built with ❤️ for educators · Powered by [Google Gemini](https://ai.google.dev/) · Generated PDFs inspired by DPS Bokaro exam formats

</div>