/**
 * Minimal runtime shims for iPad Safari / iOS 10.3.x
 * Loaded before the app so Google STT + fetch abort still work.
 */
;(function ios10Shims() {
  if (typeof window === 'undefined') return

  // AbortController (Safari < 12.1 / iOS < 12.2)
  if (typeof (window as Window & { AbortController?: unknown }).AbortController === 'undefined') {
    function AbortSignalShim(this: {
      aborted: boolean
      reason: unknown
      onabort: ((ev: Event) => unknown) | null
    }) {
      this.aborted = false
      this.reason = undefined
      this.onabort = null
    }
    AbortSignalShim.prototype.throwIfAborted = function throwIfAborted() {
      if (this.aborted) throw this.reason || new Error('Aborted')
    }
    AbortSignalShim.prototype.addEventListener = function addEventListener() {}
    AbortSignalShim.prototype.removeEventListener = function removeEventListener() {}
    AbortSignalShim.prototype.dispatchEvent = function dispatchEvent() {
      return false
    }

    function AbortControllerShim(this: { signal: unknown }) {
      this.signal = new (AbortSignalShim as unknown as new () => unknown)()
    }
    AbortControllerShim.prototype.abort = function abort(reason?: unknown) {
      const s = this.signal as {
        aborted: boolean
        reason: unknown
        onabort: ((ev: Event) => unknown) | null
      }
      if (s.aborted) return
      s.aborted = true
      s.reason = reason
      if (typeof s.onabort === 'function') {
        try {
          s.onabort(new Event('abort'))
        } catch {
          /* ignore */
        }
      }
    }
    ;(window as unknown as { AbortController: unknown }).AbortController = AbortControllerShim
  }

  // Promise.finally
  if (typeof Promise !== 'undefined' && !(Promise.prototype as Promise<unknown> & { finally?: unknown }).finally) {
    ;(Promise.prototype as Promise<unknown> & { finally: unknown }).finally = function finallyPolyfill(
      this: Promise<unknown>,
      onFinally?: (() => void) | null,
    ) {
      return this.then(
        (value) => Promise.resolve(typeof onFinally === 'function' ? onFinally() : onFinally).then(() => value),
        (reason) =>
          Promise.resolve(typeof onFinally === 'function' ? onFinally() : onFinally).then(() => {
            throw reason
          }),
      )
    }
  }

  // Object.fromEntries
  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function fromEntries(entries: Iterable<readonly [PropertyKey, unknown]>) {
      const out: Record<string, unknown> = {}
      // Avoid for-of if needed — but Babel will transpile.
      const arr = Array.from(entries)
      for (let i = 0; i < arr.length; i++) {
        out[String(arr[i][0])] = arr[i][1]
      }
      return out
    }
  }

  // getUserMedia shim (iOS 10 often lacks navigator.mediaDevices)
  const nav = navigator as Navigator & {
    mediaDevices?: MediaDevices
    getUserMedia?: typeof navigator.mediaDevices.getUserMedia
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (err: Error) => void,
    ) => void
  }
  if (!nav.mediaDevices) {
    ;(nav as { mediaDevices: Partial<MediaDevices> }).mediaDevices = {}
  }
  if (typeof nav.mediaDevices.getUserMedia !== 'function') {
    nav.mediaDevices.getUserMedia = function getUserMedia(constraints: MediaStreamConstraints) {
      const legacy = nav.getUserMedia || nav.webkitGetUserMedia
      if (!legacy) {
        return Promise.reject(new Error('呢部 iPad 唔支援麥克風'))
      }
      return new Promise((resolve, reject) => {
        legacy.call(nav, constraints, resolve, reject)
      })
    }
  }
})()

export {}
