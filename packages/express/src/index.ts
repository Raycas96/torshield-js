import { TorDetector, type TorDetectorOptions } from '@torshield/core'
import type { NextFunction, Request, Response } from 'express'

export type TorExitNodeMiddlewareOptions = {
  statusCode?: number
  message?: string
} & TorDetectorOptions

export function blockTorExitNodesMiddleware(_options: TorExitNodeMiddlewareOptions = {}) {
  // Placeholder: package will be implemented per AGENTS.md contracts.
  const detector = new TorDetector(_options)
  void detector

  return (_request: Request, response: Response, next: NextFunction) => {
    next()
  }
}
