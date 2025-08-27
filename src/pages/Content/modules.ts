export const printLine = (line: any) => {
  console.debug('===>', line)
}

export function findAllEl(pathToNode: string, within?: Node | null) {
  const result = document.evaluate(
    pathToNode,
    within ? within : document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  )

  const nodes: Node[] = []
  for (let i = 0; i < result.snapshotLength; i++) {
    nodes.push(result.snapshotItem(i) as Node)
  }

  return nodes
}

export function findEl(pathToNode: string, within?: Node | null) {
  // TODO add some loging when within is empty
  return document.evaluate(pathToNode, within ? within : document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    ?.singleNodeValue
}

export function clickOn(el: HTMLElement | null, slug?: string) {
  if (!el) return

  if (!el.classList.contains('pt-clicked')) {
    console.debug(`PT-Action: click ${slug || ''}`)
    el.click()
    el.classList.add('pt-clicked')
  }
}

export function markAsClicked(el: HTMLElement, slug?: string) {
  if (!el.classList.contains('pt-clicked')) {
    console.debug(`PT-Action: mark as clicked ${slug || ''}`)
    el.classList.add('pt-clicked')
  }
}

export function isClicked(node: HTMLElement) {
  return node.classList.contains('pt-clicked')
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
