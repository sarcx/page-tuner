import {injectCopyFileNameButtons} from './copy-file-name'

const FILE_NAME = 'app/graphql/graph/mutations/match_receipts_to_bank_transaction_mutation.rb'

function threadMarkup(fileName: string): string {
  return `
    <review-thread-collapsible>
      <div class="header">
        <button class="review-thread-chevron"></button>
        <span class="flex-auto d-flex flex-items-center">
          <a href="/dext/application/pull/1/files#diff-abc" class="text-mono text-small Link--primary mr-2">${fileName}</a>
        </span>
      </div>
    </review-thread-collapsible>`
}

function copyButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('.pt-copy-file-name-btn')
}

describe('injectCopyFileNameButtons', () => {
  let writeText: jest.Mock

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {clipboard: {writeText}})
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('injects a copy button next to the file name link', () => {
    document.body.innerHTML = threadMarkup(FILE_NAME)

    injectCopyFileNameButtons()

    const btn = copyButton()
    expect(btn).not.toBeNull()
    expect(btn?.previousElementSibling?.tagName).toBe('A')
  })

  it('copies the full file path to the clipboard on click', () => {
    document.body.innerHTML = threadMarkup(FILE_NAME)

    injectCopyFileNameButtons()
    copyButton()!.click()

    expect(writeText).toHaveBeenCalledWith(FILE_NAME)
  })

  it('strips left-to-right marks from the copied name', () => {
    document.body.innerHTML = threadMarkup(`\u200e${FILE_NAME}\u200e`)

    injectCopyFileNameButtons()
    copyButton()!.click()

    expect(writeText).toHaveBeenCalledWith(FILE_NAME)
  })

  it('does not inject a second button across runs', () => {
    document.body.innerHTML = threadMarkup(FILE_NAME)

    injectCopyFileNameButtons()
    injectCopyFileNameButtons()

    expect(document.querySelectorAll('.pt-copy-file-name-btn')).toHaveLength(1)
  })

  it('ignores links outside a review thread', () => {
    document.body.innerHTML = `<a class="text-mono" href="#">${FILE_NAME}</a>`

    injectCopyFileNameButtons()

    expect(copyButton()).toBeNull()
  })
})
