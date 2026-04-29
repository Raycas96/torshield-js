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

## Project Status

- `@torshield/core`: implemented
- `@torshield/express`: implemented
- `@torshield/fastify`: scaffolded (WIP)
- `@torshield/nestjs`: scaffolded (WIP)

## Packages

- `@torshield/core`  
  Core detector (`TorDetector`) and primitives.
- `@torshield/express`  
  Express adapter with explicit singleton initialization.

## Install

Install only what your app needs.

```bash
npm i @torshield/core
```

```bash
npm i @torshield/express express
```

## Quick Start (Express)

`@torshield/express` uses explicit initialization. Call `initializeDetector(...)` once during bootstrap.

```ts
import express from 'express'
import {initializeDetector, blockTorExitNodesMiddleware} from '@torshield/express'

const app = express()

initializeDetector({
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
	onError(error) {
		console.error('Tor detector refresh error:', error)
	},
})

app.set('trust proxy', true)
app.use(blockTorExitNodesMiddleware())

app.get('/health', (_req, res) => {
	res.json({ok: true})
})
```

## Core API

`@torshield/core` exports:

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
- Behind proxies, enable `app.set('trust proxy', true)` for accurate client IP extraction.

## Contributing

- Follow engineering rules in `AGENTS.md`.
- Keep docs aligned with public API changes.
- Run checks before merge:
  - `pnpm -F @torshield/core test`
  - `pnpm -F @torshield/express test`

## License

MIT
