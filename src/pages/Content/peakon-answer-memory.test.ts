import {
  clearHighlight,
  currentQuestion,
  forgetAnswer,
  highlightStoredAnswer,
  probeHooks,
  questionKey,
  readAnswers,
  saveAnswer,
  wirePeakonAnswerMemory
} from './peakon-answer-memory'

const STORAGE_KEY = 'peakon_survey_answers'
const QUESTION = 'How happy are you at work?'
const VALUE_QUESTION = 'Does your day-to-day experience of working here feel aligned to this value?'

function surveyMarkup(question: string = QUESTION, scores: string[] = ['6', '7', '8']): string {
  const buttons = scores
    .map(score => `<button data-scale="${score}" aria-pressed="false">${score}</button>`)
    .join('')

  return `
    <div data-test-id="question-container">
      <h2 id="question-item-title">${question}</h2>
      <div role="group">${buttons}</div>
    </div>`
}

// Trimmed from a value question: every value shares the title, and only the line above it names
// the value.
function valueQuestionMarkup(value: string): string {
  return `
    <div data-test-id="question-container">
      <div data-type="value">
        <p>Organisational value: ${value}</p>
        <h1 id="question-item-title">${VALUE_QUESTION}</h1>
        <div><span><p>Voice your ideas; challenge the status quo.</p></span></div>
        <div role="group">
          <button type="button" aria-pressed="false" data-scale="6">6</button>
          <button type="button" aria-pressed="false" data-scale="9">9</button>
        </div>
      </div>
    </div>`
}

function scoreButton(score: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`button[data-scale="${score}"]`)!
}

function storedScores(): Record<string, string> {
  const answers = readAnswers()
  return Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, answer.score]))
}

afterEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('questionKey', () => {
  it('ignores case, repeated whitespace and trailing punctuation', () => {
    expect(questionKey('  How   HAPPY are you at work?  ')).toBe('how happy are you at work')
  })

  it('gives a reworded-punctuation question the same key', () => {
    expect(questionKey('Do you get useful feedback?')).toBe(questionKey('do you get useful feedback'))
  })
})

describe('readAnswers', () => {
  it('upgrades the old question-to-score map', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({[QUESTION]: '8'}))

    expect(readAnswers()).toEqual({
      'how happy are you at work': {question: QUESTION, score: '8', savedAt: 0}
    })
  })

  it('returns nothing for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')

    expect(readAnswers()).toEqual({})
  })

  it('skips entries with no score', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({a: {question: 'a'}, b: 7}))

    expect(readAnswers()).toEqual({})
  })
})

describe('saveAnswer', () => {
  it('stores the question alongside the score', () => {
    expect(saveAnswer(QUESTION, '8')).toBe('saved')
    expect(readAnswers()['how happy are you at work']).toMatchObject({question: QUESTION, score: '8'})
  })

  it('reports an unchanged score rather than rewriting it', () => {
    saveAnswer(QUESTION, '8')

    expect(saveAnswer(QUESTION, '8')).toBe('unchanged')
  })

  it('overwrites a different score for the same question', () => {
    saveAnswer(QUESTION, '8')

    expect(saveAnswer(QUESTION, '4')).toBe('saved')
    expect(storedScores()).toEqual({'how happy are you at work': '4'})
  })

  it('reports a failure when the write throws', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(saveAnswer(QUESTION, '8')).toBe('failed')

    setItem.mockRestore()
  })

  it('reports a failure when the write is accepted but does not land', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined)

    expect(saveAnswer(QUESTION, '8')).toBe('failed')

    setItem.mockRestore()
  })

  it('keeps a reworded question pointing at the same entry', () => {
    saveAnswer('Do you get useful feedback?', '6')
    saveAnswer('Do you get useful feedback', '9')

    expect(storedScores()).toEqual({'do you get useful feedback': '9'})
  })
})

describe('forgetAnswer', () => {
  it('drops one entry and leaves the rest', () => {
    saveAnswer(QUESTION, '8')
    saveAnswer('Would you recommend us?', '9')

    forgetAnswer('how happy are you at work')

    expect(storedScores()).toEqual({'would you recommend us': '9'})
  })
})

describe('probeHooks', () => {
  it('counts what each selector currently matches', () => {
    document.body.innerHTML = surveyMarkup()

    const found = Object.fromEntries(probeHooks().map(hook => [hook.key, hook.found]))

    expect(found).toEqual({questionText: 1, answerButtons: 3, questionContainer: 1, scoreButton: 0})
  })

  it('marks the change-score control as non-essential', () => {
    const scoreHook = probeHooks().find(hook => hook.key === 'scoreButton')

    expect(scoreHook?.essential).toBe(false)
  })
})

describe('currentQuestion', () => {
  it('trims the title text', () => {
    document.body.innerHTML = surveyMarkup(`  ${QUESTION}  `)

    expect(currentQuestion()).toBe(QUESTION)
  })

  it('is null when the title is missing', () => {
    document.body.innerHTML = '<div data-test-id="question-container"></div>'

    expect(currentQuestion()).toBeNull()
  })

  it('names the value a value question asks about', () => {
    document.body.innerHTML = valueQuestionMarkup('Be Brave')

    expect(currentQuestion()).toBe(`Organisational value: Be Brave — ${VALUE_QUESTION}`)
  })
})

describe('highlightStoredAnswer', () => {
  beforeEach(() => {
    document.body.innerHTML = surveyMarkup()
  })

  it('outlines the button for the stored score', () => {
    expect(highlightStoredAnswer('7')).toBe(true)
    expect(scoreButton('7').style.outline).toBe('3px solid #4CAF50')
  })

  it('reports that nothing matched when the score is off the scale', () => {
    expect(highlightStoredAnswer('11')).toBe(false)
  })

  it("restores Peakon's own tooltip instead of blanking it", () => {
    scoreButton('7').title = 'Somewhat happy'

    highlightStoredAnswer('7')
    expect(scoreButton('7').title).toBe('Previous answer: 7')

    clearHighlight()
    expect(scoreButton('7').title).toBe('Somewhat happy')
  })

  it('moves the outline rather than leaving two behind', () => {
    highlightStoredAnswer('7')
    highlightStoredAnswer('8')

    expect(scoreButton('7').style.outline).toBe('')
    expect(scoreButton('8').style.outline).toBe('3px solid #4CAF50')
  })
})

describe('wirePeakonAnswerMemory', () => {
  let dispose: () => void

  beforeEach(() => {
    document.body.innerHTML = surveyMarkup()
  })

  afterEach(() => {
    dispose?.()
  })

  it('stores the score you click', () => {
    dispose = wirePeakonAnswerMemory()

    scoreButton('8').click()

    expect(storedScores()).toEqual({'how happy are you at work': '8'})
  })

  it('stores a score restored without a click', async () => {
    dispose = wirePeakonAnswerMemory()

    scoreButton('6').setAttribute('aria-pressed', 'true')
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(storedScores()).toEqual({'how happy are you at work': '6'})
  })

  it('ignores a click with no question on screen', () => {
    document.body.innerHTML = '<button data-scale="8"></button>'
    dispose = wirePeakonAnswerMemory()

    scoreButton('8').click()

    expect(storedScores()).toEqual({})
  })

  it('outlines a previously stored score on wiring', () => {
    saveAnswer(QUESTION, '7')

    dispose = wirePeakonAnswerMemory()

    expect(scoreButton('7').style.outline).toBe('3px solid #4CAF50')
  })

  it('keeps a separate answer for each value', () => {
    document.body.innerHTML = valueQuestionMarkup('Be Brave')
    dispose = wirePeakonAnswerMemory()
    scoreButton('6').click()

    document.body.innerHTML = valueQuestionMarkup('Own It')
    scoreButton('9').click()

    expect(Object.values(readAnswers()).map(answer => [answer.question, answer.score])).toEqual([
      [`Organisational value: Be Brave — ${VALUE_QUESTION}`, '6'],
      [`Organisational value: Own It — ${VALUE_QUESTION}`, '9']
    ])
  })

  it("does not outline another value's answer", () => {
    document.body.innerHTML = valueQuestionMarkup('Own It')
    saveAnswer(currentQuestion()!, '9')
    document.body.innerHTML = valueQuestionMarkup('Be Brave')

    dispose = wirePeakonAnswerMemory()

    expect(document.querySelector('[data-pt-previous-answer]')).toBeNull()
  })

  it('mounts the panel and takes it away again on dispose', () => {
    dispose = wirePeakonAnswerMemory()
    expect(document.getElementById('pt-peakon-panel')).not.toBeNull()

    dispose()
    expect(document.getElementById('pt-peakon-panel')).toBeNull()
  })

  it('leaves no highlight behind on dispose', () => {
    saveAnswer(QUESTION, '7')
    dispose = wirePeakonAnswerMemory()

    dispose()

    expect(scoreButton('7').style.outline).toBe('')
  })

  it('stops storing once disposed', () => {
    dispose = wirePeakonAnswerMemory()
    dispose()

    scoreButton('8').click()

    expect(storedScores()).toEqual({})
  })
})
