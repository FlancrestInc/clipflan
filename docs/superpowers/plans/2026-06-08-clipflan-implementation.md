# Clipflan Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only persisted shared clipboard web app for text and images with a selectable 100-item history.

**Architecture:** A small Express server owns persistence and serves a single-page frontend. SQLite stores item records and text content, while uploaded image bytes are stored under `data/uploads/`. The frontend polls the API, renders a split-pane clipboard/history UI, and uses the browser clipboard API for copy operations.

**Tech Stack:** Node.js, Express, SQLite via `better-sqlite3`, Multer for image uploads, Vitest/Supertest for API tests, vanilla HTML/CSS/JS frontend.

---

## File Structure

- `package.json`: scripts and runtime/test dependencies.
- `src/config.js`: environment-driven paths and upload limits.
- `src/db.js`: SQLite connection, schema setup, and test database helpers.
- `src/store.js`: item CRUD, retention enforcement, and file cleanup.
- `src/app.js`: Express app, API routes, validation, and static serving.
- `src/server.js`: production server entrypoint.
- `public/index.html`: app shell.
- `public/styles.css`: responsive split-pane UI.
- `public/app.js`: paste handling, history rendering, preview, copy, and delete.
- `tests/store.test.js`: persistence and retention tests.
- `tests/api.test.js`: API behavior tests.
- `README.md`: local run and Cloudflare Tunnel deployment notes.

## Chunk 1: Project Scaffold

### Task 1: Node Project Setup

**Files:**
- Create: `package.json`
- Create: `src/config.js`
- Create: `src/server.js`

- [ ] **Step 1: Create package metadata and scripts**

```json
{
  "name": "clipflan",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.9.1",
    "express": "^4.21.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Add config defaults**

Create `src/config.js` with defaults for `PORT`, `DATA_DIR`, `DB_PATH`, `UPLOAD_DIR`, max image size of 10 MB, and allowed image MIME types.

- [ ] **Step 3: Add server entrypoint**

Create `src/server.js` that imports `createApp`, starts the app on `PORT`, and logs the listening URL.

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `package-lock.json` is generated and dependencies install.

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json package-lock.json src/config.js src/server.js
git commit -m "chore: scaffold Node app"
```

## Chunk 2: Persistence and API

### Task 2: Store Tests First

**Files:**
- Create: `tests/store.test.js`
- Create: `src/db.js`
- Create: `src/store.js`

- [ ] **Step 1: Write failing store tests**

Cover creating text items, creating image items, newest-first listing, 100-item retention, and deleting an image item removes its file.

- [ ] **Step 2: Run store tests to verify failure**

Run: `npm test -- tests/store.test.js`
Expected: FAIL because `src/db.js` and `src/store.js` do not exist yet.

- [ ] **Step 3: Implement database and store**

Implement schema setup, CRUD, retention cleanup, and file deletion. Retention must remove oldest records beyond 100 and unlink image files when present.

- [ ] **Step 4: Run store tests to verify pass**

Run: `npm test -- tests/store.test.js`
Expected: PASS.

### Task 3: API Tests First

**Files:**
- Create: `tests/api.test.js`
- Create: `src/app.js`

- [ ] **Step 1: Write failing API tests**

Cover `GET /api/items`, `POST /api/items/text`, `POST /api/items/image`, `GET /api/items/:id/file`, `DELETE /api/items/:id`, invalid text, and invalid image MIME type.

- [ ] **Step 2: Run API tests to verify failure**

Run: `npm test -- tests/api.test.js`
Expected: FAIL because `src/app.js` does not exist yet.

- [ ] **Step 3: Implement Express app**

Create JSON, multipart upload, validation, error responses, static serving, and API routes that call the store.

- [ ] **Step 4: Run API tests to verify pass**

Run: `npm test -- tests/api.test.js`
Expected: PASS.

- [ ] **Step 5: Commit persistence and API**

```bash
git add src tests
git commit -m "feat: add clipboard persistence API"
```

## Chunk 3: Frontend

### Task 4: Build Split Clipboard UI

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

- [ ] **Step 1: Add app shell**

Create a two-pane layout with history, paste text area, image picker/drop target, preview, copy, delete, and status regions.

- [ ] **Step 2: Add frontend behavior**

Implement API calls, paste event handling for images/text, history polling, selected-item rendering, copy via `navigator.clipboard`, and delete.

- [ ] **Step 3: Add responsive styling**

Make desktop use a left history pane and right work area. Make narrow screens stack without overlapping text or controls.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit frontend**

```bash
git add public
git commit -m "feat: add shared clipboard UI"
```

## Chunk 4: Docs and Verification

### Task 5: Runtime Docs and Manual Check

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document local usage**

Explain `npm install`, `npm start`, `PORT`, `DATA_DIR`, and where data is stored.

- [ ] **Step 2: Document tunnel assumptions**

State that authentication is expected from Cloudflare Zero Trust and the app should be bound appropriately for the deployment environment.

- [ ] **Step 3: Run automated verification**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Start the app**

Run: `npm start`
Expected: server listens on `http://localhost:3000` unless `PORT` is set.

- [ ] **Step 5: Manually verify**

Open the app, create a text paste, copy it, create an image paste/upload, select both from history, delete one item, and confirm the history remains capped at 100 by the store tests.

- [ ] **Step 6: Commit docs**

```bash
git add README.md
git commit -m "docs: add usage notes"
```
