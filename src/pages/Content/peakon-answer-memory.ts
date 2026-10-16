import {printLine, runOnDomChanges} from './modules'
import {mountPanel} from './peakon-panel'

const STORAGE_KEY = 'peakon_survey_answers'
const SCALE_ATTR = 'data-scale'
// Parks the button's own title while ours is on it, so clearing the highlight restores what Peakon
// had instead of blanking it.
const HIGHLIGHT_ATTR = 'data-pt-previous-answer'

export type HookKey = 'questionText' | 'answerButtons' | 'questionContainer' | 'scoreButton'

type HookSpec = {label: string; selector: string; essential: boolean}

// Peakon only renders the "change current score" control once a question has been answered, so a
// zero there is normal. Counting it towards the health badge would leave the panel permanently
// amber on a question you have not reached yet.
export const HOOKS: Record<HookKey, HookSpec> = {
  questionText: {label: 'Question text', selector: '#question-item-title', essential: true},
  answerButtons: {label: 'Answer buttons', selector: `button[${SCALE_ATTR}]`, essential: true},
  questionContainer: {
    label: 'Question container',
    selector: '[data-test-id="question-container"]',
    essential: true
  },
  scoreButton: {label: 'Change score', selector: 'button[data-test-id="score"]', essential: false}
}

export type HookProbe = HookSpec & {key: HookKey; found: number}

export type StoredAnswer = {question: string; score: string; savedAt: number}

export type SaveOutcome = 'saved' | 'unchanged' | 'failed'

export type SaveRecord = {score: string; outcome: SaveOutcome; at: number}

export type PanelState = {
  hooks: HookProbe[]
  question: string | null
  currentKey: string | null
  stored: StoredAnswer | null
  highlighted: boolean
  lastSave: SaveRecord | null
  answers: {key: string; answer: StoredAnswer}[]
}

export function probeHooks(): HookProbe[] {
  const keys = Object.keys(HOOKS) as HookKey[]
  return keys.map(key => ({key, ...HOOKS[key], found: document.querySelectorAll(HOOKS[key].selector).length}))
}

// Peakon rewords its questions between cycles, and keying on the exact string orphans the old
// answer the moment a comma moves. The key is the question flattened to its words.
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!:;,]+$/, '')
}

export function currentQuestion(): string | null {
  return document.querySelector(HOOKS.questionText.selector)?.textContent?.trim() || null
}

function answerButtons(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(HOOKS.answerButtons.selector))
}

function toStoredAnswer(storedKey: string, value: unknown): StoredAnswer | null {
  if (typeof value === 'string') return {question: storedKey, score: value, savedAt: 0}
  if (!value || typeof value !== 'object') return null

  const {question, score, savedAt} = value as Partial<StoredAnswer>
  if (typeof score !== 'string') return null

  return {question: typeof question === 'string' ? question : storedKey, score, savedAt: savedAt || 0}
}

// Answers used to be stored as a bare `question text -> score` map. Normalising on every read
// upgrades those entries in place, so nothing is lost between shipping this and the next save.
export function readAnswers(): Record<string, StoredAnswer> {
  let raw: unknown
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    raw = stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }

  if (!raw || typeof raw !== 'object') return {}

  const answers: Record<string, StoredAnswer> = {}
  for (const [storedKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const answer = toStoredAnswer(storedKey, value)
    if (answer) answers[questionKey(answer.question)] = answer
  }

  return answers
}

function writeAnswers(answers: Record<string, StoredAnswer>): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
    return true
  } catch {
    return false
  }
}

export function saveAnswer(question: string, score: string): SaveOutcome {
  const answers = readAnswers()
  const key = questionKey(question)
  if (answers[key]?.score === score) return 'unchanged'

  answers[key] = {question, score, savedAt: Date.now()}
  if (!writeAnswers(answers)) return 'failed'

  // Throwing is not the only way a write loses an answer — storage can accept the call and keep
  // the old value — so the outcome is whatever reading it back actually finds.
  return readAnswers()[key]?.score === score ? 'saved' : 'failed'
}

export function forgetAnswer(key: string): void {
  const answers = readAnswers()
  delete answers[key]
  writeAnswers(answers)
}

export function forgetAllAnswers(): void {
  writeAnswers({})
}

export function clearHighlight(): void {
  for (const button of Array.from(document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTR}]`))) {
    button.style.outline = ''
    button.style.outlineOffset = ''
    button.style.borderRadius = ''
    button.title = button.getAttribute(HIGHLIGHT_ATTR) || ''
    button.removeAttribute(HIGHLIGHT_ATTR)
  }
}

export function highlightStoredAnswer(score: string): boolean {
  clearHighlight()

  const button = answerButtons().find(candidate => candidate.getAttribute(SCALE_ATTR) === score)
  if (!button) return false

  button.setAttribute(HIGHLIGHT_ATTR, button.title)
  button.style.outline = '3px solid #4CAF50'
  button.style.outlineOffset = '2px'
  button.style.borderRadius = '4px'
  button.title = `Previous answer: ${score}`

  return true
}

export function wirePeakonAnswerMemory(): () => void {
  let lastSave: SaveRecord | null = null

  const panel = mountPanel({
    onForget: key => {
      forgetAnswer(key)
      refresh()
    },
    onForgetAll: () => {
      forgetAllAnswers()
      refresh()
    }
  })

  const observedButtons = new WeakSet<HTMLElement>()

  // Clicking a score is the obvious signal, but Peakon also flips `aria-pressed` when a score is
  // restored without a click of its own, so both feed the same recorder.
  const pressedObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const button = mutation.target as HTMLElement
      if (button.getAttribute('aria-pressed') !== 'true') continue

      const score = button.getAttribute(SCALE_ATTR)
      if (score) recordAnswer(score)
    }
  })

  function observePressedState(): void {
    for (const button of answerButtons()) {
      if (observedButtons.has(button)) continue

      observedButtons.add(button)
      pressedObserver.observe(button, {attributes: true, attributeFilter: ['aria-pressed']})
    }
  }

  function recordAnswer(score: string): void {
    const question = currentQuestion()
    if (!question) return

    const outcome = saveAnswer(question, score)
    lastSave = {score, outcome, at: Date.now()}
    printLine(`Peakon answer ${outcome}: "${question}" -> ${score}`)
    refresh()
  }

  function refresh(): void {
    const question = currentQuestion()
    const answers = readAnswers()
    const currentKey = question ? questionKey(question) : null
    const stored = (currentKey && answers[currentKey]) || null

    const highlighted = stored ? highlightStoredAnswer(stored.score) : false
    if (!stored) clearHighlight()

    panel.update({
      hooks: probeHooks(),
      question,
      currentKey,
      stored,
      highlighted,
      lastSave,
      answers: Object.entries(answers)
        .map(([key, answer]) => ({key, answer}))
        .sort((a, b) => b.answer.savedAt - a.answer.savedAt)
    })
  }

  const onClick = (event: Event) => {
    const button = (event.target as HTMLElement | null)?.closest?.(`[${SCALE_ATTR}]`)
    const score = button?.getAttribute(SCALE_ATTR)
    if (score) recordAnswer(score)
  }

  document.addEventListener('click', onClick, true)

  const stopWatching = runOnDomChanges(() => {
    observePressedState()
    refresh()
  })

  return () => {
    stopWatching()
    pressedObserver.disconnect()
    document.removeEventListener('click', onClick, true)
    clearHighlight()
    panel.destroy()
  }
}
