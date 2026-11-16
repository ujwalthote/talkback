import type { Register } from 'claude-code'

// Speaks each finished turn through helper/speak.py (Gemini Live, local speakers).
// Input is Claude Code's /voice. Settings persist in $.store across sessions.

const VOICES: Record<string, string> = {
  // women
  aoede: 'Aoede', kore: 'Kore', leda: 'Leda', zephyr: 'Zephyr', callirrhoe: 'Callirrhoe', sulafat: 'Sulafat',
  // men
  puck: 'Puck', charon: 'Charon', fenrir: 'Fenrir', orus: 'Orus', enceladus: 'Enceladus', algieba: 'Algieba',
}
const WOMEN = ['aoede', 'kore', 'leda', 'zephyr', 'callirrhoe', 'sulafat']
const MEN = ['puck', 'charon', 'fenrir', 'orus', 'enceladus', 'algieba']

const STYLES: Record<string, string> = {
  default: '',
  calm: 'in a calm, soothing, unhurried manner',
  cheerful: 'in a bright, upbeat, friendly manner',
  serious: 'in a serious, professional, matter-of-fact manner',
  storyteller: 'like a warm storyteller, with gentle expression',
  pirate: 'like a gruff old pirate',
  robot: 'like a flat, precise robot',
  coach: 'like an energetic, encouraging coach',
}

const HELP = [
  '/assistant              toggle spoken replies',
  '/assistant on | off | stop',
  '/assistant voices       list voices',
  '/assistant voice <name> or  woman | man',
  '/assistant styles       list characters',
  '/assistant style <name>',
].join('\n')

export const register: Register = on => {
  let isOn = true
  let speaking: { return?: () => unknown } | undefined

  const stop = () => {
    try { void speaking?.return?.() } catch {}
    speaking = undefined
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'assistant',
      description: 'Spoken replies: on/off, voice, style (try /assistant help)',
    })
    return next(e)
  })

  on('command.run', { command: 'assistant' }, async ($, e) => {
    const [cmd = '', ...rest] = e.args.trim().toLowerCase().split(/\s+/)
    const arg = rest.join(' ')

    if (cmd === 'help') return { text: HELP }
    if (cmd === 'stop') { stop(); return { text: 'Stopped speaking.' } }
    if (cmd === 'voices') {
      return { text: `Women: ${WOMEN.join(', ')}\nMen: ${MEN.join(', ')}\nUse /assistant voice <name>` }
    }
    if (cmd === 'styles') {
      return { text: `Styles: ${Object.keys(STYLES).join(', ')}\nUse /assistant style <name>` }
    }
    if (cmd === 'voice') {
      const pick = arg === 'woman' ? 'aoede' : arg === 'man' ? 'puck' : arg
      if (!VOICES[pick]) return { text: `Unknown voice "${arg}". Try /assistant voices` }
      await $.store.set('voice', VOICES[pick])
      return { text: `Voice set to ${VOICES[pick]}. It applies to the next reply.` }
    }
    if (cmd === 'style') {
      if (!(arg in STYLES)) return { text: `Unknown style "${arg}". Try /assistant styles` }
      await $.store.set('style', arg)
      return { text: `Style set to ${arg}. It applies to the next reply.` }
    }

    isOn = cmd === 'on' ? true : cmd === 'off' ? false : !isOn
    if (!isOn) stop()
    return { text: `Spoken replies are ${isOn ? 'on' : 'off'}.` }
  })

  // A new prompt cuts off whatever is still being said.
  on('prompt.submit', async ($, e, next) => { stop(); return next(e) })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (!isOn || e.agentId || e.reason !== 'answer' || !e.answer.trim()) return done
    stop()

    const voice = (await $.store.get('voice')) as string | undefined
    const style = (await $.store.get('style')) as string | undefined
    const env: Record<string, string> = {}
    if (voice) env.VOICE = voice
    if (style && STYLES[style]) env.STYLE = STYLES[style]

    const run = $.process.spawn({
      argv: ['python', `${$.plugin.root}/helper/speak.py`],
      input: e.answer.slice(0, 4000),
      env,
    })
    speaking = run as unknown as { return?: () => unknown }
    void (async () => {
      try {
        for await (const c of run) {
          const t = c as { stream?: string; text?: string }
          if (t.stream === 'stderr' && t.text) $.ui.log(`talkback: ${t.text.trim()}`, { to: 'debug' })
        }
      } catch (err) {
        $.ui.toast(`talkback: ${String(err).slice(0, 120)}`)
      }
    })()
    return done
  })
}
