import {printLine} from './modules'

export function wireMarkFileAsViewed(): () => void {
  let currentHintBtn: HTMLButtonElement | null = null

  function setHint(viewedBtn: HTMLButtonElement | null) {
    if (viewedBtn === currentHintBtn) return

    if (currentHintBtn) {
      currentHintBtn.querySelector('.pt-shortcut-hint')?.remove()
      currentHintBtn = null
    }

    if (!viewedBtn) return

    currentHintBtn = viewedBtn

    const label = viewedBtn.querySelector('[data-component="text"]')
    if (label && !label.querySelector('.pt-shortcut-hint')) {
      const hint = document.createElement('span')
      hint.className = 'pt-shortcut-hint'
      hint.textContent = ' (shift+space)'
      hint.style.cssText = 'font-size:10px;opacity:0.6;font-weight:normal;'
      label.appendChild(hint)
    }
  }

  const onMouseOver = (e: MouseEvent) => {
    const diffFileContainer = (e.target as HTMLElement).closest('[id^="diff-"]')
    const viewedBtn = diffFileContainer?.querySelector<HTMLButtonElement>('button[aria-label="Not Viewed"]') ?? null
    setHint(viewedBtn)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.shiftKey || e.key !== ' ') return
    if (!currentHintBtn) return

    e.preventDefault()
    e.stopPropagation()
    currentHintBtn.click()
    printLine(`Marked file as viewed via Shift+Space`)
  }

  document.addEventListener('mouseover', onMouseOver)
  document.addEventListener('keydown', onKeyDown, true)

  return () => {
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('keydown', onKeyDown, true)
  }
}
