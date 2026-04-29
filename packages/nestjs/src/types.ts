import type {TorDetectorOptions} from '@torshield/core'
import type {ExecutionContext} from '@nestjs/common'

export type TorNestjsOptions = TorDetectorOptions & {
	onTorDetected?: (context: ExecutionContext) => boolean | Promise<boolean>
}
