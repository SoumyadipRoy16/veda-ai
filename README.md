# AI Assessment Creator

AI Assessment Creator is a teacher-facing web app for building assignments, generating structured question papers with AI, and reviewing the output in a clean exam-style layout inspired by the supplied Figma designs.

## Product Goal

The system lets a teacher:

- Create an assignment from a structured form
- Optionally attach source material
- Generate a normalized question paper through AI
- Receive real-time job updates while the paper is being built
- View and download the generated output in a polished, readable format

## Chosen Stack

- Frontend: Next.js + TypeScript
- State: Zustand
- Backend: Node.js + Express + TypeScript
- Database: MongoDB
- Cache and job state: Redis
- Queue: BullMQ
- Realtime updates: WebSocket
- AI provider: Gemini through a backend adapter

## Repository Shape

This repository starts as a monorepo so the frontend, API, worker, and shared types stay aligned.

- `apps/web` for the Next.js interface
- `apps/api` for the Express API and WebSocket server
- `apps/worker` for background generation and export jobs
- `packages/shared` for shared schemas and types

## Implementation Order

1. Scaffold the monorepo and workspace config.
2. Build the assignment creation flow from the Figma layouts.
3. Add the API contract and persistent assignment models.
4. Add BullMQ workers for generation and PDF export.
5. Add realtime status updates over WebSocket.
6. Normalize AI output into structured sections and questions.
7. Render the final paper in a clean desktop and mobile layout.

## Data Flow

1. Teacher submits assignment details from the frontend.
2. The API validates the payload and stores the assignment.
3. A generation job is queued in BullMQ.
4. The worker builds a structured prompt and calls Gemini.
5. The worker parses the response into sections, questions, marks, and difficulty tags.
6. The result is stored in MongoDB and cached in Redis.
7. The frontend is notified in real time and renders the generated paper.

## Design Notes

The supplied desktop and mobile screens are the visual reference for this build. The interface should preserve the same hierarchy, spacing, and exam-paper feel while remaining responsive and accessible.

## Current Status

The implementation begins with the repo scaffold and placeholder files. Feature code will be added in the next steps.

## Run Locally

Use Git Bash from the repository root:

```bash
npm install
npm run dev:web
```

Then open the URL printed by Next.js, usually `http://localhost:3000`, to see the starter assignment dashboard.
