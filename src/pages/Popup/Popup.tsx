import React, {ChangeEvent, useEffect, useState} from 'react'
import './Popup.css'

export const readLocalStorage = async (key: 'autoCollapseRule' | 'moveCompareButtonRule') => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      resolve(result[key])
    })
  })
}

function Popup() {
  const [autoCollapseRule, setAutoCollapseRule] = useState<boolean>(false)
  const [moveCompareButtonRule, setMoveCompareButtonRule] = useState<boolean>(false)

  useEffect(() => {
    async function init() {
      const autoCollapseRuleValue = (await readLocalStorage('autoCollapseRule')) as boolean | undefined
      setAutoCollapseRule(!!autoCollapseRuleValue)

      const moveCompareButtonValue = (await readLocalStorage('moveCompareButtonRule')) as boolean | undefined
      setMoveCompareButtonRule(!!moveCompareButtonValue)
    }

    init()
  }, [])

  const onChangeCollapsibleToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    setAutoCollapseRule(e.target.checked)
    chrome.storage.local.set({autoCollapseRule: e.target.checked}).then(() => {
      // TODO: send message to all tabs for the state of this rule
    })
  }

  const onChangeMoveCompareButtonToggle = (e: ChangeEvent<HTMLInputElement>): void => {
    setMoveCompareButtonRule(e.target.checked)
    chrome.storage.local.set({moveCompareButtonRule: e.target.checked}).then(() => {
      // TODO: send message to all tabs for the state of this rule
    })
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
