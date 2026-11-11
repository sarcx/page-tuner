import {
  SHORTCUTS,
  injectSubmitReviewShortcuts,
  submitReview,
  wireSubmitReviewShortcuts
} from './submit-review-shortcuts'

const APPROVE = SHORTCUTS.find(shortcut => shortcut.key === 'approve')!
const EYE = SHORTCUTS.find(shortcut => shortcut.key === 'eye')!

// GitHub has served the toolbar with two shapes of CSS-module class names. Both must keep working.
const LEGACY_TOOLBAR = `
  <section class="use-sticky-header-module__stickyHeader__sf0hv PullRequestFilesToolbar-module__toolbar__ztHN6">
    <div data-component="Stack">
      <div class="PullRequestFilesToolbar-module__file-controls-divider__zkpAr"></div>
      <button data-component="Button" type="button"
        class="prc-Button-ButtonBase-9n-Xk ReviewMenuButton-module__ReviewMenuButton__eXO8O" data-variant="primary">
        <span data-component="text"><span class="ReviewMenuButton-module__submitTextFull__wN_rM">Submit review</span></span>
      </button>
    </div>
  </section>`

const CURRENT_TOOLBAR = `
  <section class="stickyHeader__OQ39Id toolbar__UgdeAp prc-Stack-Stack-UQ9k6">
    <h2 class="sr-only">Pull request toolbar</h2>
    <div data-component="Stack">
      <div class="file-controls-divider__iGaBhT" data-testid="file-controls-divider"></div>
      <button data-component="Button" type="button"
        class="prc-Button-ButtonBase-9n-Xk ReviewMenuButton__9e8CKv" data-variant="primary">
        <span data-component="text" class="prc-Button-Label-FWkx3">
          <span class="submitTextFull__VMPyTh">Submit <!-- -->review</span><span class="submitTextShort__ip2yEj">Review</span>
        </span>
      </button>
    </div>
  </section>`

const TOOLBAR = LEGACY_TOOLBAR

const TOOLBAR_BUILDS = [
  ['legacy -module__ class names', LEGACY_TOOLBAR],
  ['current bare class names', CURRENT_TOOLBAR]
]

const DIALOG = `
  <div role="dialog" aria-labelledby="anchored-review-title" aria-modal="true">
    <h1 id="anchored-review-title">Finish your review</h1>
    <textarea id="review-body" placeholder="Leave a comment" aria-label="Markdown value"></textarea>
    <fieldset>
      <input type="radio" name="reviewEvent" value="comment" checked>
      <input type="radio" name="reviewEvent" value="approve">
      <input type="radio" name="reviewEvent" value="request changes">
    </fieldset>
    <div class="tmp-p-3 border-top">
      <button type="button">Cancel</button>
      <button type="button" disabled class="prc-Button-ButtonBase-9n-Xk ReviewMenuFooter-module__SubmitReviewButton__KIlAr">
        Submit review
      </button>
    </div>
  </div>`

const menuButton = () => document.querySelector<HTMLButtonElement>('button[class*="ReviewMenuButton"]')!
const dialog = () => document.querySelector<HTMLElement>('div[role="dialog"]')
const editor = () => document.querySelector<HTMLTextAreaElement>('#review-body')!
const radio = (value: string) => document.querySelector<HTMLInputElement>(`input[value="${value}"]`)!
const footerSubmit = () =>
  document.querySelector<HTMLButtonElement>('.ReviewMenuFooter-module__SubmitReviewButton__KIlAr')!
const shortcut = (key: string) => document.querySelector<HTMLButtonElement>(`[data-pt-shortcut="${key}"]`)
const shortcutsBefore = (button: Element) =>
  Array.from(button.previousElementSibling?.querySelectorAll<HTMLElement>('[data-pt-shortcut]') ?? []).map(
    el => el.dataset.ptShortcut
  )

// GitHub keeps Submit review disabled until the review would say something: a body, or an event
// other than a plain comment.
function mountDialog() {
  document.body.insertAdjacentHTML('beforeend', DIALOG)

  const syncSubmitState = () => {
    const event = document.querySelector<HTMLInputElement>('input[name="reviewEvent"]:checked')?.value
    footerSubmit().disabled = !editor().value.trim() && event === 'comment'
  }

  editor().addEventListener('input', syncSubmitState)
  document.querySelectorAll<HTMLInputElement>('input[name="reviewEvent"]').forEach(input => {
    input.addEventListener('click', () => {
      document.querySelectorAll<HTMLInputElement>('input[name="reviewEvent"]').forEach(other => {
        other.checked = other === input
      })
      syncSubmitState()
    })
  })

  syncSubmitState()
}

// The dialog is mounted only once the menu button is clicked.
function stubReviewDialog(): jest.Mock {
  const openDialog = jest.fn(mountDialog)
  menuButton().addEventListener('click', openDialog)
  return openDialog
}

describe('injectSubmitReviewShortcuts', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe.each(TOOLBAR_BUILDS)('with %s', (_build, toolbar) => {
    it('injects both shortcuts before the Submit review button', () => {
      document.body.innerHTML = toolbar

      injectSubmitReviewShortcuts()

      expect(shortcut('approve')!.textContent).toBe('Approve')
      expect(shortcut('eye')!.textContent).toBe('👁')
      expect(shortcutsBefore(menuButton())).toEqual(['approve', 'eye'])
    })

    // Whatever GitHub renders to the left (the Merge status button, for one) must not touch Approve.
    it('spaces the shortcuts on both sides', () => {
      document.body.innerHTML = toolbar

      injectSubmitReviewShortcuts()

      expect(menuButton().previousElementSibling).toHaveProperty('style.margin', '0px 8px')
    })

    it('serves every toolbar rendering the review menu', () => {
      document.body.innerHTML = toolbar + toolbar

      injectSubmitReviewShortcuts()

      document.querySelectorAll<HTMLButtonElement>('button[class*="ReviewMenuButton"]').forEach(button => {
        expect(shortcutsBefore(button)).toEqual(['approve', 'eye'])
      })
      expect(document.querySelectorAll('.pt-review-shortcut')).toHaveLength(4)
    })
  })

  it('does not duplicate the shortcuts on repeated runs', () => {
    document.body.innerHTML = TOOLBAR

    injectSubmitReviewShortcuts()
    injectSubmitReviewShortcuts()

    expect(document.querySelectorAll('.pt-review-shortcut')).toHaveLength(2)
  })

  it.each([
    ['legacy', 'PullRequestFilesToolbar-module__toolbar__ztHN6'],
    ['current', 'stickyHeader__OQ39Id toolbar__UgdeAp']
  ])('falls back to the button label in a %s toolbar when the button class changes', (_build, toolbarClass) => {
    document.body.innerHTML = `
      <section class="${toolbarClass}">
        <div><button type="button" id="renamed"><span>Submit review</span></button></div>
      </section>`

    injectSubmitReviewShortcuts()

    expect(shortcutsBefore(document.querySelector('#renamed')!)).toEqual(['approve', 'eye'])
  })

  it('injects nothing outside a pull request files page', () => {
    document.body.innerHTML = '<section><button type="button">Merge pull request</button></section>'

    injectSubmitReviewShortcuts()

    expect(shortcut('approve')).toBeNull()
  })

})

describe('wireSubmitReviewShortcuts', () => {
  let dispose: () => void
  let rafSpy: jest.SpyInstance

  beforeEach(() => {
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    dispose?.()
    rafSpy.mockRestore()
    document.body.innerHTML = ''
  })

  // The observer has to outlive the toolbar it decorates: React mounts it late on a cold load and
  // remounts it wholesale when moving between the PR tabs.
  it('injects into a toolbar that mounts after wiring', async () => {
    dispose = wireSubmitReviewShortcuts()
    expect(shortcut('approve')).toBeNull()

    document.body.insertAdjacentHTML('beforeend', TOOLBAR)
    await Promise.resolve()

    expect(shortcut('approve')).not.toBeNull()
  })

  it('re-injects after the toolbar is remounted', async () => {
    document.body.innerHTML = TOOLBAR
    dispose = wireSubmitReviewShortcuts()
    expect(shortcut('approve')).not.toBeNull()

    document.body.innerHTML = TOOLBAR
    await Promise.resolve()

    expect(shortcut('approve')).not.toBeNull()
    expect(document.querySelectorAll('.pt-review-shortcut')).toHaveLength(2)
  })

  it('stops injecting once disposed', async () => {
    dispose = wireSubmitReviewShortcuts()
    dispose()

    document.body.insertAdjacentHTML('beforeend', TOOLBAR)
    await Promise.resolve()

    expect(shortcut('approve')).toBeNull()
  })
})

describe('submitReview', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it.each(TOOLBAR_BUILDS)('opens the dialog, picks Approve and submits with %s', async (_build, toolbar) => {
    document.body.innerHTML = toolbar
    stubReviewDialog()
    const submitted = jest.fn()

    injectSubmitReviewShortcuts()
    const clicked = submitReview(APPROVE)
    footerSubmit().addEventListener('click', submitted)

    await expect(clicked).resolves.toBe(true)
    expect(radio('approve').checked).toBe(true)
    expect(editor().value).toBe('')
    expect(submitted).toHaveBeenCalled()
  })

  it('submits a 👁 comment review', async () => {
    document.body.innerHTML = TOOLBAR
    stubReviewDialog()
    const submitted = jest.fn()

    injectSubmitReviewShortcuts()
    const clicked = submitReview(EYE)
    footerSubmit().addEventListener('click', submitted)

    await expect(clicked).resolves.toBe(true)
    expect(editor().value).toBe('👁')
    expect(radio('comment').checked).toBe(true)
    expect(submitted).toHaveBeenCalled()
  })

  it('runs from the injected button click', async () => {
    document.body.innerHTML = TOOLBAR
    stubReviewDialog()

    injectSubmitReviewShortcuts()
    shortcut('eye')!.click()
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(editor().value).toBe('👁')
    expect(shortcut('eye')!.disabled).toBe(false)
  })

  it('reuses an already open dialog', async () => {
    document.body.innerHTML = TOOLBAR
    const openDialog = stubReviewDialog()
    mountDialog()

    await expect(submitReview(APPROVE)).resolves.toBe(true)
    expect(openDialog).not.toHaveBeenCalled()
    expect(radio('approve').checked).toBe(true)
  })

  it('gives up when the dialog never opens', async () => {
    document.body.innerHTML = TOOLBAR

    await expect(submitReview(APPROVE, 60)).resolves.toBe(false)
    expect(dialog()).toBeNull()
  })

  it('gives up when Submit review stays disabled', async () => {
    document.body.innerHTML = TOOLBAR
    mountDialog()

    await expect(submitReview({...EYE, body: undefined}, 60)).resolves.toBe(false)
    expect(footerSubmit().disabled).toBe(true)
  })

  it('does nothing without a review menu button', async () => {
    document.body.innerHTML = DIALOG

    await expect(submitReview(APPROVE, 60)).resolves.toBe(false)
    expect(radio('approve').checked).toBe(false)
  })
})
