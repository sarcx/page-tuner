type Rule = {
  enabled: boolean
  specifics: Record<string, any>
}

type Rules = Record<string, Rule>

export const getRuleDefinitions = async (): Promise<Rules> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({type: 'GET_RULES'}, response => {
      resolve(response || {})
    })
  })
}
