# Clipflan

Clipflan is a local-only shared clipboard for text and images. Paste from one authorized device, open the same web app on another device, and copy the item back out of the shared history.

The app is designed to sit behind an authenticated Cloudflare Zero Trust tunnel. It does not implement user accounts or app-level authentication.

## Run Locally

```bash
npm install
npm start
```

By default the app listens at:

```text
http://localhost:3000
```

## Configuration

Environment variables:

- `PORT`: HTTP port. Defaults to `3000`.
- `DATA_DIR`: base directory for durable app data. Defaults to `./data`.
- `DB_PATH`: SQLite database path. Defaults to `$DATA_DIR/clipflan.sqlite`.
- `UPLOAD_DIR`: image storage directory. Defaults to `$DATA_DIR/uploads`.
- `MAX_IMAGE_BYTES`: max image upload size. Defaults to `10485760` bytes.

`data/` is ignored by git. Keep it on persistent local storage if you want history to survive host restarts.

## Behavior

- Text and image pastes are stored server-side.
- The history is capped at the newest 100 items.
- Deleting an image item removes its stored file.
- Image copy uses the browser Clipboard API, which requires HTTPS or `localhost`.
- The frontend refreshes history every five seconds.

## Cloudflare Zero Trust

Run Clipflan on a private host and publish it through a Cloudflare Tunnel protected by Zero Trust Access. Authentication and authorization are expected at that layer.

Bind and expose the server according to your tunnel setup. For example:

```bash
PORT=3000 DATA_DIR=/var/lib/clipflan npm start
```

## Test

```bash
npm test
```
