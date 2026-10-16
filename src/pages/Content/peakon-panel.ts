import type {HookProbe, PanelState, SaveRecord} from './peakon-answer-memory'

const HOST_ID = 'pt-peakon-panel'

export type Health = 'ok' | 'partial' | 'down'

export type PanelActions = {
  onForget: (key: string) => void
  onForgetAll: () => void
}

export type PanelHandle = {
  update: (state: PanelState) => void
  destroy: () => void
}

export function health(hooks: HookProbe[]): Health {
  const essential = hooks.filter(hook => hook.essential)
  const matched = essential.filter(hook => hook.found > 0)

  if (matched.length === essential.length) return 'ok'
  return matched.length === 0 ? 'down' : 'partial'
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

// Everything in the panel is read off Peakon's own page, so it all goes through here before it
// reaches innerHTML.
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, character => ESCAPES[character])
}

function timeAgo(at: number, now: number): string {
  if (!at) return 'earlier'

  const seconds = Math.round((now - at) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`

  return `${Math.round(hours / 24)} d ago`
}

function hookRow(hook: HookProbe): string {
  const tick = hook.found
    ? {className: 'yes', mark: '&check;'}
    : hook.essential
      ? {className: 'no', mark: '&times;'}
      : {className: 'idle', mark: '&ndash;'}

  return `<div class="hook">
    <span class="tick ${tick.className}">${tick.mark}</span>
    <span class="sel" title="${escapeHtml(hook.label)}">${escapeHtml(hook.selector)}</span>
    <span class="n">${hook.found}</span>
  </div>`
}

function saveNote(lastSave: SaveRecord | null, now: number): string {
  if (!lastSave) return ''

  if (lastSave.outcome === 'failed') {
    return `<div class="note bad">Last write failed — ${escapeHtml(lastSave.score)} was not stored.</div>`
  }

  return `<div class="note">Last write ${lastSave.outcome}: ${escapeHtml(lastSave.score)}, ${timeAgo(lastSave.at, now)}.</div>`
}

function questionSection(state: PanelState, now: number): string {
  if (!state.question) {
    return `<div class="sec"><div class="label">This question</div>
      <div class="empty">No question on screen.</div></div>`
  }

  const heading = `<div class="row"><span class="q">${escapeHtml(state.question)}</span>${
    state.stored ? `<span class="score">${escapeHtml(state.stored.score)}</span>` : ''
  }</div>`

  const note = state.stored
    ? `<div class="note">${
        state.highlighted ? 'Outline drawn' : 'No button matches that score'
      } &middot; saved ${timeAgo(state.stored.savedAt, now)}.</div>`
    : '<div class="note">Never answered before, so there is nothing to show.</div>'

  return `<div class="sec"><div class="label">This question</div>${heading}${note}${saveNote(state.lastSave, now)}</div>`
}

function answersSection(state: PanelState): string {
  if (!state.answers.length) {
    return `<div class="sec"><div class="label">Stored answers</div>
      <div class="empty">Nothing stored yet.</div></div>`
  }

  const rows = state.answers
    .map(
      ({key, answer}) => `<div class="row ${key === state.currentKey ? 'now' : ''}">
        <span class="q" title="${escapeHtml(answer.question)}">${escapeHtml(answer.question)}</span>
        <span class="score">${escapeHtml(answer.score)}</span>
        <button class="x" type="button" data-action="forget" data-key="${escapeHtml(key)}"
          title="Forget this answer" aria-label="Forget this answer">&times;</button>
      </div>`
    )
    .join('')

  return `<div class="sec"><div class="label">Stored answers</div>${rows}
    <button class="clear" type="button" data-action="forget-all">Clear all</button></div>`
}

export function renderPanel(state: PanelState, minimized: boolean, now = Date.now()): string {
  const status = health(state.hooks)

  if (minimized) {
    return `<button class="badge" type="button" data-action="expand" title="Peakon answer memory">
      <span class="dot ${status}"></span> Answers ${state.answers.length}
    </button>`
  }

  return `<section class="panel">
    <header>
      <span class="dot ${status}"></span>
      <span class="name">Peakon answer memory</span>
      <span class="count">${state.answers.length} stored</span>
      <button class="icon" type="button" data-action="minimize" title="Minimize" aria-label="Minimize">&minus;</button>
    </header>
    <div class="sec"><div class="label">Hooks</div>${state.hooks.map(hookRow).join('')}</div>
    ${questionSection(state, now)}
    ${answersSection(state)}
  </section>`
}

const PANEL_CSS = `<style>
  :host {
    all: initial;
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px; line-height: 1.45;
    --bg: #ffffff; --bg2: #f1f3f7; --fg: #1b2029; --muted: #5e6878; --line: #d9dfe8;
    --ok: #1d7a4c; --warn: #9d6500; --bad: #b22f2c; --accent: #4654cf; --accent-bg: #e8eafb;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #1a1e26; --bg2: #232833; --fg: #e3e8f0; --muted: #98a3b4; --line: #2f3744;
      --ok: #5fd29a; --warn: #e0ab4f; --bad: #f0908b; --accent: #8f99f2; --accent-bg: #242b4b;
    }
  }
  * { box-sizing: border-box; margin: 0; }
  button { font: inherit; cursor: pointer; }
  .badge {
    display: flex; align-items: center; gap: 8px; padding: 7px 14px;
    background: var(--bg); color: var(--fg); border: 1px solid var(--line);
    border-radius: 999px; font-weight: 600; box-shadow: 0 2px 14px rgba(0, 0, 0, .18);
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .dot.ok { background: var(--ok); }
  .dot.partial { background: var(--warn); }
  .dot.down { background: var(--bad); }
  .panel {
    width: 330px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow: auto;
    background: var(--bg); color: var(--fg); border: 1px solid var(--line);
    border-radius: 10px; box-shadow: 0 4px 24px rgba(0, 0, 0, .22);
  }
  header {
    display: flex; align-items: center; gap: 8px; padding: 9px 11px;
    background: var(--bg2); border-bottom: 1px solid var(--line);
    font-weight: 600; position: sticky; top: 0;
  }
  .name, .sel, .q { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { color: var(--muted); font-weight: 400; font-size: 11.5px; flex: none; }
  .icon {
    width: 21px; height: 21px; flex: none; display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 5px;
    background: var(--bg); color: var(--muted); font-size: 14px; line-height: 1;
  }
  .sec { padding: 9px 11px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; }
  .sec:last-child { border-bottom: 0; }
  .label { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
  .hook { display: flex; align-items: center; gap: 7px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
  .tick { font-weight: 700; flex: none; }
  .tick.yes { color: var(--ok); }
  .tick.no { color: var(--bad); }
  .tick.idle { color: var(--muted); }
  .n { color: var(--muted); flex: none; }
  .row { display: flex; align-items: baseline; gap: 8px; }
  .row.now { background: var(--accent-bg); margin: 0 -11px; padding: 3px 11px; }
  .score {
    flex: none; font-family: ui-monospace, Menlo, monospace; font-weight: 600; font-size: 11.5px;
    background: var(--accent-bg); color: var(--accent); border-radius: 4px; padding: 1px 7px;
  }
  .row.now .score { background: var(--ok); color: var(--bg); }
  .x { flex: none; border: 0; background: none; color: var(--muted); padding: 0 2px; font-size: 14px; line-height: 1; }
  .note { color: var(--muted); font-size: 11.5px; }
  .note.bad { color: var(--bad); font-weight: 600; }
  .empty { color: var(--muted); font-style: italic; font-size: 12px; }
  .clear {
    align-self: flex-start; margin-top: 3px; padding: 2px 8px; font-size: 11px;
    background: none; border: 1px solid var(--line); border-radius: 5px; color: var(--muted);
  }
</style>`

export function mountPanel(actions: PanelActions): PanelHandle {
  document.getElementById(HOST_ID)?.remove()

  const host = document.createElement('div')
  host.id = HOST_ID
  const root = host.attachShadow({mode: 'open'})
  document.body.appendChild(host)

  // It opens minimized every time and deliberately remembers nothing. A diagnostic that reopens
  // itself in front of the question it is diagnosing is worse than one you have to click.
  let minimized = true
  let state: PanelState | null = null
  let drawn = ''

  // The rule refreshes on every throttled DOM tick, and Peakon's own animations keep that ticking.
  // Rebuilding the markup each time would reset the scroll position of the answer list under the
  // reader's cursor, so an unchanged render is left alone.
  function draw(): void {
    if (!state) return

    const html = PANEL_CSS + renderPanel(state, minimized)
    if (html === drawn) return

    drawn = html
    root.innerHTML = html
  }

  root.addEventListener('click', event => {
    const trigger = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-action]')
    if (!trigger) return

    const {action, key} = trigger.dataset
    if (action === 'expand') minimized = false
    else if (action === 'minimize') minimized = true
    else if (action === 'forget' && key) actions.onForget(key)
    else if (action === 'forget-all') actions.onForgetAll()

    draw()
  })

  return {
    update: next => {
      state = next
      draw()
    },
    destroy: () => host.remove()
  }
}
