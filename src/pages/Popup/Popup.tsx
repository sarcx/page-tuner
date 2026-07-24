import React, {ChangeEvent, useEffect, useState} from 'react'
import {getRuleDefinitions} from '../utils/messages'
import './Popup.css'

const STORAGE_KEY = 'pageTunerRules'

function Popup() {
  const [autoCollapseRule, setAutoCollapseRule] = useState<boolean>(false)
  const [moveCompareButtonRule, setMoveCompareButtonRule] = useState<boolean>(false)
  const [peakonRememberAnswersRule, setPeakonRememberAnswersRule] = useState<boolean>(false)
  const [markFileAsViewedRule, setMarkFileAsViewedRule] = useState<boolean>(false)
  const [autoExpandLargeDiffRule, setAutoExpandLargeDiffRule] = useState<boolean>(false)
  const [goToLineInEditorRule, setGoToLineInEditorRule] = useState<boolean>(false)
  const [copyFileNameRule, setCopyFileNameRule] = useState<boolean>(false)
  const [repoMappingsText, setRepoMappingsText] = useState<string>('')

  useEffect(() => {
    async function initRules() {
      const rules = await getRuleDefinitions()
      setAutoCollapseRule(!!rules.autoCollapseRule?.enabled)
      setMoveCompareButtonRule(!!rules.moveCompareButtonRule?.enabled)
      setPeakonRememberAnswersRule(!!rules.peakonRememberAnswersRule?.enabled)
      setMarkFileAsViewedRule(!!rules.markFileAsViewedRule?.enabled)
      setAutoExpandLargeDiffRule(!!rules.autoExpandLargeDiffRule?.enabled)
      setGoToLineInEditorRule(!!rules.goToLineInEditorRule?.enabled)
      setCopyFileNameRule(!!rules.copyFileNameRule?.enabled)

      const mappings: Record<string, string> = rules.goToLineInEditorRule?.specifics?.repoMappings || {}
      setRepoMappingsText(
        Object.entries(mappings)
          .map(([repo, path]) => `${repo} = ${path}`)
          .join('\n')
      )
    }

    initRules()
  }, [])

  const onChangeCollapsibleToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setAutoCollapseRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            autoCollapseRule: {
              enabled: newValue,
              specifics: rules.autoCollapseRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  const onChangeMoveCompareButtonToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setMoveCompareButtonRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            moveCompareButtonRule: {
              enabled: newValue,
              specifics: rules.moveCompareButtonRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  const onChangePeakonRememberAnswersToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setPeakonRememberAnswersRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            peakonRememberAnswersRule: {
              enabled: newValue,
              specifics: rules.peakonRememberAnswersRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  const onChangeMarkFileAsViewedToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setMarkFileAsViewedRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            markFileAsViewedRule: {
              enabled: newValue,
              specifics: rules.markFileAsViewedRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  const onChangeAutoExpandLargeDiffToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setAutoExpandLargeDiffRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            autoExpandLargeDiffRule: {
              enabled: newValue,
              specifics: rules.autoExpandLargeDiffRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  function parseRepoMappings(text: string): Record<string, string> {
    const mappings: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.includes('=')) continue
      const [repo, ...rest] = trimmed.split('=')
      const repoKey = repo.trim()
      const pathValue = rest.join('=').trim()
      if (repoKey && pathValue) mappings[repoKey] = pathValue
    }
    return mappings
  }

  function saveGoToLineRule(enabled: boolean, mappingsText: string) {
    getRuleDefinitions().then(rules => {
      chrome.storage.local.set({
        [STORAGE_KEY]: {
          ...rules,
          goToLineInEditorRule: {
            enabled,
            specifics: {repoMappings: parseRepoMappings(mappingsText)}
          }
        }
      })
    })
  }

  const onChangeGoToLineInEditorToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setGoToLineInEditorRule(newValue)
    saveGoToLineRule(newValue, repoMappingsText)
  }

  const onChangeCopyFileNameToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.checked
    setCopyFileNameRule(newValue)
    getRuleDefinitions().then(rules => {
      chrome.storage.local
        .set({
          [STORAGE_KEY]: {
            ...rules,
            copyFileNameRule: {
              enabled: newValue,
              specifics: rules.copyFileNameRule?.specifics || {}
            }
          }
        })
        .then(() => {
          // TODO: send message to all tabs for the state of this rule
        })
    })
  }

  const onChangeRepoMappings = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setRepoMappingsText(e.target.value)
    saveGoToLineRule(goToLineInEditorRule, e.target.value)
  }

  return (
    <div className="body">
      <div className="logo">
        <img src="icon-128.png" width="64" />
      </div>
      <div>GitHub tasks</div>
      <ul>
        <li>
          <Switch value={autoCollapseRule} onChange={onChangeCollapsibleToggle} />
          <span> Auto review and collapse autogenerated files</span>
        </li>
        <li>
          <Switch value={moveCompareButtonRule} onChange={onChangeMoveCompareButtonToggle} />
          <span> Move out Compare and Open Pull Request buttons</span>
        </li>
        <li>
          <Switch value={markFileAsViewedRule} onChange={onChangeMarkFileAsViewedToggle} />
          <span> Mark file as viewed (Shift+Space)</span>
        </li>
        <li>
          <Switch value={autoExpandLargeDiffRule} onChange={onChangeAutoExpandLargeDiffToggle} />
          <span> Auto expand large diffs</span>
        </li>
        <li>
          <Switch value={goToLineInEditorRule} onChange={onChangeGoToLineInEditorToggle} />
          <span> Go to line in editor</span>
        </li>
        <li>
          <Switch value={copyFileNameRule} onChange={onChangeCopyFileNameToggle} />
          <span> Copy file name from review threads</span>
        </li>
        {goToLineInEditorRule && (
          <li style={{flexDirection: 'column', gap: '4px'}}>
            <span style={{fontSize: '11px', opacity: 0.7}}>Repo mappings (org/repo = /local/path):</span>
            <textarea
              value={repoMappingsText}
              onChange={onChangeRepoMappings}
              placeholder={'myorg/my-repo = /Users/me/Projects/my-repo'}
              rows={3}
              style={{
                width: '100%',
                fontSize: '11px',
                fontFamily: 'monospace',
                background: '#555',
                color: 'white',
                border: '1px solid #888',
                borderRadius: '4px',
                padding: '4px',
                resize: 'vertical',
              }}
            />
          </li>
        )}
      </ul>
      <div>Peakon tasks</div>
      <ul>
        <li>
          <Switch value={peakonRememberAnswersRule} onChange={onChangePeakonRememberAnswersToggle} />
          <span> Remember survey answers</span>
        </li>
      </ul>
    </div>
  )
}

function Switch({value, onChange}: {value: boolean; onChange: any}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={value} onChange={onChange} />
      <span className="slider"></span>
    </label>
  )
}
export default Popup
