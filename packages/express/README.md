# @torshield/express

<p align="center">
  <img src="./assets/logo.png" alt="TorShield logo" width="420" />
</p>

Express middleware for blocking requests coming from Tor exit nodes.

## Installation

```bash
pnpm add @torshield/express express
```

## Usage

Initialize the detector first, then register the middleware.

```ts
import express from 'express'
import {blockTorExitNodesMiddleware, initializeDetector} from '@torshield/express'

const app = express()

initializeDetector({
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})

app.use(blockTorExitNodesMiddleware())

app.get('/health', (_req, res) => {
	res.json({ok: true})
})
```

## API

### `initializeDetector(options?)`

Initializes and starts the singleton detector instance. Call this once during app bootstrapping before registering middleware.

### `blockTorExitNodesMiddleware()`

Creates an Express middleware that:

- Extracts client IP from `x-forwarded-for` (left-most value) or socket address.
- Checks if the IP is a Tor exit node using `@torshield/core`.
- Calls `next()` for allowed requests.
- Returns a JSON error for blocked requests.

Detector options type:

```ts
type TorExitNodeMiddlewareOptions = {
	statusCode?: number
	message?: string
	verbose?: boolean
	onRefresh?: (count: number) => void
	onError?: (error: unknown) => void
}
```

Default values:

- `statusCode`: `403`
- `message`: `'Access denied: Tor exit node traffic is not allowed.'`
- `verbose`: `false`

## Notes

- The underlying detector instance is initialized once and reused (singleton behavior).
- `blockTorExitNodesMiddleware()` requires `initializeDetector(...)` to be called first.
- Tor exit node data refresh runs in the background and updates every 24 hours.
- The middleware is fail-open during startup/refresh errors: it does not block requests unless an IP is positively detected as a Tor exit node.

## Behind Reverse Proxies

If your app runs behind a load balancer, ingress, or reverse proxy (for example Nginx, AWS ALB, or Cloudflare), enable Express trust proxy so client IP resolution is correct:

```ts
import express from 'express'

const app = express()
app.set('trust proxy', true)
```

Without this, Express may use the proxy IP instead of the real client IP, which can lead to incorrect Tor detection decisions.
