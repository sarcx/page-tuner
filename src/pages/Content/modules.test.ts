import {clickOn, findAllEl, findEl, isClicked, markAsClicked, sleep} from './modules'

describe('isClicked', () => {
  it('reflects the pt-clicked class', () => {
    const el = document.createElement('div')
    expect(isClicked(el)).toBe(false)
    el.classList.add('pt-clicked')
    expect(isClicked(el)).toBe(true)
  })
})

describe('clickOn', () => {
  it('clicks an unclicked element and marks it', () => {
    const el = document.createElement('button')
    const spy = jest.spyOn(el, 'click')
    clickOn(el)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(isClicked(el)).toBe(true)
  })

  it('does not click an already-clicked element again', () => {
    const el = document.createElement('button')
    el.classList.add('pt-clicked')
    const spy = jest.spyOn(el, 'click')
    clickOn(el)
    expect(spy).not.toHaveBeenCalled()
  })

  it('is a no-op for null', () => {
    expect(() => clickOn(null)).not.toThrow()
  })
})

describe('markAsClicked', () => {
  it('adds the pt-clicked class without clicking', () => {
    const el = document.createElement('button')
    const spy = jest.spyOn(el, 'click')
    markAsClicked(el)
    expect(isClicked(el)).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('findEl / findAllEl', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="a"><span class="x">one</span><span class="x">two</span></div>'
  })

  it('findEl returns the first matching node', () => {
    expect((findEl('//span[@class="x"]') as HTMLElement).textContent).toBe('one')
  })

  it('findAllEl returns every matching node', () => {
    expect(findAllEl('//span[@class="x"]').map(n => n.textContent)).toEqual(['one', 'two'])
  })

  it('scopes the search to the given node', () => {
    const scope = document.getElementById('a')
    expect(findAllEl('.//span', scope)).toHaveLength(2)
  })
})

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    jest.useFakeTimers()
    const done = jest.fn()
    sleep(100).then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(done).toHaveBeenCalled()
    jest.useRealTimers()
  })
})
