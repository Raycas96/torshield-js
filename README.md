# TorShield JS

<p align="center">
  <img src="./assets/logo.png" alt="TorShield logo" width="430" />
</p>

<p align="center">
  TypeScript monorepo for fast, in-memory Tor exit-node detection.
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6.x-3178C6.svg" />
  <img alt="Node" src="https://img.shields.io/badge/Node-%3E%3D20-339933.svg" />
  <img alt="Monorepo" src="https://img.shields.io/badge/Monorepo-pnpm%20%2B%20Turbo-F69220.svg" />
</p>

## Why TorShield

- Multi-source aggregation with concurrent fetching and per-source timeout controls.
- O(1) request-time checks using an in-memory `Set`.
- Fail-safe startup/refresh behavior (service keeps running if sources fail).
- Framework adapters on top of a shared core detector.

## Packages

- `@raycas/torshield-core`  
  Core detector (`TorDetector`) and primitives.
- `@raycas/torshield-express`  
  Express adapter with explicit singleton initialization.
- `@raycas/torshield-fastify`  
  Fastify plugin with shared detector initialization and startup readiness.
- `@raycas/torshield-nestjs`  
  NestJS guard/module integration with async singleton detector initialization and guard override support.

Published tarballs ship a **README per package** (see each `packages/*/README.md`). This file is the monorepo overview.

## Install

Install only what your app needs.

```bash
npm i @raycas/torshield-core
```

```bash
npm i @raycas/torshield-express express
```

```bash
npm i @raycas/torshield-fastify fastify fastify-plugin
```

```bash
npm i @raycas/torshield-nestjs @nestjs/common @nestjs/core
```

## Quick Starts

### Core (`@raycas/torshield-core`)

Use the detector directly when you want framework-agnostic checks.

```ts
import {TorDetector} from '@raycas/torshield-core'

const detector = new TorDetector({
	onRefresh(count) {
		console.log(`Loaded ${count} Tor exit nodes`)
	},
	onError(error) {
		console.error('Tor detector refresh error:', error)
	},
})

await detector.start()

const isTor = detector.isTorNode('1.2.3.4')
console.log({isTor, loaded: detector.torExitNodesCount})

detector.destroy()
```

### Express (`@raycas/torshield-express`)

Call `initializeDetector(...)` once during bootstrap, then register middleware.

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

### Fastify (`@raycas/torshield-fastify`)

Register the plugin once. The detector is initialized during plugin startup.

```ts
import Fastify from 'fastify'
import torShieldPlugin from '@raycas/torshield-fastify'

const app = Fastify({
	// Behind Nginx, Cloudflare, ingress, or ALB — so `request.ip` uses `X-Forwarded-For`
	trustProxy: true,
})

await app.register(torShieldPlugin, {
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})

app.get('/health', async () => ({ok: true}))

await app.listen({port: 3000})
```

If TypeScript reports `No overload matches this call` on `register()` and the error lists **two different** `node_modules/.../fastify` paths, you have duplicate Fastify installs (common when `pnpm link` or `link:` pulls in another repo’s `node_modules`). Use a single `fastify` version, run `pnpm dedupe`, or see [packages/fastify/README.md](packages/fastify/README.md#troubleshooting-duplicate-fastify-types-on-register).

### NestJS (`@raycas/torshield-nestjs`)

Use `forRoot(...)` for a global guard.

```ts
import {Module} from '@nestjs/common'
import {TorModule} from '@raycas/torshield-nestjs'

@Module({
	imports: [
		TorModule.forRoot({
			verbose: true,
		}),
	],
})
export class AppModule {}
```

## Core API

`@raycas/torshield-core` exports:

- `TorDetector`
- `TorDetectorOptions`

Current `TorDetectorOptions`:

<!-- docs-sync:core-options:start -->

- `onRefresh?: (count: number) => void`
- `onError?: (error: unknown) => void`
- `verbose?: boolean`
<!-- docs-sync:core-options:end -->

Current `TorDetector` behavior:

<!-- docs-sync:core-behavior:start -->

- `start()` performs an initial refresh then schedules a 24-hour background refresh loop.
- `refresh()` fetches sources concurrently with per-source timeouts.
- `isTorNode(ip)` checks membership in normalized in-memory data.
- `torExitNodesCount` returns the loaded set size.
- `destroy()` clears data and stops the timer.
<!-- docs-sync:core-behavior:end -->

## How Detection Works

1. Fetches multiple Tor exit-node sources concurrently.
2. Parses/validates lines into canonical IP values.
3. Deduplicates into an in-memory `Set<string>`.
4. Atomically swaps the store.
5. Adapters perform request-time `Set.has()` checks.

## Operations Notes

- No per-request HTTP calls.
- Refresh failures trigger callbacks; they do not crash the app.
- Behind proxies: Express — `app.set('trust proxy', true)`; Fastify — `Fastify({ trustProxy: true })` (the plugin uses `request.ip`). NestJS follows your HTTP adapter (Express/Fastify) for the underlying request.
- Adapter detector options are set on first initialization and reused for the lifecycle.

## Contributing

- Follow engineering rules in `AGENTS.md`.
- Keep docs aligned with public API changes.
- Run checks before merge:
  - `pnpm -F @raycas/torshield-core test`
  - `pnpm -F @raycas/torshield-express test`
  - `pnpm -F @raycas/torshield-fastify test`
  - `pnpm -F @raycas/torshield-nestjs test`

## Dependency Updates (Renovate)

Automated dependency updates are configured via `renovate.json`.

1. Install and enable the [Renovate GitHub App](https://github.com/apps/renovate) for this repository.
2. Keep reviewers in `.github/CODEOWNERS` aligned with your actual GitHub handle/team.
3. Review the Dependency Dashboard issue created by Renovate to control grouped updates.

Current policy:

- Major updates are always separated for manual review.
- Non-major `devDependencies` are grouped to reduce PR noise.
- Lockfile maintenance runs weekly.

## License

MIT
