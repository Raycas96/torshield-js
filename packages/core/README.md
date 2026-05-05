# @raycas/torshield-core

Framework-agnostic Tor exit-node detector: multi-source fetch, in-memory `Set` lookup, background refresh (~24 h).

<p align="center">
  <img alt="Runtime deps" src="https://img.shields.io/badge/runtime%20deps-0-success.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6.svg" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
</p>

## Install

```bash
npm i @raycas/torshield-core
```

(No runtime npm dependencies.)

## Usage

```ts
import {TorDetector} from '@raycas/torshield-core'

const detector = new TorDetector({
	verbose: true,
	onRefresh(count) {
		console.log(`${count} Tor exit nodes loaded`)
	},
	onError(error) {
		console.error('[TorShield] Refresh failed:', error)
	},
})

await detector.start()

console.log(detector.isTorNode('1.2.3.4'), detector.torExitNodesCount)

detector.destroy()
```

## API (high level)

- `new TorDetector(options?)` — optional `onRefresh`, `onError`, `verbose`.
- `start()` — initial refresh then a 24 h timer (`unref()` so it does not keep the process alive by itself).
- `refresh()` — manual refresh (still fail-safe via `onError`).
- `isTorNode(ip)` — trims input, maps `::ffff:` IPv4-mapped IPv6, membership check against the store.
- `torExitNodesCount` — current size of the in-memory set.
- `destroy()` — clears stored IPs and clears the timer.

Fetched lists are merged from several public Tor exit feeds with per-request timeouts (`Promise.allSettled` semantics).

## Related packages

For HTTP integrations, prefer the adapters (they bundle this core and enforce singleton detector lifecycle):

| Package                                   | Role                          |
| ----------------------------------------- | ----------------------------- |
| [`@raycas/torshield-express`](../express) | Express middleware            |
| [`@raycas/torshield-fastify`](../fastify) | Fastify plugin                |
| [`@raycas/torshield-nestjs`](../nestjs)   | NestJS guard + dynamic module |

The [monorepo README](../../README.md) has architecture notes and troubleshooting.
