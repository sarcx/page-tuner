import {copyText} from './clipboard'
import {printLine} from './modules'

const INJECTED_CLASS = 'pt-review-link'

type CommentTarget = {
  timestamp: HTMLAnchorElement
  getPath: () => string | null
}

function cleanText(el: Element | null | undefined): string | null {
  return el?.textContent?.replace(/\u200e/g, '').trim() || null
}

function withLine(path: string | null, line: string | null | undefined): string | null {
  if (!path) return null
  return line ? `${path}:${line}` : path
}

function getLineNumber(thread: Element): string | null {
  const cells = thread.querySelectorAll<HTMLElement>('td[data-line-number]')
  for (let i = cells.length - 1; i >= 0; i--) {
    const value = cells[i].getAttribute('data-line-number')
    if (value && /^\d+$/.test(value)) return value
  }

  const preview = thread.querySelector('.js-multi-line-preview-end, .js-multi-line-preview-start')
  return preview?.textContent?.replace(/\D/g, '') || null
}

function createLink(label: string, title: string, getValue: () => string | null): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `${INJECTED_CLASS} btn-link Link--secondary`
  btn.textContent = label
  btn.title = title
  btn.style.cssText = 'font-size:12px;margin-left:8px;cursor:pointer;'

  btn.addEventListener('click', async e => {
    e.preventDefault()
    e.stopPropagation()
    const value = getValue()
    if (!value) return

    await copyText(value)
    const original = btn.textContent
    btn.textContent = 'Copied!'
    printLine(`Copied: ${value}`)
    setTimeout(() => {
      btn.textContent = original
    }, 1200)
  })

  return btn
}

// Conversation tab and the classic Files tab: each thread is a <review-thread-collapsible> carrying
// the file link and a snippet of the diff it comments on.
function findCollapsibleThreadTargets(): CommentTarget[] {
  const timestamps = document.querySelectorAll<HTMLAnchorElement>('review-thread-collapsible a.js-timestamp')

  return Array.from(timestamps).flatMap(timestamp => {
    const thread = timestamp.closest('review-thread-collapsible')
    if (!thread) return []

    return [
      {
        timestamp,
        getPath: () => withLine(cleanText(thread.querySelector('a.text-mono')), getLineNumber(thread))
      }
    ]
  })
}

// The React Changes tab: threads render inside the diff row they comment on, so the line number
// comes from that row's cell and the path from the diff's file heading. Class names there are
// hashed per build, which is why only test ids, roles and tag names are matched.
function findInlineThreadTargets(): CommentTarget[] {
  const times = document.querySelectorAll('[data-testid="review-thread"] [data-testid="comment-header"] relative-time')

  return Array.from(times).flatMap(time => {
    const timestamp = time.closest('a')
    if (!timestamp) return []

    return [
      {
        timestamp,
        getPath: () =>
          withLine(
            cleanText(timestamp.closest('[role="region"]')?.querySelector('h3 code')),
            timestamp.closest<HTMLElement>('td[data-line-number]')?.dataset.lineNumber
          )
      }
    ]
  })
}

export function injectReviewLinks(): void {
  for (const {timestamp, getPath} of [...findCollapsibleThreadTargets(), ...findInlineThreadTargets()]) {
    const container = timestamp.parentElement
    if (!container) continue
    if (container.querySelector(`.${INJECTED_CLASS}`)) continue

    const commentLink = createLink('copy comment link', 'Copy link to this comment', () => timestamp.href)
    const pathLink = createLink('copy path', 'Copy file path with line number', getPath)

    timestamp.insertAdjacentElement('afterend', pathLink)
    timestamp.insertAdjacentElement('afterend', commentLink)
  }
}
