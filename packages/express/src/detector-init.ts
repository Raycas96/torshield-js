import {TorDetector} from '@torshield/core'
import type {TorExitNodeMiddlewareOptions} from './types'

type DetectorContext = {
	detector: TorDetector
	detectorOptions: TorExitNodeMiddlewareOptions
}

let detectorContext: DetectorContext | undefined
let hasStartedDetector = false

export const initializeDetector = (options: TorExitNodeMiddlewareOptions): DetectorContext => {
	detectorContext ??= {
		detector: new TorDetector(options),
		detectorOptions: options,
	}

	if (!hasStartedDetector) {
		hasStartedDetector = true
		void detectorContext.detector.start()
	}

	return detectorContext
}

export const getDetector = (): DetectorContext => {
	if (!detectorContext) {
		throw new Error('Detector not initialized')
	}

	return detectorContext
}

export function destroyDetector(): void {
	detectorContext = undefined
	hasStartedDetector = false
}
