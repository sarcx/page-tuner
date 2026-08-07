import {printLine} from './modules'

const VIEWPORT_TOP_OFFSET = 100
const POINTER_KEY = 'pt-cursor'
const POINTER_SAVE_INTERVAL_MS = 250

type Pointer = {x: number; y: number}

// A fresh page knows nothing about the cursor until the mouse moves — not even `:hover` is
// computed — yet the cursor is still physically where it was on the page before. Carrying the
// last position through sessionStorage gives keyboard-only scrolling something to aim at from
// the first keystroke, and the first real mouse event overwrites it anyway.
function readStoredPointer(): Pointer | null {
  try {
    const stored = sessionStorage.getItem(POINTER_KEY)
    if (!stored) return null

    const {x, y} = JSON.parse(stored)
    const onScreen = Number.isFinite(x) && Number.isFinite(y) && x < window.innerWidth && y < window.innerHeight
    return onScreen ? {x, y} : null
  } catch {
    return null
  }
}

export function wireMarkFileAsViewed(): () => void {
  let currentHintBtn: HTMLButtonElement | null = null
  let pointer: Pointer | null = readStoredPointer()
  let pointerSavedAt = 0
  let scrollFrame = 0

  const diffContainerOf = (el: Element | null | undefined): Element | null => el?.closest('[id^="diff-"]') ?? null

  const notViewedButtonIn = (container: Element | null): HTMLButtonElement | null =>
    container?.querySelector<HTMLButtonElement>('button[aria-label="Not Viewed"]') ?? null

  function isInViewport(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    return rect.bottom > VIEWPORT_TOP_OFFSET && rect.top < window.innerHeight
  }

  function firstVisibleNotViewedButton(): HTMLButtonElement | null {
    for (const container of Array.from(document.querySelectorAll('[id^="diff-"]'))) {
      if (!isInViewport(container)) continue

      const viewedBtn = notViewedButtonIn(container)
      if (viewedBtn) return viewedBtn
    }
    return null
  }

  // The browser's own hit test wins when it has one — Chrome recomputes `:hover` and even fires
  // a mouseover as content scrolls under a still cursor. The viewport check rejects a hover left
  // behind off-screen; coordinates cover the rest, including the carried-over position.
  function containerUnderCursor(): Element | null {
    const hovered = document.querySelector('[id^="diff-"]:hover')
    if (hovered && isInViewport(hovered)) return hovered

    return pointer ? diffContainerOf(document.elementFromPoint(pointer.x, pointer.y)) : null
  }

  // The file under the cursor wins whenever the cursor sits on one — even if it is already
  // viewed, in which case there is deliberately no target. Only a cursor parked off the diffs
  // hands the decision to the viewport.
  function resolveTarget(origin?: Element | null): HTMLButtonElement | null {
    const container = containerUnderCursor()
    if (container) return notViewedButtonIn(container)

    return notViewedButtonIn(diffContainerOf(origin)) ?? firstVisibleNotViewedButton()
  }

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

  const onMouseMove = (e: MouseEvent) => {
    pointer = {x: e.clientX, y: e.clientY}
    setHint(notViewedButtonIn(diffContainerOf(e.target as Element)))

    if (Date.now() - pointerSavedAt < POINTER_SAVE_INTERVAL_MS) return

    pointerSavedAt = Date.now()
    try {
      sessionStorage.setItem(POINTER_KEY, JSON.stringify(pointer))
    } catch {
      // Storage can be blocked; the shortcut just loses its head start on the next page.
    }
  }

  const onMouseLeave = () => {
    pointer = null
    try {
      sessionStorage.removeItem(POINTER_KEY)
    } catch {
      // Nothing to clean up if storage is blocked.
    }
  }

  const onScroll = () => {
    if (scrollFrame) return
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0
      setHint(resolveTarget())
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.shiftKey || e.key !== ' ') return

    const viewedBtn = resolveTarget(e.target as Element)
    if (!viewedBtn) return

    e.preventDefault()
    e.stopPropagation()
    viewedBtn.click()
    setHint(null)
    printLine(`Marked file as viewed via Shift+Space`)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseover', onMouseMove)
  document.addEventListener('mouseleave', onMouseLeave)
  document.addEventListener('scroll', onScroll, {capture: true, passive: true})
  document.addEventListener('keydown', onKeyDown, true)

  return () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseover', onMouseMove)
    document.removeEventListener('mouseleave', onMouseLeave)
    document.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('keydown', onKeyDown, true)
    if (scrollFrame) cancelAnimationFrame(scrollFrame)
  }
}
