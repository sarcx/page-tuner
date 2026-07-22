import {wireMarkFileAsViewed} from './mark-file-as-viewed'

function diffFileMarkup(withTextSpan: boolean): string {
  const label = withTextSpan ? '<span data-component="text"><span>Viewed</span></span>' : ''
  return `
    <div id="diff-abc">
      <div class="header">
        <button aria-label="Not Viewed">${label}</button>
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
  el.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))
}

describe('wireMarkFileAsViewed', () => {
  let dispose: () => void

  afterEach(() => {
    dispose?.()
    document.body.innerHTML = ''
  })

  it('fires even when the diff grid stops keydown propagation', () => {
    document.body.innerHTML = diffFileMarkup(true)
    const viewedBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Not Viewed"]')!
    const cell = document.querySelector('.cell')!
    // Simulate GitHub's grid swallowing the keypress in the bubble phase.
    document.getElementById('diff-abc')!.addEventListener('keydown', e => e.stopPropagation())
    const click = jest.spyOn(viewedBtn, 'click')

    dispose = wireMarkFileAsViewed()
    hover(cell)
    shiftSpaceFrom(cell)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('works on a button without a text-label span', () => {
    document.body.innerHTML = diffFileMarkup(false)
    const viewedBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Not Viewed"]')!
    const click = jest.spyOn(viewedBtn, 'click')

    dispose = wireMarkFileAsViewed()
    hover(viewedBtn)
    shiftSpaceFrom(viewedBtn)

    expect(click).toHaveBeenCalledTimes(1)
  })

  it('adds the shortcut hint to the label when present', () => {
    document.body.innerHTML = diffFileMarkup(true)
    dispose = wireMarkFileAsViewed()

    hover(document.querySelector('.cell')!)

    expect(document.querySelector('.pt-shortcut-hint')?.textContent).toBe(' (shift+space)')
  })

  it('does nothing without shift held', () => {
    document.body.innerHTML = diffFileMarkup(true)
    const viewedBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Not Viewed"]')!
    const click = jest.spyOn(viewedBtn, 'click')

    dispose = wireMarkFileAsViewed()
    hover(viewedBtn)
    viewedBtn.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', shiftKey: false, bubbles: true}))

    expect(click).not.toHaveBeenCalled()
  })
})
