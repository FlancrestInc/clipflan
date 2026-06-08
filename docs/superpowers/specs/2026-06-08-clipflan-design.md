# Clipflan Design

## Goal

Build a local-only shared clipboard web app for text and images. Users will access it through an authenticated Cloudflare Zero Trust tunnel, so the app does not need account management in its first version. It should let an authorized user paste text or an image on one computer, then open the app on another computer and copy that item back out.

## Scope

The first version supports:

- Pasting plain text into a text box.
- Pasting or selecting an image file.
- Viewing a persistent history of the last 100 pasted items.
- Selecting a history item to preview it.
- Copying the selected item back to the system clipboard.
- Deleting individual history items.
- Surviving server restarts.

Out of scope for the first version:

- User accounts, sharing permissions, or authentication inside the app.
- Public anonymous paste URLs.
- Multi-user ownership or audit trails.
- Rich-text editing.
- Cross-device real-time push updates beyond lightweight polling.

## Architecture

Use a small Node.js application:

- Express serves the API and static frontend.
- SQLite stores item metadata and text content.
- Image bytes are stored on disk under `data/uploads/`, with SQLite storing the file path, MIME type, size, and timestamps.
- The app enforces a hard cap of 100 items after every create operation by deleting the oldest extra records and their image files.

This keeps deployment simple behind Cloudflare Tunnel while providing durable local persistence.

## UI

Use a split-pane single-page interface:

- Left pane: searchable or scrollable history list, newest first, with type, preview text or thumbnail, and timestamp.
- Right pane: paste input area, selected-item preview, copy action, delete action, and status messages.

On narrow screens, the layout stacks with the paste/preview area first and history below.

## Data Model

`items` table:

- `id`: string UUID primary key.
- `kind`: `text` or `image`.
- `text_content`: text content for text items.
- `file_path`: image file path for image items.
- `mime_type`: MIME type for images.
- `byte_size`: stored byte size.
- `created_at`: ISO timestamp.

## API

- `GET /api/items`: return newest-first metadata and text content for text items.
- `POST /api/items/text`: create a text item.
- `POST /api/items/image`: upload an image item.
- `GET /api/items/:id/file`: return image bytes for image items.
- `DELETE /api/items/:id`: delete an item and any stored file.

The API assumes the tunnel handles authentication. It should still validate input size, accepted image MIME types, and missing records.

## Error Handling

The server returns structured JSON errors for invalid input, missing items, oversized images, and storage failures. The frontend shows concise inline status messages and keeps the current history visible when an operation fails.

## Testing

Add focused automated tests for:

- Creating text items.
- Uploading image items.
- Listing newest-first history.
- Enforcing the 100-item retention cap.
- Deleting item metadata and image files.

Manual verification should cover paste interactions, copy behavior in a browser, and layout at desktop and mobile widths.
