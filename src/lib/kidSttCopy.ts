/**
 * Kid-facing Cantonese (spoken HK) copy for speak/listen dictation.
 * Parents still use ★ 講完啦 as the always-available continue path.
 */

export type KidSttKind =
  | 'mic-permission'
  | 'service-blocked'
  | 'google-fail'
  | 'too-short'
  | 'no-speech'
  | 'empty'
  | 'network'
  | 'unavailable'
  | 'retrying'
  | 'listening'
  | 'transcribing'
  | 'generic'

export type KidSttMapped = {
  kind: KidSttKind
  message: string
  retry: boolean
  block: boolean
  /** Safari Web Speech died; switch to Google PCM instead of showing 網頁聽寫唔得. */
  handoffGoogle?: boolean
}

export function thrownErrorName(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    return String((err as { name: unknown }).name || '')
  }
  return ''
}

export function thrownErrorText(err: unknown): string {
  if (err instanceof Error) return `${err.name} ${err.message}`
  return String(err || '')
}

/** Real mic / permission failures — not Google referrer "are not allowed". */
export function isMicPermissionError(err: unknown): boolean {
  const name = thrownErrorName(err)
  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError' ||
    name === 'NotFoundError'
  ) {
    return true
  }
  const raw = thrownErrorText(err)
  if (/referer|referrer|API[_ ]?key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(raw)) {
    return false
  }
  return /麥克風|NotAllowedError|PermissionDenied|permission denied|User denied/i.test(raw)
}

export function kidSttMessage(kind: KidSttKind): string {
  switch (kind) {
    case 'mic-permission':
      return '未開到咪高峰。去設定允許麥克風，再撳 ●。'
    case 'service-blocked':
      return '呢部機網頁聽寫唔得。再撳 ● 試一次，或者撳 ★ 繼續。'
    case 'google-fail':
      return '雲端聽寫連接唔到。再撳 ● 試一次，或者撳 ★ 繼續。'
    case 'too-short':
      return '太短喇——再撳 ●，大聲講長啲。'
    case 'no-speech':
      return '聽唔到聲。靠近咪高峰，大聲講，再撳 ●。'
    case 'empty':
      return '聽唔到字。大聲講一次，再撳 ●，或者撳 ★ 繼續。'
    case 'network':
      return '網絡唔穩——再撳 ● 試一次，或者撳 ★ 繼續。'
    case 'unavailable':
      return '聽寫未開好。撳 ★ 繼續，或者再撳 ●。'
    case 'retrying':
      return '重試中…'
    case 'listening':
      return '聽緊… 講完撳 ■'
    case 'transcribing':
      return '轉文字中…'
    default:
      return '聽寫唔得。再撳 ● 試一次，或者撳 ★ 繼續。'
  }
}

/** Map Web Speech `event.error` codes to kid copy + whether to retry / hand off. */
export function kidSttFromBrowserError(
  code: string,
  opts: { apple: boolean; micOk: boolean; restartCount: number; googleReady?: boolean },
): KidSttMapped {
  if (code === 'no-speech') {
    return { kind: 'no-speech', message: '', retry: true, block: false }
  }

  if (code === 'network' || code === 'language-not-supported') {
    return {
      kind: 'network',
      message: kidSttMessage('network'),
      retry: true,
      block: false,
    }
  }

  if (code === 'service-not-allowed') {
    if (opts.googleReady) {
      return {
        kind: 'google-fail',
        message: '',
        retry: false,
        block: false,
        handoffGoogle: true,
      }
    }
    const retry = opts.apple && opts.restartCount < 1
    return {
      kind: 'service-blocked',
      message: kidSttMessage(retry ? 'retrying' : 'service-blocked'),
      retry,
      block: !retry,
    }
  }

  if (code === 'not-allowed' || code === 'audio-capture') {
    if (!opts.micOk) {
      return {
        kind: 'mic-permission',
        message: kidSttMessage('mic-permission'),
        retry: false,
        block: true,
      }
    }
    if (opts.googleReady) {
      return {
        kind: 'google-fail',
        message: '',
        retry: false,
        block: false,
        handoffGoogle: true,
      }
    }
    if (opts.apple && opts.restartCount < 1) {
      return {
        kind: 'service-blocked',
        message: kidSttMessage('retrying'),
        retry: true,
        block: false,
      }
    }
    return {
      kind: 'service-blocked',
      message: kidSttMessage('service-blocked'),
      retry: false,
      block: true,
    }
  }

  return {
    kind: 'generic',
    message: kidSttMessage('generic'),
    retry: false,
    block: true,
  }
}

/** Wrap Google / fetch / mic errors so kids never see API dumps. */
export function kidSttFromThrown(err: unknown, opts?: { google?: boolean }): string {
  const name = thrownErrorName(err)
  const raw = thrownErrorText(err)
  if (name === 'AbortError' || /AbortError|\baborted\b/i.test(raw)) return ''
  if (/太短/.test(raw)) return kidSttMessage('too-short')
  if (/無字/.test(raw)) return kidSttMessage('empty')
  // Referrer / API key before "not allowed" — Google says "referer … are not allowed".
  if (
    /referer|referrer|API[_ ]?key|PERMISSION_DENIED|UNAUTHENTICATED|401|403|API_KEY/i.test(raw) ||
    /未設定 Google/.test(raw)
  ) {
    return kidSttMessage(opts?.google ? 'google-fail' : 'unavailable')
  }
  if (isMicPermissionError(err)) {
    return kidSttMessage('mic-permission')
  }
  if (/Failed to fetch|NetworkError|network|offline|Load failed/i.test(raw)) {
    return kidSttMessage('network')
  }
  if (opts?.google) return kidSttMessage('google-fail')
  return kidSttMessage('generic')
}
