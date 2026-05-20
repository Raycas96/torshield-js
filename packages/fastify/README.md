# @raycas/torshield-fastify

Fastify plugin that blocks requests from IPs listed as Tor exit nodes, using **`@raycas/torshield-core`** under the hood (singleton detector, shared across hooks).

<p align="center">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-5-000000.svg" />
  <img alt="fastify-plugin" src="https://img.shields.io/badge/fastify--plugin-5-000000.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6.svg" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
</p>

## Requirements

- Node **≥ 20**
- **`fastify`** and **`fastify-plugin`** installed in your app (peer dependencies; Fastify 5.x + compatible `fastify-plugin`)

## Install

```bash
npm i @raycas/torshield-fastify fastify fastify-plugin
```

(Core is bundled; you only add the peers above.)

## Local example app

```bash
pnpm example:fastify
```

Or run only the workspace:

```bash
pnpm -C examples/fastify-app dev
pnpm -C examples/fastify-app tunnel
```

## Quick start

```ts
import Fastify from 'fastify'
import {torShieldFastifyPlugin} from '@raycas/torshield-fastify'

const app = Fastify({
	// Needed behind reverse proxies — see below
	trustProxy: true,
})

await app.register(torShieldFastifyPlugin, {
	statusCode: 403,
	message: 'Access denied: Tor exit node traffic is not allowed.',
})

app.get('/health', async () => ({ok: true}))
```

Plugin options extend core detector options (`onRefresh`, `onError`, `verbose`) plus HTTP behaviour:

```ts
type TorFastifyOptions = {
	statusCode?: number
	message?: string
	onTorDetected?: (request: unknown, reply: unknown) => void | Promise<void>
} & import('@raycas/torshield-core').TorDetectorOptions
```

If **`onTorDetected`** is set, it runs instead of the default JSON denial.

## Reverse proxy

The hook uses **`request.ip`**. Fastify respects `X-Forwarded-For` only when **`trustProxy`** is configured ([Fastify `trustProxy`](https://fastify.dev/docs/latest/Reference/Server/#trustproxy)). Use a strict value appropriate to how many hops you trust (single proxy vs chain).

Without `trustProxy`, `request.ip` is usually the immediate TCP peer (often your load balancer), not the end client.

## TypeScript: `register()` overload / duplicate `Fastify` types

If the error cites **two different** `node_modules/.../fastify` paths (typical when **linking** this repo alongside your app), TypeScript treats the two installations as incompatible nominal types.

1. Prefer **one** resolved `fastify` version (`pnpm dedupe`, `pnpm.overrides`).
2. If needed temporarily:

```ts
import type {FastifyPluginAsync} from 'fastify'
import type {TorFastifyOptions} from '@raycas/torshield-fastify'
import {torShieldFastifyPlugin} from '@raycas/torshield-fastify'

await app.register(
	torShieldFastifyPlugin as unknown as FastifyPluginAsync<TorFastifyOptions>,
	options,
)
```

## Related packages

| Package                                   | Role                |
| ----------------------------------------- | ------------------- |
| [`@raycas/torshield-core`](../core)       | Standalone detector |
| [`@raycas/torshield-express`](../express) | Express adapter     |
| [`@raycas/torshield-nestjs`](../nestjs)   | NestJS adapter      |

See the [monorepo README](../../README.md) for full docs.
