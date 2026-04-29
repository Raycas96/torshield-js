# AGENTS.md — TorShield JS (Node.js / TypeScript Monorepo)

This file is the predictable, machine-readable “agent README” for this repository. It tells coding agents what to build, what constraints must never be violated, how to run checks, and how to structure work so changes remain merge-ready.

If any instruction here conflicts with an explicit user request, the user request wins.

---

## 0) Repository Identity

### Project

TorShield JS — framework adapters + a framework-agnostic core detector that identifies Tor exit connections.

### Monorepo packages (target)

- `@torshield/core` (zero runtime deps, in-memory Set lookup)
- `@torshield/express` (Express middleware)
- `@torshield/fastify` (Fastify plugin)
- `@torshield/nestjs` (NestJS module + guard)

### Differentiators (non-negotiable)

1. Multi-source aggregation: merge 3 exit-node sources concurrently into one canonical set.
2. In-memory O(1) lookup: no disk writes; no per-request HTTP calls.
3. Auto-refresh: background updater with configurable interval, using `setInterval().unref()` so it does not block process exit.
4. Fail-safe boot: repository starts even if all sources fail on the first fetch.
5. Framework-native adapters: idiomatic Express / Fastify / NestJS integration.
6. Zero runtime dependencies in core (`@torshield/core` has no runtime deps).
7. Actively maintained: document maintenance stance in README(s) and keep code modern.

---

## 1) Ecosystem Reality Check (Why this exists)

The npm ecosystem has historically under-maintained Tor exit detection packages and/or ones with unacceptable production properties (stale lists, disk writes, per-check HTTP requests).

Agent expectation: do not reintroduce those failure modes.

---

## 2) Non-Negotiable Engineering Requirements

### 2.1 Correctness

- Only accept valid IPs (IPv4 and IPv6) during parsing.
- Canonicalize inputs before lookup:
  - `::ffff:1.2.3.4` should be treated as `1.2.3.4`
  - trim whitespace
- Deduplicate across sources using a `Set<string>`.

### 2.2 Performance

- Runtime membership check must be O(1): use `Set.has()`.
- No per-request HTTP calls: network fetch happens only on refresh cycles.
- Store swap must be atomic at the reference level:
  - `IpStore.swap(newSet)` replaces the internal set reference.

### 2.3 Reliability & Resilience

- Fetcher must use `Promise.allSettled` so one failing source never prevents other sources from updating.
- Each individual source request must be bounded by a timeout implemented via `AbortController` (target 10 seconds).
- Detector must start with an awaited initial refresh; if it fails, `start()` still resolves and the store remains empty.
- Background refresh loop must be stoppable for tests:
  - `destroy()` must clear the interval.

### 2.4 Security & Safety

- Do not log raw IPs by default.
- Fail-safe: even if sources are down, server should not crash.
- Treat all incoming request IP fields defensively (missing header, empty string, multiple values).

---

## 3) Agent Operating Principles (How to work)

### 3.1 General workflow

1. Understand the task against this spec (core invariants first).
2. Make the smallest code change that satisfies the acceptance criteria.
3. Add/extend tests that would fail if the invariant regresses.
4. Run the relevant checks (at minimum: typecheck + unit tests; ideally full lint/test/build).
5. Update `TODO.private.md` when a task is implemented (set its status and check the acceptance criteria).

### 3.2 Change size

- Prefer small, reviewable changes.
- Avoid refactors that do not contribute to a task’s acceptance criteria.

### 3.3 “No surprises” policy

- Unit tests must be hermetic: no real network calls.
- Avoid tests that rely on timing; prefer fake timers where appropriate.

---

## 4) Development Environment & Commands

### 4.1 Package manager

Use `pnpm`. Enforce via `preinstall` with `only-allow`.

Typical setup:

```bash
corepack enable
corepack prepare pnpm@9 --activate
pnpm install
```

### 4.2 Baseline scripts (repo root)

Agents should run (names may be aligned by repo tooling):

- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm clean` (only when needed)
- `pnpm changeset` (when releasing or changing published package behavior)

### 4.3 Per-package checks

- Core: `pnpm -F @torshield/core test`
- Express: `pnpm -F @torshield/express test`
- Fastify: `pnpm -F @torshield/fastify test`
- NestJS: `pnpm -F @torshield/nestjs test`

---

## 5) Code Style & Conventions

### 5.1 Language & typing

- TypeScript strict mode is mandatory.
- No implicit `any`.
- Prefer narrow types and explicit parsing/validation.

### 5.2 Formatting

- Single quotes.
- No semicolons (lint/format should enforce).

### 5.3 Testing conventions

- Use Vitest for unit tests.
- Mock `fetch` / `fetchAllSources` where appropriate.
- Use integration tests for adapters:
  - Express: `supertest`
  - Fastify: `fastify.inject()`
  - NestJS: `@nestjs/testing`

---

## 6) Repository Layout (Expected Target Tree)

Agents should implement this layout (or update this document if the layout changes intentionally).

```text
torshield-js/
  .changeset/
  .github/
    workflows/
      ci.yml
      release.yml
  .husky/
    pre-commit
  packages/
    core/
      src/
        index.ts
        detector.ts
        fetcher.ts
        parser.ts
        store.ts
      tests/
        detector.test.ts
        fetcher.test.ts
        parser.test.ts
        store.test.ts
    express/
      src/
        index.ts
      tests/
        middleware.test.ts
    fastify/
      src/
        index.ts
      tests/
        plugin.test.ts
    nestjs/
      src/
        tokens.ts
        tor.guard.ts
        tor.module.ts
        index.ts
      tests/
        guard.spec.ts
  examples/
    express-app/
    fastify-app/
    nestjs-app/
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  package.json
  eslint.config.mjs
  .prettierrc
  .gitignore
  README.md
  TODO.private.md
```

---

## 7) Core Package Contracts (`@torshield/core`)

### 7.1 Public API

Agents must preserve these exports:

- `TorDetector` class
- `TorDetectorOptions` type

### 7.2 `TorDetector` invariants

Requirements:

- `constructor(options?)`
  - `refreshIntervalMs` default: 3_600_000 ms (1 hour)
  - `onRefresh(count)` default: logs a status line (tests may stub)
  - `onError(error)` default: warns but never throws
- `start()`
  - must `await refresh()` once before starting the interval
  - must schedule `setInterval(() => refresh(), refreshIntervalMs)`
  - must call `.unref()` on the interval so it does not block process exit
  - if initial `refresh()` fails, `start()` must still resolve
- `destroy()`
  - must clear the interval if it exists
- `isTor(ip)`
  - must normalize `::ffff:` mapped IPv4 prefixes
  - must trim and then membership check against the store
- `nodeCount`
  - must return current store size

### 7.3 Fetcher invariants (`fetcher.ts`)

- Must define a static `SOURCES` array of 3 URLs.
- `fetchAllSources(signal?)`:
  - must use `Promise.allSettled`
  - must merge successful responses into a single array of raw lines
- `fetchSource(url, signal?)`:
  - must use `AbortController` and enforce 10-second timeout for each source
  - must throw on non-2xx HTTP status

### 7.4 Parser invariants (`parser.ts`)

- Must accept `string[]` raw lines and return `Set<string>`.
- Must skip:
  - blank lines
  - comment lines starting with `#`
- Must trim whitespace around candidate entries.
- Must validate IPv4 and IPv6 separately (regex-based is acceptable).

### 7.5 Store invariants (`store.ts`)

- `IpStore.swap(newSet)` replaces the reference atomically.
- `has(ip)` performs `Set.has(ip)`.
- `size()` returns `set.size`.

---

## 8) Framework Adapter Contracts

### 8.1 Express (`@torshield/express`)

- `blockTorExitNodesMiddleware(options?)` returns an Express middleware function.
- Must parse `x-forwarded-for`:
  - if header is missing, fall back to `req.socket.remoteAddress`
  - if header has multiple values, use the leftmost entry
  - handle header as string, string array, or missing
- Must deny Tor IPs with `statusCode` and JSON `{ error }`.
- Detector should be created and `start()` called in a non-blocking manner for Express.

### 8.2 Fastify (`@torshield/fastify`)

- Expose a Fastify plugin (via `fastify-plugin`).
- Must `await detector.start()` so the first request sees a populated list (at least best-effort).
- Must add `onRequest` hook to deny Tor IPs.
- Must decorate the instance for testing:
  - `fastify.decorate('torDetector', detector)`
- Must destroy the detector on server close.

### 8.3 NestJS (`@torshield/nestjs`)

- Provide:
  - `TOR_DETECTOR_TOKEN` (injection token)
  - `TorGuard` (`CanActivate`)
  - `TorModule` with:
    - `forRoot(options?)`: registers a global guard
    - `forFeature(options?)`: registers a non-global guard for per-controller usage
- Must ensure module initialization awaits the first `detector.start()` so guards have data loaded.

---

## 9) Testing & Mocking Requirements (Hard Rules)

- Unit tests:
  - mock global `fetch`
  - mock `fetchAllSources` when testing detector refresh orchestration
  - mock timers when verifying interval behavior
- Integration tests:
  - no external services
  - use in-memory inject / supertest / Nest test module

---

## 10) Release, Versioning, and Documentation Policy

### 10.1 Changesets

- Every behavior change intended for published packages must come with a Changesets entry.
- Do not publish without a corresponding `.changeset/*` file.

### 10.2 Documentation

Agents must:

- Update `README.md` (root) when public usage changes.
- Update package-level documentation if adapter APIs or options change.
- Keep documentation aligned with the invariants in this file.

---

## 11) Commit / PR Conventions (Agent defaults)

- Commit message prefixes (examples):
  - `chore:` for tooling/docs-only
  - `feat(core):` for `@torshield/core` functionality
  - `feat(express):` for Express adapter
  - `feat(fastify):` for Fastify adapter
  - `feat(nestjs):` for NestJS adapter
  - `fix:` for bug fixes
  - `test:` for test-only updates
- PR titles (example):
  - `[<package>] <Title>`

---

## 12) Output format (what agents should include in their responses)

When an agent finishes implementing something, it must include:

- `Summary:` what changed (1-3 sentences)
- `Tests:` exact commands run (or “not run” with reason)
- `Notes:` any risks, edge cases, or follow-ups

---

## Appendix — TorShield JS Engineering Blueprint (Reference)

The sections below are a copyable blueprint (config templates + reference package implementations) derived from the TorShield JS design in your prompt. Use it as the authoritative implementation reference when scaffolding or filling in missing package code.

If there is any conflict between this appendix and earlier “Non-Negotiable Engineering Requirements”, the requirements win.

---

## PART 0 — Ecosystem Reality Check

Agent expectation: you must not reintroduce the known ecosystem failure modes:

- Unmaintained Tor detection (stale exit node lists)
- Packages that do an HTTP request on every `isTor()` call
- Disk writes in serverless / multi-process environments

---

## PART 1 — Repository Identity

### Project

TorShield JS — Node.js / TypeScript Monorepo

### Suggested npm scope / packages

- npm scope: `@torshield`
- core package: `@torshield/core`
- Express wrapper: `@torshield/express`
- Fastify wrapper: `@torshield/fastify`
- NestJS wrapper: `@torshield/nestjs`

---

## PART 2 — Expected Directory Tree

```text
torshield-js/
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .husky/
│   └── pre-commit
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── detector.ts
│   │   │   ├── fetcher.ts
│   │   │   ├── parser.ts
│   │   │   └── store.ts
│   │   └── tests/
│   ├── express/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── tests/
│   ├── fastify/
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── tests/
│   └── nestjs/
│       ├── src/
│       │   ├── tor.guard.ts
│       │   ├── tor.module.ts
│       │   ├── tokens.ts
│       │   └── index.ts
│       └── tests/
├── examples/
│   ├── express-app/
│   ├── fastify-app/
│   └── nestjs-app/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json
├── eslint.config.mjs
├── .prettierrc
├── .gitignore
├── README.md
└── TODO.private.md
```

---

## PART 3 — Configuration Files (Templates)

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

### Root `package.json`

```json
{
  "name": "torshield-js",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rimraf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "only-allow": "^1.2.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "test:watch": {
      "dependsOn": ["build"],
      "cache": false,
      "persistent": true,
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Run all tests
        run: pnpm test

      - name: Lint
        run: pnpm lint
```

### `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm changeset publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## PART 4 — Package Implementations (Reference)

### 4.1 `@torshield/core`

#### `packages/core/src/parser.ts`

```typescript
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_REGEX = /^[0-9a-fA-F:]+$/

export function parseLines(lines: string[]): Set<string> {
  const ips = new Set<string>()
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip comments, empty lines, and non-IP lines
    if (!trimmed || trimmed.startsWith('#')) continue
    if (IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed)) {
      ips.add(trimmed)
    }
  }
  return ips
}
```

#### `packages/core/src/store.ts`

```typescript
export class IpStore {
  private set: Set<string> = new Set()

  swap(newSet: Set<string>): void {
    this.set = newSet
  }

  has(ip: string): boolean {
    return this.set.has(ip)
  }

  size(): number {
    return this.set.size
  }
}
```

#### `packages/core/src/fetcher.ts`

```typescript
const SOURCES = [
  'https://check.torproject.org/torbulkexitlist',
  'https://raw.githubusercontent.com/SecOps-Institute/Tor-IP-Addresses/master/tor-exit-nodes.lst',
  'https://www.dan.me.uk/torlist/?exit',
]

export async function fetchAllSources(signal?: AbortSignal): Promise<string[]> {
  const results = await Promise.allSettled(SOURCES.map((url) => fetchSource(url, signal)))
  return results
    .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}

async function fetchSource(url: string, signal?: AbortSignal): Promise<string[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url, { signal: signal ?? controller.signal })
    clearTimeout(timeout)
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
    const text = await response.text()
    return text.split('\n')
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}
```

#### `packages/core/src/detector.ts`

```typescript
import { fetchAllSources } from './fetcher'
import { parseLines } from './parser'
import { IpStore } from './store'

export interface TorDetectorOptions {
  refreshIntervalMs?: number
  onRefresh?: (count: number) => void
  onError?: (error: unknown) => void
}

export class TorDetector {
  private readonly store = new IpStore()
  private intervalId?: NodeJS.Timeout
  private readonly options: Required<TorDetectorOptions>

  constructor(options: TorDetectorOptions = {}) {
    this.options = {
      refreshIntervalMs: options.refreshIntervalMs ?? 3_600_000,
      onRefresh:
        options.onRefresh ?? ((count) => console.log(`[TorShield] ${count} exit nodes loaded.`)),
      onError: options.onError ?? ((e) => console.warn('[TorShield] Refresh failed:', e)),
    }
  }

  async start(): Promise<void> {
    await this.refresh()
    this.intervalId = setInterval(() => this.refresh(), this.options.refreshIntervalMs)
    // Prevent the background timer from blocking process exit
    this.intervalId.unref()
  }

  destroy(): void {
    if (this.intervalId) clearInterval(this.intervalId)
  }

  isTor(ip: string): boolean {
    const normalized = ip.replace(/^::ffff:/, '').trim()
    return this.store.has(normalized)
  }

  get nodeCount(): number {
    return this.store.size()
  }

  private async refresh(): Promise<void> {
    try {
      const lines = await fetchAllSources()
      const parsed = parseLines(lines)
      this.store.swap(parsed)
      this.options.onRefresh(parsed.size)
    } catch (e) {
      this.options.onError(e)
    }
  }
}
```

#### `packages/core/src/index.ts`

```typescript
export { TorDetector } from './detector'
export type { TorDetectorOptions } from './detector'
```

---

### 4.2 `@torshield/express`

#### `packages/express/src/index.ts`

```typescript
import { TorDetector, TorDetectorOptions } from '@torshield/core'
import { Request, Response, NextFunction } from 'express'

export interface TorMiddlewareOptions extends TorDetectorOptions {
  message?: string
  statusCode?: number
}

export function blockTorExitNodesMiddleware(options: TorMiddlewareOptions = {}) {
  const detector = new TorDetector(options)
  detector.start() // Non-blocking for Express

  const statusCode = options.statusCode ?? 403
  const message = options.message ?? 'Access denied: Tor connections are not permitted.'

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for']
    const raw = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(',')[0] ?? req.socket.remoteAddress ?? '')
    const ip = raw.trim()

    if (detector.isTor(ip)) {
      res.status(statusCode).json({ error: message })
      return
    }
    next()
  }
}
```

---

### 4.3 `@torshield/fastify`

#### `packages/fastify/src/index.ts`

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { TorDetector, TorDetectorOptions } from '@torshield/core'

export interface TorFastifyOptions extends TorDetectorOptions {
  message?: string
  statusCode?: number
}

const torPlugin: FastifyPluginAsync<TorFastifyOptions> = async (fastify, options) => {
  const detector = new TorDetector(options)

  // Await initial fetch so fastify.ready() guarantees the list is loaded.
  await detector.start()

  fastify.addHook('onRequest', async (request, reply) => {
    if (detector.isTor(request.ip)) {
      reply.code(options.statusCode ?? 403).send({
        error: options.message ?? 'Access denied: Tor connections are not permitted.',
      })
    }
  })

  fastify.decorate('torDetector', detector)

  fastify.addHook('onClose', async () => {
    detector.destroy()
  })
}

export default fp(torPlugin, {
  name: '@torshield/fastify',
  fastify: '>=4.0.0',
})
```

---

### 4.4 `@torshield/nestjs`

#### `packages/nestjs/src/tokens.ts`

```typescript
export const TOR_DETECTOR_TOKEN = Symbol('TOR_DETECTOR_TOKEN')
```

#### `packages/nestjs/src/tor.guard.ts`

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common'
import { TorDetector } from '@torshield/core'
import { TOR_DETECTOR_TOKEN } from './tokens'

@Injectable()
export class TorGuard implements CanActivate {
  constructor(@Inject(TOR_DETECTOR_TOKEN) private readonly detector: TorDetector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const forwarded = request.headers['x-forwarded-for']
    const raw = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(',')[0] ?? request.socket?.remoteAddress ?? '')
    const ip = raw.trim()

    if (this.detector.isTor(ip)) {
      throw new ForbiddenException('Access denied: Tor connections are not permitted.')
    }
    return true
  }
}
```

#### `packages/nestjs/src/tor.module.ts`

```typescript
import { Module, DynamicModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { TorDetector, TorDetectorOptions } from '@torshield/core'
import { TorGuard } from './tor.guard'
import { TOR_DETECTOR_TOKEN } from './tokens'

@Module({})
export class TorModule {
  static forRoot(options: TorDetectorOptions = {}): DynamicModule {
    return {
      module: TorModule,
      global: true,
      providers: [
        {
          provide: TOR_DETECTOR_TOKEN,
          useFactory: async () => {
            const detector = new TorDetector(options)
            await detector.start()
            return detector
          },
        },
        TorGuard,
        { provide: APP_GUARD, useClass: TorGuard },
      ],
      exports: [TorGuard, TOR_DETECTOR_TOKEN],
    }
  }

  static forFeature(options: TorDetectorOptions = {}): DynamicModule {
    return {
      module: TorModule,
      providers: [
        {
          provide: TOR_DETECTOR_TOKEN,
          useFactory: async () => {
            const detector = new TorDetector(options)
            await detector.start()
            return detector
          },
        },
        TorGuard,
      ],
      exports: [TorGuard],
    }
  }
}
```

#### `packages/nestjs/src/index.ts`

```typescript
export { TorGuard } from './tor.guard'
export { TorModule } from './tor.module'
export { TOR_DETECTOR_TOKEN } from './tokens'
```

---

## PART 5 — Jira-Style Todo Plan

The full TorShield JS Jira-style task board lives in `TODO.private.md` at the repository root. Treat it as the canonical, stateful checklist (so work can be marked `IN PROGRESS` / `DONE` without editing this file).

---

## PART 6 — Notes for Agents (Implementation Pitfalls)

1. Express adapter:
   - `detector.start()` should be non-blocking so boot continues.
   - Still parse `x-forwarded-for` defensively with leftmost IP precedence.
2. Fastify adapter:
   - `await detector.start()` inside the plugin so `fastify.ready()` implies readiness.
3. NestJS module:
   - `forRoot` registers a global guard using `APP_GUARD`.
   - `forFeature` must NOT register a global guard.
4. Core:
   - Always use `Promise.allSettled`.
   - Per-source timeout via `AbortController` (10s target).
   - `setInterval().unref()` for non-blocking process exit.

---

## PART 7 — Testing Strategy (Minimal)

Core unit tests must:

- mock global `fetch`
- avoid real network calls
- verify `start()` / refresh orchestration behavior

Adapter tests must:

- use `supertest` / `fastify.inject()` / `@nestjs/testing`
- avoid external network dependency

## PART 7.1 — Vitest + Turborepo Integration

Integrating Vitest with Turborepo can improve performance by leveraging Turborepo’s caching to run tests only when relevant code changes, but you need to navigate the interaction between Vitest’s `projects` feature and package boundaries.

Reference: [Vitest Guide](https://vitest.dev/guide/).

### Strategy 1 — Package-level caching (recommended for CI/perf)

Configure Turbo tasks so each package runs its own `vitest` via its package-local `test` script.

Trade-off: merging coverage reports is typically an external step (merged `projects` coverage isn’t always equivalent to per-package coverage).

### Strategy 2 — Vitest Projects (recommended for local dev/UX)

Use a root `vitest.config.ts` with the `projects` array so one command runs everything and can produce merged coverage.

Trade-off: this approach can bypass package boundaries, reducing Turborepo’s ability to cache individual package test results effectively.

### Hybrid approach (common in real teams)

Use Vitest Projects locally (for best UX) and Turbo per-package `test` in CI (for best caching).

Implementation best practices:

- shared Vitest config (e.g. a small `@repo/vitest-config` package) to avoid duplication
- separate Turbo tasks for `test` and `test:watch`
- set `cache: false` and `persistent: true` for `test:watch` so Turbo does not interfere with the long-running process
