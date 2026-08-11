import {copyText} from './clipboard'
import {printLine} from './modules'

const INJECTED_CLASS = 'pt-review-link'

function getFilePath(thread: Element): string | null {
  const link = thread.querySelector('a.text-mono')
  return link?.textContent?.replace(/\u200e/g, '').trim() || null
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

export function injectReviewLinks(): void {
  const timestamps = document.querySelectorAll<HTMLAnchorElement>('review-thread-collapsible a.js-timestamp')

  for (const timestamp of Array.from(timestamps)) {
    const container = timestamp.parentElement
    if (!container) continue
    if (container.querySelector(`.${INJECTED_CLASS}`)) continue

    const thread = timestamp.closest('review-thread-collapsible')
    if (!thread) continue

    const commentLink = createLink('copy comment link', 'Copy link to this comment', () => timestamp.href)
    const pathLink = createLink('copy path', 'Copy file path with line number', () => {
      const path = getFilePath(thread)
      if (!path) return null
      const line = getLineNumber(thread)
      return line ? `${path}:${line}` : path
    })

    timestamp.insertAdjacentElement('afterend', pathLink)
    timestamp.insertAdjacentElement('afterend', commentLink)
  }
}
