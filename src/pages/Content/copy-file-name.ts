import {printLine} from './modules'

const INJECTED_CLASS = 'pt-copy-file-name-btn'

const COPY_ICON =
  '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>'

const CHECK_ICON =
  '<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>'

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}

function createCopyButton(fileName: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `${INJECTED_CLASS} Button Button--iconOnly Button--invisible Button--small flex-shrink-0`
  btn.setAttribute('aria-label', `Copy file name: ${fileName}`)
  btn.title = 'Copy file name'
  btn.innerHTML = COPY_ICON

  btn.addEventListener('click', async e => {
    e.preventDefault()
    e.stopPropagation()
    await copyText(fileName)
    btn.innerHTML = CHECK_ICON
    btn.title = 'Copied!'
    printLine(`Copied file name: ${fileName}`)
    setTimeout(() => {
      btn.innerHTML = COPY_ICON
      btn.title = 'Copy file name'
    }, 1200)
  })

  return btn
}

export function injectCopyFileNameButtons(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('review-thread-collapsible a.text-mono')

  for (const link of Array.from(links)) {
    const container = link.parentElement
    if (!container) continue
    if (container.querySelector(`.${INJECTED_CLASS}`)) continue

    const fileName = link.textContent?.replace(/\u200e/g, '').trim() || ''
    if (!fileName) continue

    link.insertAdjacentElement('afterend', createCopyButton(fileName))
  }
}
