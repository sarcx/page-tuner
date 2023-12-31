import {clickOn, findEl, isClicked, markAsClicked, printLine} from './modules'

printLine('Must reload extension for modifications to take effect.')

// TODO: same one exists in the Popup.tsx
export const readLocalStorage = async (key: 'autoCollapseRule' | 'moveCompareButtonRule') => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      resolve(result[key])
    })
  })
}

var isScrollingScriptStarted = false

const autoGenerateFileNames = [
  'Gemfile.lock',
  'yarn.lock',
  'structure.sql',
  'translations/en.ts',
  'schema.graphql',
  'types.ts'
]

// task Auto review and collapse autogenerated files
async function onLoad() {
  if (!(await readLocalStorage('autoCollapseRule'))) return
  if (isScrollingScriptStarted) return
  if (!location.href.match(/https:\/\/github.com/)) return

  isScrollingScriptStarted = true

  printLine('Page Tuner automation is running...')

  autoGenerateFileNames.forEach(fileName => {
    const within = findEl(`//div[div[span/a[text()[(contains(.,'${fileName}'))]]]]`)
    if (!within) return
    if (isClicked(within as HTMLElement)) return

    const expandButton = findEl(
      `div/button[@aria-expanded='true'][@aria-label="Toggle diff contents"]`,
      within
    ) as HTMLButtonElement | null

    const reviewedCheckbox = findEl('div/div/div/form/label/input', within) as HTMLInputElement | null

    if (reviewedCheckbox && reviewedCheckbox.checked) {
      markAsClicked(reviewedCheckbox)
      markAsClicked(within as HTMLElement)
    } else if (reviewedCheckbox && !reviewedCheckbox.checked) {
      clickOn(reviewedCheckbox)
      markAsClicked(within as HTMLElement)
    } else {
      clickOn(expandButton)
      markAsClicked(within as HTMLElement)
    }
  })

  isScrollingScriptStarted = false
}

onLoad()

// TODO: find a better way to recheck for page changes
document.addEventListener('scroll', onLoad)

async function exposeCompareAndOpenPullRequestButtons() {
  if (!(await readLocalStorage('moveCompareButtonRule'))) return
  if (!location.href.match(/https:\/\/github.com/)) return
  // Expose Compare and Open pull request buttons in branch summary
  const contributeBlock = findEl(`//div[details/summary[text()[contains(.,"Contribute")]]]`) as HTMLDivElement | null

  const contributeButtonsBlock = findEl(`//div/div/ul/li/div[a[text()[contains(.,"Open pull request")]]]`)

  contributeButtonsBlock && contributeBlock?.appendChild(contributeButtonsBlock)

  if (contributeBlock) {
    const contributeDetailsBlock = findEl(`details`, contributeBlock) as HTMLDivElement

    contributeDetailsBlock && (contributeDetailsBlock.style.display = 'none')
  }
}

exposeCompareAndOpenPullRequestButtons()
