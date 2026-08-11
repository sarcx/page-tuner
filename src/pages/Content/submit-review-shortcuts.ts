import {printLine, sleep} from './modules'

const INJECTED_CLASS = 'pt-review-shortcut'
const POLL_INTERVAL_MS = 50
const WAIT_TIMEOUT_MS = 3000

type ReviewEvent = 'approve' | 'comment' | 'request changes'

export type ReviewShortcut = {
  key: string
  label: string
  title: string
  event: ReviewEvent
  body?: string
  style: string
}

const BUTTON_STYLE =
  'display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;margin-right:8px;' +
  'font-size:12px;font-weight:500;line-height:1;border-radius:6px;cursor:pointer;'

export const SHORTCUTS: ReviewShortcut[] = [
  {
    key: 'approve',
    label: 'Approve',
    title: 'Approve this pull request',
    event: 'approve',
    style:
      'background-color:var(--bgColor-success-emphasis,#1f883d);color:#ffffff;border:1px solid rgba(31,35,40,0.15);'
  },
  {
    key: 'eye',
    label: '👁',
    title: 'Submit a 👁 comment review',
    event: 'comment',
    body: '👁',
    style:
      'background-color:var(--button-default-bgColor-rest,#f6f8fa);color:var(--fgColor-default,#1f2328);' +
      'border:1px solid var(--button-default-borderColor-rest,#d0d7de);font-size:14px;'
  }
]

// A stuck toolbar can render its own copy of the review menu, so every match gets shortcuts —
// picking only the first leaves whichever toolbar the reader is actually looking at bare.
function findReviewMenuButtons(): HTMLButtonElement[] {
  const byModuleClass = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[class*="ReviewMenuButton-module__ReviewMenuButton"]')
  )
  if (byModuleClass.length) return byModuleClass

  const toolbars = Array.from(document.querySelectorAll('section[class*="PullRequestFilesToolbar-module__toolbar"]'))
  return toolbars.flatMap(toolbar =>
    Array.from(toolbar.querySelectorAll<HTMLButtonElement>('button')).filter(btn =>
      btn.textContent?.includes('Submit review')
    )
  )
}

function findReviewDialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('div[role="dialog"][aria-labelledby="anchored-review-title"]')
}

function findDialogSubmitButton(dialog: HTMLElement): HTMLButtonElement | null {
  const byModuleClass = dialog.querySelector<HTMLButtonElement>(
    'button[class*="ReviewMenuFooter-module__SubmitReviewButton"]'
  )
  if (byModuleClass) return byModuleClass

  const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.reverse().find(btn => btn.textContent?.includes('Submit review')) || null
}

async function waitFor<T>(find: () => T | null, timeoutMs: number): Promise<T | null> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const found = find()
    if (found) return found
    await sleep(POLL_INTERVAL_MS)
  }

  return find()
}

// GitHub's editor is a controlled React input, so assigning `.value` alone is silently discarded
// on the next render. Going through the prototype setter and replaying an input event is what
// makes React adopt the text — and keeps the Submit button from staying disabled.
function setEditorValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  if (valueSetter) {
    valueSetter.call(textarea, value)
  } else {
    textarea.value = value
  }
  textarea.dispatchEvent(new Event('input', {bubbles: true}))
}

export async function submitReview(shortcut: ReviewShortcut, timeoutMs = WAIT_TIMEOUT_MS): Promise<boolean> {
  const [menuButton] = findReviewMenuButtons()
  if (!menuButton) return false

  if (!findReviewDialog()) menuButton.click()

  const dialog = await waitFor(findReviewDialog, timeoutMs)
  if (!dialog) {
    printLine('Could not open the review dialog')
    return false
  }

  if (shortcut.body) {
    const textarea = await waitFor(() => dialog.querySelector<HTMLTextAreaElement>('textarea'), timeoutMs)
    if (!textarea) {
      printLine('Could not find the review comment editor')
      return false
    }
    setEditorValue(textarea, shortcut.body)
  }

  const radio = await waitFor(
    () => dialog.querySelector<HTMLInputElement>(`input[name="reviewEvent"][value="${shortcut.event}"]`),
    timeoutMs
  )
  if (!radio) {
    printLine(`Could not find the "${shortcut.event}" review event`)
    return false
  }
  if (!radio.checked) radio.click()

  const submitButton = await waitFor(() => {
    const button = findDialogSubmitButton(dialog)
    return button && !button.disabled ? button : null
  }, timeoutMs)

  if (!submitButton) {
    printLine(`Submit review stayed disabled for "${shortcut.event}"`)
    return false
  }

  submitButton.click()
  printLine(`Submitted review: ${shortcut.event}`)
  return true
}

function createShortcutButton(shortcut: ReviewShortcut): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${INJECTED_CLASS} ${INJECTED_CLASS}--${shortcut.key}`
  button.dataset.ptShortcut = shortcut.key
  button.textContent = shortcut.label
  button.title = shortcut.title
  button.setAttribute('aria-label', shortcut.title)
  button.style.cssText = BUTTON_STYLE + shortcut.style

  button.addEventListener('click', async e => {
    e.preventDefault()
    e.stopPropagation()
    if (button.disabled) return

    button.disabled = true
    button.style.opacity = '0.6'
    try {
      await submitReview(shortcut)
    } finally {
      button.disabled = false
      button.style.opacity = ''
    }
  })

  return button
}

export function injectSubmitReviewShortcuts(): void {
  for (const menuButton of findReviewMenuButtons()) {
    const container = menuButton.parentElement
    if (!container) continue
    if (container.querySelector(`.${INJECTED_CLASS}`)) continue

    for (const shortcut of SHORTCUTS) {
      menuButton.insertAdjacentElement('beforebegin', createShortcutButton(shortcut))
    }
  }
}

// The toolbar arrives long after the content script does, and React remounts it on every
// client-side navigation between the PR tabs — so the watched node has to be one that outlives
// all of that. Anchoring to a layout element instead leaves the observer attached to a detached
// node after the first navigation, which is why the shortcuts only sometimes showed up.
export function wireSubmitReviewShortcuts(): () => void {
  let frame = 0

  const scheduleInjection = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      injectSubmitReviewShortcuts()
    })
  }

  const observer = new MutationObserver(scheduleInjection)
  observer.observe(document.body, {childList: true, subtree: true})

  injectSubmitReviewShortcuts()

  return () => {
    observer.disconnect()
    if (frame) cancelAnimationFrame(frame)
  }
}
