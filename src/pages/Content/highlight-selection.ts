const HIGHLIGHT_NAME = 'pt-selection-match'
const MIN_SELECTION_LENGTH = 2
const SELECTION_DEBOUNCE_MS = 150
const SKIPPED_PARENTS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'])

// The CSS Custom Highlight API ships in Chrome 105+, but TypeScript 4.9 has no types for it yet.
declare global {
  class Highlight {
    constructor(...ranges: Range[])
  }

  namespace CSS {
    const highlights: Map<string, Highlight>
  }
}

function textNodesIn(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node =>
      SKIPPED_PARENTS.has(node.parentElement?.tagName ?? '') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  })

  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  return nodes
}

// Syntax highlighting splits one identifier across several spans, so searching each text node on
// its own would miss most matches in code. Searching the page's text joined into one string, then
// mapping every hit back to the nodes it spans, finds those as well.
export function findMatches(text: string, root: Node = document.body): Range[] {
  const nodes = textNodesIn(root)
  const starts: number[] = []
  let joined = ''
  for (const node of nodes) {
    starts.push(joined.length)
    joined += node.data
  }

  // Matches come in page order, so the node cursor only ever moves forward.
  let nodeIndex = 0
  const locate = (offset: number): [Text, number] => {
    while (nodeIndex < nodes.length - 1 && starts[nodeIndex + 1] <= offset) nodeIndex++
    return [nodes[nodeIndex], offset - starts[nodeIndex]]
  }

  const ranges: Range[] = []
  for (let index = joined.indexOf(text); index !== -1; index = joined.indexOf(text, index + text.length)) {
    const range = document.createRange()
    range.setStart(...locate(index))
    range.setEnd(...locate(index + text.length))
    ranges.push(range)
  }
  return ranges
}

export function wireHighlightSelection(): () => void {
  const style = document.createElement('style')
  style.textContent = `::highlight(${HIGHLIGHT_NAME}) { background-color: rgba(255, 213, 0, 0.45); }`
  document.head.appendChild(style)

  let pending = 0

  const highlightSelection = () => {
    const text = window.getSelection()?.toString().trim() ?? ''

    if (text.length < MIN_SELECTION_LENGTH || text.includes('\n')) {
      CSS.highlights.delete(HIGHLIGHT_NAME)
      return
    }

    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...findMatches(text)))
  }

  // Dragging a selection fires this on every mouse move; only the selection it settles on matters.
  const onSelectionChange = () => {
    clearTimeout(pending)
    pending = window.setTimeout(highlightSelection, SELECTION_DEBOUNCE_MS)
  }

  document.addEventListener('selectionchange', onSelectionChange)

  return () => {
    document.removeEventListener('selectionchange', onSelectionChange)
    clearTimeout(pending)
    CSS.highlights.delete(HIGHLIGHT_NAME)
    style.remove()
  }
}
