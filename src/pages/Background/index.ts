import {rules} from '../Content/rule-definitions'

const STORAGE_KEY = 'pageTunerRules'

type StoredRule = {enabled: boolean; specifics: Record<string, any>}

async function initializeRules() {
  const {[STORAGE_KEY]: currentRules = {}} = await chrome.storage.local.get(STORAGE_KEY)

  const currentRulesMap = new Map<string, Partial<StoredRule>>(Object.entries(currentRules))

  const newRulesMap = new Map<string, StoredRule>(
    rules.map(rule => [
      rule.name,
      {
        enabled: false,
        specifics: rule.specifics || {}
      }
    ])
  )

  const rulesToStore: Record<string, StoredRule> = {}
  const rulesToRemove: string[] = []

  // Handle existing rules
  for (const [key, value] of currentRulesMap) {
    const newRule = newRulesMap.get(key)
    if (newRule) {
      if (typeof value.enabled === 'boolean') {
        rulesToStore[key] = {
          ...newRule,
          enabled: value.enabled,
          specifics: {...(newRule.specifics || {}), ...(value.specifics || {})}
        }
      } else {
        // Rule wasn't manually changed, update it
        rulesToStore[key] = newRule
      }

      // Remove from new rules map since we've handled it
      newRulesMap.delete(key)
    } else {
      // Rule no longer exists in definitions, mark for removal
      rulesToRemove.push(key)
    }
  }

  // Add any new rules that weren't in storage
  for (const [key, value] of newRulesMap) {
    rulesToStore[key] = value
  }

  // Remove rules that no longer exist
  if (rulesToRemove.length > 0) {
    const updatedRules = {...currentRules}
    rulesToRemove.forEach(key => delete updatedRules[key])
    await chrome.storage.local.set({[STORAGE_KEY]: updatedRules})
    console.log('Removed obsolete rules:', rulesToRemove)
  }

  // Store updated rules
  if (Object.keys(rulesToStore).length > 0) {
    await chrome.storage.local.set({[STORAGE_KEY]: rulesToStore})
    console.log('Updated rules in local storage:', rulesToStore)
  }
}

// Initialize rules when extension is installed or updated
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    initializeRules()
  }
})

// Listen for messages from popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_RULES') {
    chrome.storage.local.get(STORAGE_KEY, result => {
      sendResponse(result[STORAGE_KEY] || {})
    })
    return true // Required for async sendResponse
  }
})
