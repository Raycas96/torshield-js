import {TorDetector} from '@raycas/torshield-core'
import type {TorNestjsOptions} from './types'

type DetectorContext = {
	detector: TorDetector
	startPromise: Promise<void>
	initialOptions: TorNestjsOptions
}

let detectorContext: DetectorContext | undefined

export function initializeDetector(options: TorNestjsOptions): DetectorContext {
	if (detectorContext) {
		assertCompatibleOptions(detectorContext.initialOptions, options)
		return detectorContext
	}

	const detector = new TorDetector(options)
	detectorContext = {
		detector,
		startPromise: detector.start(),
		initialOptions: options,
	}

	return detectorContext
}

export function destroyDetector(): void {
	detectorContext?.detector.destroy()
	detectorContext = undefined
}

function assertCompatibleOptions(
	initialOptions: TorNestjsOptions,
	nextOptions: TorNestjsOptions,
): void {
	if (
		initialOptions.onRefresh !== nextOptions.onRefresh ||
		initialOptions.onError !== nextOptions.onError ||
		initialOptions.onTorDetected !== nextOptions.onTorDetected
	) {
		throw new Error('NestJS detector options can only be set during first initialization')
	}
}
