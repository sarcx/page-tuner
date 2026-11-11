import {findMatches, wireHighlightSelection} from './highlight-selection'

// jsdom has no CSS Custom Highlight API — stand in for the browser's registry and Highlight class.
class FakeHighlight {
  ranges: Range[]

  constructor(...ranges: Range[]) {
    this.ranges = ranges
  }
}

function select(el: Element) {
  const range = document.createRange()
  range.selectNodeContents(el)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
  jest.runAllTimers()
}

function highlightedTexts(): string[] {
  const highlight = CSS.highlights.get('pt-selection-match') as unknown as FakeHighlight | undefined
  return highlight?.ranges.map(range => range.toString()) ?? []
}

describe('findMatches', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('finds every occurrence on the page', () => {
    document.body.innerHTML = '<p>user and user</p><div><span>user</span></div>'

    expect(findMatches('user').map(range => range.toString())).toEqual(['user', 'user', 'user'])
  })

  it('finds text split across syntax highlighting spans', () => {
    document.body.innerHTML = '<td><span class="pl-s1">user</span>.<span class="pl-en">name</span></td>'

    expect(findMatches('user.name').map(range => range.toString())).toEqual(['user.name'])
  })

  it('is case sensitive', () => {
    document.body.innerHTML = '<p>User user</p>'

    expect(findMatches('user')).toHaveLength(1)
  })

  it('skips text inside scripts and styles', () => {
    document.body.innerHTML = '<p>user</p><script>var user</script><style>.user {}</style>'

    expect(findMatches('user')).toHaveLength(1)
  })
})

describe('wireHighlightSelection', () => {
  let dispose: () => void

  beforeEach(() => {
    jest.useFakeTimers()
    Object.assign(window, {CSS: {highlights: new Map()}, Highlight: FakeHighlight})
  })

  afterEach(() => {
    dispose?.()
    jest.useRealTimers()
    document.body.innerHTML = ''
  })

  it('highlights every occurrence of the selected text', () => {
    document.body.innerHTML = '<p id="first">total</p><p>sum of total and total</p>'

    dispose = wireHighlightSelection()
    select(document.getElementById('first')!)

    expect(highlightedTexts()).toEqual(['total', 'total', 'total'])
  })

  it('ignores a one-character selection', () => {
    document.body.innerHTML = '<p id="first">a</p><p>a a a</p>'

    dispose = wireHighlightSelection()
    select(document.getElementById('first')!)

    expect(highlightedTexts()).toEqual([])
  })

  it('ignores a selection spanning several lines', () => {
    document.body.innerHTML = '<pre id="block">one\ntwo</pre>'

    dispose = wireHighlightSelection()
    select(document.getElementById('block')!)

    expect(highlightedTexts()).toEqual([])
  })

  it('clears the highlight when the selection is removed', () => {
    document.body.innerHTML = '<p id="first">total</p><p>total</p>'

    dispose = wireHighlightSelection()
    select(document.getElementById('first')!)
    window.getSelection()!.removeAllRanges()
    document.dispatchEvent(new Event('selectionchange'))
    jest.runAllTimers()

    expect(highlightedTexts()).toEqual([])
  })
})
