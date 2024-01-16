export const printLine = (line: any) => {
  console.log('===>', line)
}

export function findEl(pathToNode: string, within?: Node | null) {
  // TODO add some loging when within is empty
  return document.evaluate(pathToNode, within ? within : document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    ?.singleNodeValue
}

export function clickOn(el: HTMLElement | null) {
  if (!el) return

  if (!el.classList.contains('pt-clicked')) {
    console.log('PT-Action: click')
    el.click()
    el.classList.add('pt-clicked')
  }
}

export function markAsClicked(el: HTMLElement) {
  if (!el.classList.contains('pt-clicked')) {
    console.log('PT-Action: mark as clicked')
    el.classList.add('pt-clicked')
  }
}

export function isClicked(node: HTMLElement) {
  return node.classList.contains('pt-clicked')
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
