# TorShield JS — Node.js / TypeScript Monorepo

<p align="center">
  <img src="./assets/logo.png" alt="TorShield logo" width="460" />
</p>

Framework adapters + a framework-agnostic core that identifies Tor exit connections.

## Why TorShield exists

Most community Tor detection packages fall into one (or more) of these buckets:

- Stale / incomplete exit node lists (accuracy degrades over time)
- Refresh implemented via slow or blocking approaches (including per-request HTTP calls)
- Server-side disk writes (bad for serverless, containerized, or multi-process deployments)
- Integration that is not idiomatic for the framework you are using

TorShield JS is designed to be production-friendly:

- Multi-source aggregation into a single canonical in-memory set
- O(1) lookups during requests (no network calls per request)
- Background refresh loop with a fail-safe boot
- Framework-native adapters for Express, Fastify, and NestJS

## Packages

- `@torshield/core`  
  Framework-agnostic Tor exit detector with in-memory store and background refresh.
- `@torshield/express`  
  Express middleware factory.
- `@torshield/fastify`  
  Fastify plugin.
- `@torshield/nestjs`  
  NestJS module + guard.

## Installation

Install the core and the adapter you need:

```bash
npm i @torshield/core
```

Express:

```bash
npm i @torshield/express
```

Fastify:

```bash
npm i @torshield/fastify
```

NestJS:

```bash
npm i @torshield/nestjs
```

## Quick Start

### Express (middleware)

```ts
import express from 'express'
import {blockTorExitNodesMiddleware} from '@torshield/express'

const app = express()
app.use(blockTorExitNodesMiddleware({statusCode: 403}))

app.get('/', (_req, res) => res.send('ok'))
app.listen(3000)
```

### Fastify (plugin)

```ts
import Fastify from 'fastify'
import torPlugin from '@torshield/fastify'

const app = Fastify()
app.register(torPlugin, {statusCode: 403})

app.get('/', async () => 'ok')
app.listen({port: 3000})
```

### NestJS (module)

```ts
import {Module} from '@nestjs/common'
import {TorModule} from '@torshield/nestjs'

@Module({
	imports: [TorModule.forRoot({refreshIntervalMs: 60 * 60 * 1000})],
})
export class AppModule {}
```

`TorModule.forRoot()` registers a global guard, so routes are protected without needing `@UseGuards()`.

## `TorDetectorOptions` Reference

Adapter packages accept the same options because they are forwarded to `@torshield/core`.

| Option               | Type                       | Default              | Notes                                                                 |
| -------------------- | -------------------------- | -------------------- | --------------------------------------------------------------------- |
| `refreshIntervalMs?` | `number`                   | `3_600_000` (1 hour) | How often the detector refreshes the exit-node set.                   |
| `onRefresh?`         | `(count: number) => void`  | Logs loaded count    | Called after a successful refresh (after store swap).                 |
| `onError?`           | `(error: unknown) => void` | Warns                | Called when a refresh cycle fails. Detector never crashes the server. |

## How it works

1. **Fetch (background)**: the detector concurrently fetches exit node sources and applies per-source timeouts.
2. **Parse**: raw lines are trimmed, comments/blank lines are removed, and candidates are validated as IPs (IPv4/IPv6).
3. **Canonicalize & dedupe**: entries are normalized (e.g. `::ffff:1.2.3.4` becomes `1.2.3.4`) and deduplicated into a `Set<string>`.
4. **Swap (atomic update)**: the in-memory store swaps the entire `Set` reference so request-time lookups never see partial state.
5. **Serve requests (O(1))**: adapters call `detector.isTor(ip)` and deny matching requests immediately.

Fail-safe behavior: the server/adapters start even if the initial fetch fails; the refresh loop retries on the next interval.

## Performance

TorShield is built to avoid expensive per-request work:

- **O(1) lookup**: membership check is a `Set.has()` operation.
- **No per-request HTTP**: network fetches happen only during refresh cycles.
- **Zero runtime dependencies in core**: `@torshield/core` is designed to have no runtime dependencies.
- **Background refresh does not block exit**: refresh timer uses `unref()` so short-lived processes (CLIs, tests) can terminate cleanly.

## Security & Operational Considerations

- **False positives/negatives are possible**: this is an exit-node heuristic, not a guarantee. Use it as a signal for risk management.
- **IP forwarding matters**: adapters check proxy headers (`x-forwarded-for`) when present and fall back safely when missing.
- **Fail-safe startup**: refresh failures do not crash your service.
- **Logging**: avoid logging raw IPs in production; configure `onRefresh`/`onError` to match your policies.

## Contributing

- Follow the agent guidelines in `AGENTS.md`.
- Track implementation steps in `TODO.private.md`.
- Keep changes small, add/extend tests, and run `pnpm test` (and the relevant package tests) before submitting.

## Vitest + Turborepo Integration

Integrating Vitest with Turborepo can significantly improve performance by leveraging Turborepo's caching to run tests only for packages affected by relevant code changes. It also requires thinking about how Vitest's `projects` feature interacts with package boundaries.

Documentation: [Vitest Guide](https://vitest.dev/guide/).

### Strategy A - Package-level caching (recommended for CI/perf)

Configure Turbo tasks per package so each package has its own `vitest` script. This allows Turborepo to cache results effectively and only run tests for changed packages.

Trade-off: coverage may need to be merged externally because merged projects coverage is not always available when running per-package tests.

### Strategy B - Vitest Projects (recommended for local dev/UX)

Use a root `vitest.config.ts` with the `projects` array to run all tests from a single command, providing out-of-the-box merged coverage reports.

Trade-off: this approach can bypass package boundaries, reducing Turbo's ability to cache individual package test results effectively.

### Best-practice hybrid approach

Many teams combine both methods: use Vitest Projects for local development and use Turbo per-package `test` tasks for CI to maximize caching and speed. A shared configuration package (example: `@repo/vitest-config`) helps avoid duplicated Vitest settings across packages.

Implementation notes for Turbo tasks:

- define separate tasks for `test` vs `test:watch`
- for `test:watch`, set `cache: false` and `persistent: true` so Turbo does not interfere with the long-running watch process

## License

MIT

# TorShield JS — Node.js / TypeScript Monorepo

Framework adapters + a framework-agnostic core that identifies Tor exit connections.

## Why TorShield exists

Most community Tor detection packages fall into one (or more) of these buckets:

- Stale / incomplete exit node lists (accuracy degrades over time)
- Refresh implemented via slow or blocking approaches (including per-request HTTP calls)
- Server-side disk writes (bad for serverless, containerized, or multi-process deployments)
- Integration that is not idiomatic for the framework you are using

TorShield JS is designed to be production-friendly:

- Multi-source aggregation into a single canonical in-memory set
- O(1) lookups during requests (no network calls per request)
- Background refresh loop with a fail-safe boot
- Framework-native adapters for Express, Fastify, and NestJS

## Packages

- `@torshield/core`  
  Framework-agnostic Tor exit detector with in-memory store and background refresh.
- `@torshield/express`  
  Express middleware factory.
- `@torshield/fastify`  
  Fastify plugin.
- `@torshield/nestjs`  
  NestJS module + guard.

## Installation

Install the core and the adapter you need:

```bash
npm i @torshield/core
```

Express:

```bash
npm i @torshield/express
```

Fastify:

```bash
npm i @torshield/fastify
```

NestJS:

```bash
npm i @torshield/nestjs
```

## Quick Start

### Express (middleware)

```ts
import express from 'express'
import {blockTorExitNodesMiddleware} from '@torshield/express'

const app = express()
app.use(blockTorExitNodesMiddleware({statusCode: 403}))

app.get('/', (_req, res) => res.send('ok'))
app.listen(3000)
```

### Fastify (plugin)

```ts
import Fastify from 'fastify'
import torPlugin from '@torshield/fastify'

const app = Fastify()
app.register(torPlugin, {statusCode: 403})

app.get('/', async () => 'ok')
app.listen({port: 3000})
```

### NestJS (module)

```ts
import {Module} from '@nestjs/common'
import {TorModule} from '@torshield/nestjs'

@Module({
	imports: [TorModule.forRoot({refreshIntervalMs: 60 * 60 * 1000})],
})
export class AppModule {}
```

`TorModule.forRoot()` registers a global guard, so routes are protected without needing `@UseGuards()`.

## `TorDetectorOptions` Reference

Adapter packages accept the same options because they are forwarded to `@torshield/core`.

| Option               | Type                       | Default              | Notes                                                                 |
| -------------------- | -------------------------- | -------------------- | --------------------------------------------------------------------- |
| `refreshIntervalMs?` | `number`                   | `3_600_000` (1 hour) | How often the detector refreshes the exit-node set.                   |
| `onRefresh?`         | `(count: number) => void`  | Logs loaded count    | Called after a successful refresh (after store swap).                 |
| `onError?`           | `(error: unknown) => void` | Warns                | Called when a refresh cycle fails. Detector never crashes the server. |

## How it works

1. **Fetch (background)**: the detector concurrently fetches exit node sources and applies per-source timeouts.
2. **Parse**: raw lines are trimmed, comments/blank lines are removed, and candidates are validated as IPs (IPv4/IPv6).
3. **Canonicalize & dedupe**: entries are normalized (e.g. `::ffff:1.2.3.4` becomes `1.2.3.4`) and deduplicated into a `Set<string>`.
4. **Swap (atomic update)**: the in-memory store swaps the entire `Set` reference so request-time lookups never see partial state.
5. **Serve requests (O(1))**: adapters call `detector.isTor(ip)` and deny matching requests immediately.

Fail-safe behavior: the server/adapters start even if the initial fetch fails; the refresh loop retries on the next interval.

## Performance

TorShield is built to avoid expensive per-request work:

- **O(1) lookup**: membership check is a `Set.has()` operation.
- **No per-request HTTP**: network fetches happen only during refresh cycles.
- **Zero runtime dependencies in core**: `@torshield/core` is designed to have no runtime dependencies.
- **Background refresh does not block exit**: refresh timer uses `unref()` so short-lived processes (CLIs, tests) can terminate cleanly.

## Security & Operational Considerations

- **False positives/negatives are possible**: this is an exit-node heuristic, not a guarantee. Use it as a signal for risk management.
- **IP forwarding matters**: adapters check proxy headers (`x-forwarded-for`) when present and fall back safely when missing.
- **Fail-safe startup**: refresh failures do not crash your service.
- **Logging**: avoid logging raw IPs in production; configure `onRefresh`/`onError` to match your policies.

## Contributing

- Follow the agent guidelines in `AGENTS.md`.
- Track implementation steps in `TODO.private.md`.
- Keep changes small, add/extend tests, and run `pnpm test` (and the relevant package tests) before submitting.

## License

MIT
