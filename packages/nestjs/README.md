# @raycas/torshield-nestjs

NestJS **dynamic module** + **`CanActivate` guard** for Tor exit-node blocking, backed by **`@raycas/torshield-core`** (singleton detector per process).

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-10%2B-E0234E.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6.svg" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
</p>

## Requirements

- Node **≥ 20**
- **`@nestjs/common`** and **`@nestjs/core`** (peer dependencies)

## Install

```bash
npm i @raycas/torshield-nestjs @nestjs/common @nestjs/core
```

## Quick start (`forRoot`)

Registers a **global guard** so all HTTP routes pass through Tor checks unless you opt out elsewhere.

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

## Scoped guard (`forFeature`)

`forFeature` does **not** register a global guard. Import the module where you need the detector + guard, then opt in with **`@UseGuards(TorGuard)`** (see [Nest guards](https://docs.nestjs.com/guards)).

```ts
import {Controller, Get, Module, UseGuards} from '@nestjs/common'
import {TorGuard, TorModule} from '@raycas/torshield-nestjs'

@Module({
	imports: [TorModule.forFeature()],
	controllers: [PingController],
})
export class FeatureModule {}

@Controller()
@UseGuards(TorGuard)
export class PingController {
	@Get('health')
	health() {
		return {ok: true}
	}
}
```

### Injecting the detector

```ts
import {Inject} from '@nestjs/common'
import {torDetectorToken} from '@raycas/torshield-nestjs'
import type {TorDetector} from '@raycas/torshield-core'

constructor(@Inject(torDetectorToken) private readonly tor: TorDetector) {}
```

## Options

**`TorModule.forRoot(options?)`** / **`forFeature(options?)`** accept:

| Field                             | Meaning                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `onRefresh`, `onError`, `verbose` | Passed to **`TorDetector`** (`@raycas/torshield-core`)                                                            |
| `onTorDetected?(context)`         | When set, **replaces** the default `ForbiddenException`; return `false`/`Promise<false>` to deny, `true` to allow |

## Client IP (`X-Forwarded-For`)

**`TorGuard`** reads **`x-forwarded-for`** (left-most entry) then falls back to **`socket.remoteAddress`**, mirroring the Express adapter semantics.

Behind a reverse proxy:

- **Express** (default Nest HTTP platform): enable **`app.set('trust proxy', true)`** (or equivalent) so your stack matches how headers are set.
- **Fastify** adapter: enable Fastify **`trustProxy`** when creating the Nest Fastify adapter / underlying instance.

Otherwise you may see proxy IPs instead of clients.

## Singleton behavior

- First successful initialization locks detector options for the process.
- A second **`forRoot`** / **`forFeature`** with incompatible options fails fast to avoid split-brain detectors.

## Related packages

| Package                                   | Role                                   |
| ----------------------------------------- | -------------------------------------- |
| [`@raycas/torshield-core`](../core)       | Standalone detector                    |
| [`@raycas/torshield-express`](../express) | Express middleware (same IP semantics) |
| [`@raycas/torshield-fastify`](../fastify) | Fastify plugin                         |

Monorepo overview: [**README**](../../README.md).
