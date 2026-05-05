# @raycas/torshield-express

Express middleware adapter for blocking Tor exit-node traffic, using **`@raycas/torshield-core`** as a **singleton** detector (initialize once, reuse on every request).

<p align="center">
  <img src="./assets/logo.png" alt="TorShield logo" width="360" />
</p>

<p align="center">
  <img alt="Express" src="https://img.shields.io/badge/Express-%3E%3D4.22-000000.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6.svg" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
</p>

## Requirements

- Node **≥ 20**
- **`express`** **≥ 4.22.1** (peer dependency)

## Install

```bash
npm i @raycas/torshield-express express
```

The core package ships as a normal dependency of this adapter — you do not install `@raycas/torshield-core` separately for typical Express usage.

## Quick start

Initialize **`initializeDetector`** once during bootstrap (before `app.listen`), then mount the middleware.

```ts
import express from 'express'
import {initializeDetector, blockTorExitNodesMiddleware} from '@raycas/torshield-express'

const app = express()

initializeDetector({
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})

app.set('trust proxy', true)
app.use(blockTorExitNodesMiddleware())

app.get('/health', (_req, res) => {
	res.json({ok: true})
})
```

## Reverse proxy

Behind Nginx, Cloudflare, Kubernetes ingress, AWS ALB, etc., set **`trust proxy`** so Express and downstream headers align with your deployment. The middleware reads **`x-forwarded-for`** (left-most IP in the list) and falls back to **`socket.remoteAddress`**.

```ts
app.set('trust proxy', true)
```

See [Express `trust proxy`](https://expressjs.com/en/guide/behind-proxies.html).

## API

### `initializeDetector(options?)`

Creates and starts the shared detector. Call **once** before using `blockTorExitNodesMiddleware()`.

### `blockTorExitNodesMiddleware()`

Returns middleware that:

- reads client IP from **`x-forwarded-for`** (string or array → **left-most** value), else socket address
- resolves Tor membership via **`@raycas/torshield-core`**
- calls **`next()`** when traffic is allowed
- responds with **`statusCode`** + **`{error: message}`** when blocked
- if **`onTorDetected`** is configured, invokes it instead of the default denial

Detector options type:

<!-- docs-sync:express-options:start -->

```ts
type TorExitNodeMiddlewareOptions = {
	statusCode?: number
	message?: string
	onTorDetected?: (request: Request, response: Response, next: NextFunction) => void | Promise<void>
	onRefresh?: (count: number) => void
	onError?: (error: unknown) => void
	verbose?: boolean
}
```

<!-- docs-sync:express-options:end -->

Default values:

<!-- docs-sync:express-defaults:start -->

- `statusCode`: `403`
- `message`: `Access denied: Tor exit node traffic is not allowed.`
<!-- docs-sync:express-defaults:end -->

## Behavior notes

- One detector instance for the entire process tree that imported this initializer.
- **24 h** background refresh (`unref`-style timer semantics from core).
- Refresh failures invoke **`onError`** / logging; they do not crash your server by default.

## Related packages

| Package                                   | Role                        |
| ----------------------------------------- | --------------------------- |
| [`@raycas/torshield-core`](../core)       | Use alone if not on Express |
| [`@raycas/torshield-fastify`](../fastify) | Fastify plugin              |
| [`@raycas/torshield-nestjs`](../nestjs)   | NestJS module + guard       |

Full story: [**monorepo README**](../../README.md).
