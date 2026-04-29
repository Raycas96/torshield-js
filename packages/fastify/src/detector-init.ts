import {TorDetector} from '@torshield/core'
import type {TorFastifyOptions} from './types'

type DetectorContext = {
	detector: TorDetector
	startPromise: Promise<void>
	initialOptions: TorFastifyOptions
}

let detectorContext: DetectorContext | undefined
let activeConsumers = 0

export const initializeDetector = (options: TorFastifyOptions): DetectorContext => {
	if (detectorContext) {
		assertCompatibleOptions(detectorContext.initialOptions, options)
	} else {
		detectorContext = {
			detector: new TorDetector(options),
			startPromise: Promise.resolve(),
			initialOptions: options,
		}
	}

	if (activeConsumers === 0) {
		detectorContext.startPromise = detectorContext.detector.start()
	}

	activeConsumers += 1
	return detectorContext
}

export const releaseDetector = (): void => {
	if (activeConsumers === 0 || !detectorContext) {
		return
	}

	activeConsumers -= 1
	if (activeConsumers > 0) {
		return
	}

	detectorContext.detector.destroy()
	detectorContext = undefined
}

export const destroyDetector = (): void => {
	detectorContext?.detector.destroy()
	detectorContext = undefined
	activeConsumers = 0
}

const assertCompatibleOptions = (
	initialOptions: TorFastifyOptions,
	nextOptions: TorFastifyOptions,
): void => {
	if (
		initialOptions.statusCode !== nextOptions.statusCode ||
		initialOptions.message !== nextOptions.message ||
		initialOptions.onTorDetected !== nextOptions.onTorDetected
	) {
		throw new Error('Fastify detector options can only be set during first initialization')
	}
}
