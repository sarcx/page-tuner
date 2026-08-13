import {wireMarkFileAsViewed} from './mark-file-as-viewed'

type DiffFileOptions = {id?: string; withTextSpan?: boolean; viewed?: boolean}

function diffFileMarkup({id = 'diff-abc', withTextSpan = true, viewed = false}: DiffFileOptions = {}): string {
  const label = withTextSpan ? '<span data-component="text"><span>Viewed</span></span>' : ''
  return `
    <div id="${id}">
      <div class="header">
        <button aria-label="${viewed ? 'Viewed' : 'Not Viewed'}">${label}</button>
      </div>
      <table role="grid"><tbody><tr>
        <td role="gridcell" class="cell">code</td>
      </tr></tbody></table>
    </div>`
}

function shiftSpaceFrom(el: Element) {
  el.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', shiftKey: true, bubbles: true, cancelable: true}))
}

function hover(el: Element) {
  el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, clientX: 10, clientY: 10}))
}

function stubRect(el: Element, {top, bottom}: {top: number; bottom: number}) {
  el.getBoundingClientRect = () => ({top, bottom, left: 0, right: 0, width: 0, height: bottom - top} as DOMRect)
}

function stubElementFromPoint(el: Element | null) {
  document.elementFromPoint = () => el
}

// jsdom has no layout, so `:hover` never matches — stand in for the browser, which reports the
// whole ancestor line of the cursor, outermost first.
function stubHover(el: Element | null) {
  const chain: Element[] = []
  for (let node = el; node; node = node.parentElement) chain.unshift(node)

  const original = document.querySelectorAll.bind(document)
  document.querySelectorAll = (selector: string) => (selector === ':hover' ? (chain as any) : original(selector))
}

function notViewedButtonIn(id: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`#${id} button[aria-label="Not Viewed"]`)!
}

describe('wireMarkFileAsViewed', () => {
  let dispose: () => void
  let rafSpy: jest.SpyInstance
  const originalQuerySelectorAll = document.querySelectorAll

  beforeEach(() => {
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0)
      return 0
    })
    // jsdom does not implement elementFromPoint; browsers always do.
    stubElementFromPoint(null)
  })

  afterEach(() => {
    dispose?.()
    rafSpy.mockRestore()
    document.querySelectorAll = originalQuerySelectorAll
    sessionStorage.clear()
    document.body.innerHTML = ''
  })

  it('fires even when the diff grid stops keydown propagation', () => {
    document.body.innerHTML = diffFileMarkup()
    const cell = document.querySelector('.cell')!
    // Simulate GitHub's grid swallowing the keypress in the bubble phase.
    document.getElementById('diff-abc')!.addEventListener('keydown', e => e.stopPropagation())
    const click = jest.spyOn(notViewedButtonIn('diff-abc'), 'click')

    dispose = wireMarkFileAsViewed()
    hover(cell)
    shiftSpaceFrom(cell)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('works on a button without a text-label span', () => {
    document.body.innerHTML = diffFileMarkup({withTextSpan: false})
    const viewedBtn = notViewedButtonIn('diff-abc')
    const click = jest.spyOn(viewedBtn, 'click')

    dispose = wireMarkFileAsViewed()
    hover(viewedBtn)
    shiftSpaceFrom(viewedBtn)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('adds the shortcut hint to the label when present', () => {
    document.body.innerHTML = diffFileMarkup()
    dispose = wireMarkFileAsViewed()

    hover(document.querySelector('.cell')!)

    expect(document.querySelector('.pt-shortcut-hint')?.textContent).toBe(' (shift+space)')
  })

  it('marks the file under the keyboard focus when the mouse never moved', () => {
    document.body.innerHTML = diffFileMarkup()
    const click = jest.spyOn(notViewedButtonIn('diff-abc'), 'click')

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.querySelector('.cell')!)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('falls back to the first file visible in the viewport', () => {
    document.body.innerHTML = diffFileMarkup()
    const click = jest.spyOn(notViewedButtonIn('diff-abc'), 'click')
    stubRect(document.getElementById('diff-abc')!, {top: 50, bottom: 600})

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('skips already viewed files when picking from the viewport', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-done', viewed: true}) + diffFileMarkup()
    const click = jest.spyOn(notViewedButtonIn('diff-abc'), 'click')
    stubRect(document.getElementById('diff-done')!, {top: 50, bottom: 300})
    stubRect(document.getElementById('diff-abc')!, {top: 300, bottom: 600})

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('retargets the file that scrolls under a stationary cursor', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})
    const firstClick = jest.spyOn(notViewedButtonIn('diff-one'), 'click')
    const secondClick = jest.spyOn(notViewedButtonIn('diff-two'), 'click')

    dispose = wireMarkFileAsViewed()
    hover(document.querySelector('#diff-one .cell')!)
    // Keyboard scrolling moves the second file under the unmoved cursor.
    stubElementFromPoint(document.querySelector('#diff-two .cell'))
    document.dispatchEvent(new Event('scroll'))
    shiftSpaceFrom(document.body)

    expect(secondClick).toHaveBeenCalledTimes(1)
    expect(firstClick).not.toHaveBeenCalled()
  })

  it('uses the hover state when the mouse has not moved since load', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})
    const firstClick = jest.spyOn(notViewedButtonIn('diff-one'), 'click')
    const secondClick = jest.spyOn(notViewedButtonIn('diff-two'), 'click')
    stubRect(document.getElementById('diff-one')!, {top: -400, bottom: 200})
    stubRect(document.getElementById('diff-two')!, {top: 200, bottom: 800})
    stubHover(document.getElementById('diff-two'))

    dispose = wireMarkFileAsViewed()
    document.dispatchEvent(new Event('scroll'))
    shiftSpaceFrom(document.body)

    expect(secondClick).toHaveBeenCalledTimes(1)
    expect(firstClick).not.toHaveBeenCalled()
  })

  it('ignores a hover state left off-screen by keyboard scrolling', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})
    const secondClick = jest.spyOn(notViewedButtonIn('diff-two'), 'click')
    stubRect(document.getElementById('diff-one')!, {top: -900, bottom: -300})
    stubRect(document.getElementById('diff-two')!, {top: 200, bottom: 800})
    stubHover(document.getElementById('diff-one'))

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(secondClick).toHaveBeenCalledTimes(1)
  })

  it('marks the hovered file, not the first one under a wrapper that hover also matches', () => {
    document.body.innerHTML = `<div id="diff-wrapper">
      ${diffFileMarkup({id: 'diff-one'})}${diffFileMarkup({id: 'diff-two'})}
    </div>`
    const firstClick = jest.spyOn(notViewedButtonIn('diff-one'), 'click')
    const secondClick = jest.spyOn(notViewedButtonIn('diff-two'), 'click')
    stubRect(document.getElementById('diff-wrapper')!, {top: 0, bottom: 800})
    stubRect(document.getElementById('diff-one')!, {top: 0, bottom: 400})
    stubRect(document.getElementById('diff-two')!, {top: 400, bottom: 800})
    stubHover(document.querySelector('#diff-two .cell'))

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(secondClick).toHaveBeenCalledTimes(1)
    expect(firstClick).not.toHaveBeenCalled()
  })

  it('aims at the cursor position carried over from the previous page', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})
    const firstClick = jest.spyOn(notViewedButtonIn('diff-one'), 'click')
    const secondClick = jest.spyOn(notViewedButtonIn('diff-two'), 'click')
    stubRect(document.getElementById('diff-one')!, {top: -400, bottom: 200})
    stubRect(document.getElementById('diff-two')!, {top: 200, bottom: 800})
    sessionStorage.setItem('pt-cursor', JSON.stringify({x: 300, y: 400}))
    stubElementFromPoint(document.querySelector('#diff-two .cell'))

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(secondClick).toHaveBeenCalledTimes(1)
    expect(firstClick).not.toHaveBeenCalled()
  })

  it('ignores a carried-over position that no longer fits the window', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})
    const firstClick = jest.spyOn(notViewedButtonIn('diff-one'), 'click')
    stubRect(document.getElementById('diff-one')!, {top: 0, bottom: 400})
    stubRect(document.getElementById('diff-two')!, {top: 400, bottom: 900})
    sessionStorage.setItem('pt-cursor', JSON.stringify({x: 300, y: window.innerHeight + 200}))
    stubElementFromPoint(document.querySelector('#diff-two .cell'))

    dispose = wireMarkFileAsViewed()
    shiftSpaceFrom(document.body)

    expect(firstClick).toHaveBeenCalledTimes(1)
  })

  it('stores the cursor position for the next page load', () => {
    document.body.innerHTML = diffFileMarkup()

    dispose = wireMarkFileAsViewed()
    document.querySelector('.cell')!.dispatchEvent(
      new MouseEvent('mousemove', {bubbles: true, clientX: 120, clientY: 340})
    )

    expect(JSON.parse(sessionStorage.getItem('pt-cursor')!)).toEqual({x: 120, y: 340})
  })

  it('drops the stored position when the cursor leaves the page', () => {
    document.body.innerHTML = diffFileMarkup()
    sessionStorage.setItem('pt-cursor', JSON.stringify({x: 10, y: 10}))

    dispose = wireMarkFileAsViewed()
    document.dispatchEvent(new MouseEvent('mouseleave'))

    expect(sessionStorage.getItem('pt-cursor')).toBeNull()
  })

  it('moves the hint to the file under the cursor after a scroll', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-one'}) + diffFileMarkup({id: 'diff-two'})

    dispose = wireMarkFileAsViewed()
    hover(document.querySelector('#diff-one .cell')!)
    stubElementFromPoint(document.querySelector('#diff-two .cell'))
    document.dispatchEvent(new Event('scroll'))

    expect(document.querySelectorAll('.pt-shortcut-hint')).toHaveLength(1)
    expect(document.querySelector('#diff-two .pt-shortcut-hint')).not.toBeNull()
  })

  it('marks nothing when the cursor rests on an already viewed file', () => {
    document.body.innerHTML = diffFileMarkup({id: 'diff-done', viewed: true}) + diffFileMarkup()
    const click = jest.spyOn(notViewedButtonIn('diff-abc'), 'click')
    stubRect(document.getElementById('diff-abc')!, {top: 50, bottom: 600})

    dispose = wireMarkFileAsViewed()
    hover(document.querySelector('#diff-done .cell')!)
    stubElementFromPoint(document.querySelector('#diff-done .cell'))
    document.dispatchEvent(new Event('scroll'))
    shiftSpaceFrom(document.body)

    expect(click).not.toHaveBeenCalled()
  })

  it('does nothing without shift held', () => {
    document.body.innerHTML = diffFileMarkup()
    const viewedBtn = notViewedButtonIn('diff-abc')
    const click = jest.spyOn(viewedBtn, 'click')

    dispose = wireMarkFileAsViewed()
    hover(viewedBtn)
    viewedBtn.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', shiftKey: false, bubbles: true}))

    expect(click).not.toHaveBeenCalled()
  })
})
