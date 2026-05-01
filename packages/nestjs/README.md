# @raycas/torshield-nestjs

NestJS module + guard integration for Tor exit-node detection.

## Install

```bash
npm i @raycas/torshield-nestjs @nestjs/common @nestjs/core
```

## Usage

```ts
import {Module} from '@nestjs/common'
import {TorModule} from '@raycas/torshield-nestjs'

@Module({
	imports: [
		TorModule.forRoot({
			verbose: true,
			onTorDetected(context) {
				throw new Error(`Blocked tor request for ${context.getClass().name}`)
			},
		}),
	],
})
export class AppModule {}
```

## Options

`TorModule.forRoot(...)` and `TorModule.forFeature(...)` accept:

- Core `TorDetectorOptions` (`onRefresh`, `onError`, `verbose`)
- `onTorDetected?: (context: ExecutionContext) => boolean | Promise<boolean>`

When `onTorDetected` is provided, it fully overrides the default `ForbiddenException` behavior.

## Singleton behavior

- The underlying detector is initialized once and reused.
- Initialization options are locked on first initialization for the process lifecycle.
- Reinitializing with different options throws an error to avoid conflicting runtime behavior.
