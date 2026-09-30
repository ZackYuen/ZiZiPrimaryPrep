/**
 * Kid-facing Cantonese (spoken HK) copy for speak/listen dictation.
 * Parents still use ★ 講完啦 as the always-available continue path.
 */

export type KidSttKind =
  | 'mic-permission'
  | 'service-blocked'
  | 'too-short'
  | 'no-speech'
  | 'empty'
  | 'network'
  | 'unavailable'
  | 'retrying'
  | 'listening'
  | 'transcribing'
  | 'generic'

export function kidSttMessage(kind: KidSttKind): string {
  switch (kind) {
    case 'mic-permission':
      return '未開到咪高峰。去設定允許麥克風，再撳 ●。'
    case 'service-blocked':
      return '呢部機網頁聽寫唔得。再撳 ● 試一次，或者撳 ★ 繼續。'
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

/** Map Web Speech `event.error` codes to kid copy + whether to retry. */
export function kidSttFromBrowserError(
  code: string,
  opts: { apple: boolean; micOk: boolean; restartCount: number },
): {
  kind: KidSttKind
  message: string
  retry: boolean
  block: boolean
} {
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
    const retry = opts.apple && opts.restartCount < 1
    return {
      kind: 'service-blocked',
      message: kidSttMessage(retry ? 'retrying' : 'service-blocked'),
      retry,
      block: !retry,
    }
  }

  if (code === 'not-allowed' || code === 'audio-capture') {
    if (opts.apple && opts.micOk && opts.restartCount < 1) {
      return {
        kind: 'service-blocked',
        message: kidSttMessage('retrying'),
        retry: true,
        block: false,
      }
    }
    if (opts.apple && opts.micOk) {
      return {
        kind: 'service-blocked',
        message: kidSttMessage('service-blocked'),
        retry: false,
        block: true,
      }
    }
    return {
      kind: 'mic-permission',
      message: kidSttMessage('mic-permission'),
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
export function kidSttFromThrown(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '')
  if (/AbortError|aborted/i.test(raw)) return ''
  if (/太短/.test(raw)) return kidSttMessage('too-short')
  if (/無字/.test(raw)) return kidSttMessage('empty')
  if (/麥克風|NotAllowedError|Permission|not allowed/i.test(raw)) {
    return kidSttMessage('mic-permission')
  }
  if (/Failed to fetch|NetworkError|network|offline/i.test(raw)) {
    return kidSttMessage('network')
  }
  if (/API key|PERMISSION_DENIED|403|401|UNAUTHENTICATED|invalid/i.test(raw)) {
    return kidSttMessage('unavailable')
  }
  if (/未設定 Google/.test(raw)) return kidSttMessage('unavailable')
  return kidSttMessage('generic')
}
