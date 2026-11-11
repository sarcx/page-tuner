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

const INLINE_FILE_NAME = 'app/services/publishing/schedule_fulll_polling_jobs.rb'
const INLINE_COMMENT_URL = 'https://github.com/dext/integrations-app/pull/1131/changes#r4526085329'

// Trimmed from the React Changes tab: the thread sits inside the diff cell of the line it comments
// on, and every class name carries a per-build hash.
function inlineCommentMarkup(commentId: string): string {
  return `
    <div id="${commentId}" data-marker-navigation-comment-id="PRRC_${commentId}" class="ReviewThreadContainer__zrJcUC">
      <div data-testid="comment-header" class="ActivityHeaderContainer__sf0_ID">
        <h3 class="sr-only">ienev commented <relative-time datetime="2026-11-10T14:30:15.000Z">on Nov 10</relative-time></h3>
        <a class="AuthorName__V4JPE4 prc-Link-Link-9ZwDx" href="/ienev">ienev</a>
        <div class="footer__7ecx1m">
          <span class="HeaderMutedText__fi4I0n">
            <a class="HeaderLink__tMdYUU prc-Link-Link-9ZwDx" href="https://github.com/dext/integrations-app/pull/1131/changes#${commentId}">
              <relative-time format="micro" datetime="2026-11-10T14:30:15.000Z">on Nov 10, 2026</relative-time>
            </a>
          </span>
        </div>
      </div>
      <div class="markdown-body"><p>maybe extract the constant to the model</p></div>
    </div>`
}

function inlineThreadMarkup(commentIds = ['r4526085329']): string {
  return `
    <div role="region" aria-labelledby="heading-_r_57_" class="diff__GZFl4M">
      <div data-diff-header-wrapper="true">
        <h3 id="heading-_r_57_" class="file-name__8GKEHg"><a href="#diff-a966"><code>${INLINE_FILE_NAME}</code></a></h3>
      </div>
      <table aria-label="Diff for: ${INLINE_FILE_NAME}"><tbody>
        <tr class="diff-line-row">
          <td data-diff-side="left" data-line-number="22">22</td>
          <td data-diff-side="right" data-line-number="22">22</td>
          <td data-diff-side="right" data-line-number="22"><code>      SQL</code></td>
        </tr>
        <tr class="diff-line-row">
          <td class="empty-diff-line"></td>
          <td data-diff-side="right" data-line-number="23">23</td>
          <td data-diff-side="right" data-line-number="23">
            <code class="addition">+ PollingRequest.where(id: requests.map(&:id))</code>
            <div data-inline-markers="true">
              <h2>Comment on line <span>R23</span></h2>
              <div data-testid="review-thread">${commentIds.map(inlineCommentMarkup).join('')}</div>
            </div>
          </td>
        </tr>
      </tbody></table>
    </div>`
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

  it('ignores timestamps outside a review thread', () => {
    document.body.innerHTML = `
      <a href="#x" class="js-timestamp">Jul 22, 2026</a>
      <div data-testid="comment-header"><a href="#y"><relative-time>Nov 10</relative-time></a></div>`

    injectReviewLinks()

    expect(links()).toHaveLength(0)
  })

  it('serves both thread layouts on the same page', () => {
    document.body.innerHTML = threadMarkup() + inlineThreadMarkup()

    injectReviewLinks()

    expect(links()).toHaveLength(4)
  })

  // The Conversation tab, and the Files tab before GitHub moved it to React.
  describe('with <review-thread-collapsible> threads', () => {
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
  })

  // The React Changes tab, where threads render inline in the diff.
  describe('with inline threads in the diff', () => {
    it('injects both links after the comment timestamp', () => {
      document.body.innerHTML = inlineThreadMarkup()

      injectReviewLinks()

      const timestamp = document.querySelector<HTMLAnchorElement>('.HeaderLink__tMdYUU')!
      expect(timestamp.nextElementSibling?.textContent).toBe('copy comment link')
      expect(linkByLabel('copy path')).toBeDefined()
    })

    it('copies the comment permalink', () => {
      document.body.innerHTML = inlineThreadMarkup()

      injectReviewLinks()
      linkByLabel('copy comment link')!.click()

      expect(writeText).toHaveBeenCalledWith(INLINE_COMMENT_URL)
    })

    it('copies the file path with the line the thread sits on', () => {
      document.body.innerHTML = inlineThreadMarkup()

      injectReviewLinks()
      linkByLabel('copy path')!.click()

      expect(writeText).toHaveBeenCalledWith(`${INLINE_FILE_NAME}:23`)
    })

    it('adds links to every comment in a thread without duplicating', () => {
      document.body.innerHTML = inlineThreadMarkup(['r1', 'r2'])

      injectReviewLinks()
      injectReviewLinks()

      expect(links()).toHaveLength(4)
    })
  })
})
