import type {DynamicModule, Provider} from '@nestjs/common'
import {APP_GUARD} from '@nestjs/core'
import type {TorDetector} from '@torshield/core'
import {initializeDetector} from './detector-init'
import {torDetectorToken} from './tokens'
import {TorGuard} from './tor.guard'
import type {TorNestjsOptions} from './types'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class, unicorn/no-static-only-class
export class TorModule {
	static forRoot(options: TorNestjsOptions = {}): DynamicModule {
		return {
			module: TorModule,
			global: true,
			providers: [
				createDetectorProvider(options),
				createGuardProvider(options),
				{
					provide: APP_GUARD,
					useExisting: TorGuard,
				},
			],
			exports: [torDetectorToken, TorGuard],
		}
	}

	static forFeature(options: TorNestjsOptions = {}): DynamicModule {
		return {
			module: TorModule,
			providers: [createDetectorProvider(options), createGuardProvider(options)],
			exports: [torDetectorToken, TorGuard],
		}
	}
}

function createDetectorProvider(options: TorNestjsOptions): Provider {
	return {
		provide: torDetectorToken,
		async useFactory() {
			const detectorContext = initializeDetector(options)
			await detectorContext.startPromise
			return detectorContext.detector
		},
	}
}

function createGuardProvider(options: TorNestjsOptions): Provider {
	return {
		provide: TorGuard,
		useFactory(detector: TorDetector) {
			return new TorGuard(detector, options.onTorDetected)
		},
		inject: [torDetectorToken],
	}
}
