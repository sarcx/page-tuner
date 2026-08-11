import {injectReviewLinks} from './copy-review-links'

const FILE_NAME = 'app/javascript/gamma/app/shared/document-match-status.spec.ts'

type ThreadOpts = {file?: string; lines?: number[]; commentId?: string}

function threadMarkup({file = FILE_NAME, lines = [10, 11], commentId = 'r3630869597'}: ThreadOpts = {}): string {
  const fileLink = file ? `<a href="#" class="text-mono Link--primary">${file}</a>` : ''
  const diffRows = lines
    .map(n => `<tr><td data-line-number="${n}" class="blob-num"></td><td class="blob-code">code</td></tr>`)
    .join('')

  return `
    <review-thread-collapsible>
      <div class="header">
        <span class="flex-auto d-flex flex-items-center">${fileLink}</span>
      </div>
      <div class="body">
        <table class="js-diff-table"><tbody>${diffRows}</tbody></table>
        <div class="comment">
          <div class="d-flex flex-items-center flex-wrap gap-1">
            <strong><a class="author" href="/mvelikov">mvelikov</a></strong>
            <a href="#discussion_${commentId}" id="discussion_${commentId}-permalink" class="Link--secondary js-timestamp">
              <relative-time datetime="2026-07-22T14:03:57Z">Jul 22, 2026</relative-time>
            </a>
          </div>
        </div>
      </div>
    </review-thread-collapsible>`
}

function links(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.pt-review-link'))
}

function linkByLabel(label: string): HTMLButtonElement | undefined {
  return links().find(btn => btn.textContent === label)
}

describe('injectReviewLinks', () => {
  let writeText: jest.Mock

  beforeEach(() => {
    writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {clipboard: {writeText}})
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('injects both links after the comment timestamp', () => {
    document.body.innerHTML = threadMarkup()

    injectReviewLinks()

    const timestamp = document.querySelector<HTMLAnchorElement>('a.js-timestamp')!
    expect(timestamp.nextElementSibling?.textContent).toBe('copy comment link')
    expect(linkByLabel('copy path')).toBeDefined()
  })

  it('copies the absolute comment permalink', () => {
    document.body.innerHTML = threadMarkup()
    const timestamp = document.querySelector<HTMLAnchorElement>('a.js-timestamp')!

    injectReviewLinks()
    linkByLabel('copy comment link')!.click()

    expect(writeText).toHaveBeenCalledWith(timestamp.href)
    expect(writeText.mock.calls[0][0]).toContain('#discussion_r3630869597')
  })

  it('copies the file path with the anchored line number', () => {
    document.body.innerHTML = threadMarkup({lines: [10, 11]})

    injectReviewLinks()
    linkByLabel('copy path')!.click()

    expect(writeText).toHaveBeenCalledWith(`${FILE_NAME}:11`)
  })

  it('falls back to the multi-line preview when the diff has no line cells', () => {
    document.body.innerHTML = `
      <review-thread-collapsible>
        <span class="flex-auto"><a class="text-mono" href="#">${FILE_NAME}</a></span>
        <div class="body">
          <span class="js-multi-line-preview-end">+11</span>
          <div class="d-flex flex-items-center flex-wrap gap-1">
            <a href="#discussion_r1" class="js-timestamp">Jul 22, 2026</a>
          </div>
        </div>
      </review-thread-collapsible>`

    injectReviewLinks()
    linkByLabel('copy path')!.click()

    expect(writeText).toHaveBeenCalledWith(`${FILE_NAME}:11`)
  })

  it('copies just the path when no line number is present', () => {
    document.body.innerHTML = `
      <review-thread-collapsible>
        <span class="flex-auto"><a class="text-mono" href="#">${FILE_NAME}</a></span>
        <div class="d-flex flex-items-center flex-wrap gap-1">
          <a href="#discussion_r1" class="js-timestamp">Jul 22, 2026</a>
        </div>
      </review-thread-collapsible>`

    injectReviewLinks()
    linkByLabel('copy path')!.click()

    expect(writeText).toHaveBeenCalledWith(FILE_NAME)
  })

  it('adds links to every comment in a thread without duplicating', () => {
    document.body.innerHTML = `
      <review-thread-collapsible>
        <span class="flex-auto"><a class="text-mono" href="#">${FILE_NAME}</a></span>
        <table class="js-diff-table"><tbody><tr><td data-line-number="11"></td></tr></tbody></table>
        <div class="d-flex flex-items-center flex-wrap gap-1"><a href="#discussion_r1" class="js-timestamp">a</a></div>
        <div class="d-flex flex-items-center flex-wrap gap-1"><a href="#discussion_r2" class="js-timestamp">b</a></div>
      </review-thread-collapsible>`

    injectReviewLinks()
    injectReviewLinks()

    expect(links()).toHaveLength(4)
  })

  it('ignores timestamps outside a review thread', () => {
    document.body.innerHTML = '<a href="#x" class="js-timestamp">Jul 22, 2026</a>'

    injectReviewLinks()

    expect(links()).toHaveLength(0)
  })
})
