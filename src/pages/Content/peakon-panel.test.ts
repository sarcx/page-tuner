import type {HookProbe, PanelState} from './peakon-answer-memory'
import {health, mountPanel, renderPanel} from './peakon-panel'

function hook(key: string, found: number, essential = true): HookProbe {
  return {key, label: key, selector: `[${key}]`, essential, found} as HookProbe
}

function panelState(overrides: Partial<PanelState> = {}): PanelState {
  return {
    hooks: [hook('questionText', 1), hook('answerButtons', 11), hook('scoreButton', 0, false)],
    question: 'How happy are you at work?',
    currentKey: 'how happy are you at work',
    stored: {question: 'How happy are you at work?', score: '8', savedAt: Date.now()},
    highlighted: true,
    lastSave: null,
    answers: [
      {key: 'how happy are you at work', answer: {question: 'How happy are you at work?', score: '8', savedAt: 1}},
      {key: 'would you recommend us', answer: {question: 'Would you recommend us?', score: '9', savedAt: 2}}
    ],
    ...overrides
  }
}

function shadow(): ShadowRoot {
  return document.getElementById('pt-peakon-panel')!.shadowRoot!
}

function click(selector: string): void {
  shadow().querySelector<HTMLElement>(selector)!.dispatchEvent(new MouseEvent('click', {bubbles: true}))
}

describe('health', () => {
  it('is ok when every essential hook matches', () => {
    expect(health([hook('a', 1), hook('b', 3)])).toBe('ok')
  })

  it('is partial when some essential hooks match', () => {
    expect(health([hook('a', 1), hook('b', 0)])).toBe('partial')
  })

  it('is down when no essential hook matches', () => {
    expect(health([hook('a', 0), hook('b', 0)])).toBe('down')
  })

  it('stays ok when only a non-essential hook is missing', () => {
    expect(health([hook('a', 1), hook('b', 0, false)])).toBe('ok')
  })
})

describe('renderPanel', () => {
  it('shows the badge with the answer count when minimized', () => {
    const html = renderPanel(panelState(), true)

    expect(html).toContain('Answers 2')
    expect(html).toContain('data-action="expand"')
    expect(html).not.toContain('data-action="minimize"')
  })

  it('offers a minimize button when expanded', () => {
    expect(renderPanel(panelState(), false)).toContain('data-action="minimize"')
  })

  it('lists every hook with its live match count', () => {
    const html = renderPanel(panelState(), false)

    expect(html).toContain('[questionText]')
    expect(html).toContain('[answerButtons]')
  })

  it('says a question has never been answered rather than going quiet', () => {
    const html = renderPanel(panelState({stored: null, highlighted: false}), false)

    expect(html).toContain('Never answered before')
  })

  it('says so when the stored score matches no button', () => {
    const html = renderPanel(panelState({highlighted: false}), false)

    expect(html).toContain('No button matches that score')
  })

  it('calls out a failed write', () => {
    const html = renderPanel(panelState({lastSave: {score: '8', outcome: 'failed', at: Date.now()}}), false)

    expect(html).toContain('Last write failed')
  })

  it('marks the current question in the stored list', () => {
    const html = renderPanel(panelState(), false)

    expect(html).toContain('class="row now"')
  })

  it('escapes question text taken from the page', () => {
    const attack = '<img src=x onerror=alert(1)>'
    const html = renderPanel(panelState({question: attack, stored: null}), false)

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('reports an empty store', () => {
    expect(renderPanel(panelState({answers: []}), false)).toContain('Nothing stored yet')
  })
})

describe('mountPanel', () => {
  let panel: {update: (state: PanelState) => void; destroy: () => void}
  let onForget: jest.Mock
  let onForgetAll: jest.Mock

  beforeEach(() => {
    onForget = jest.fn()
    onForgetAll = jest.fn()
    panel = mountPanel({onForget, onForgetAll})
    panel.update(panelState())
  })

  afterEach(() => {
    panel.destroy()
    document.body.innerHTML = ''
  })

  it('starts minimized', () => {
    expect(shadow().querySelector('.badge')).not.toBeNull()
    expect(shadow().querySelector('.panel')).toBeNull()
  })

  it('expands when the badge is clicked', () => {
    click('[data-action="expand"]')

    expect(shadow().querySelector('.panel')).not.toBeNull()
  })

  it('minimizes again from the header button', () => {
    click('[data-action="expand"]')
    click('[data-action="minimize"]')

    expect(shadow().querySelector('.badge')).not.toBeNull()
    expect(shadow().querySelector('.panel')).toBeNull()
  })

  it('reports which answer to forget', () => {
    click('[data-action="expand"]')
    click('[data-action="forget"]')

    expect(onForget).toHaveBeenCalledWith('how happy are you at work')
  })

  it('reports a clear-all', () => {
    click('[data-action="expand"]')
    click('[data-action="forget-all"]')

    expect(onForgetAll).toHaveBeenCalledTimes(1)
  })

  it('stays minimized across state updates', () => {
    panel.update(panelState({answers: []}))

    expect(shadow().querySelector('.badge')).not.toBeNull()
  })

  it('leaves the markup alone when nothing changed', () => {
    const before = shadow().querySelector('.badge')

    panel.update(panelState())

    expect(shadow().querySelector('.badge')).toBe(before)
  })

  it('redraws when the state does change', () => {
    const before = shadow().querySelector('.badge')

    panel.update(panelState({answers: []}))

    expect(shadow().querySelector('.badge')).not.toBe(before)
  })

  it('replaces an earlier panel instead of stacking a second one', () => {
    const second = mountPanel({onForget, onForgetAll})

    expect(document.querySelectorAll('#pt-peakon-panel')).toHaveLength(1)

    second.destroy()
  })
})
