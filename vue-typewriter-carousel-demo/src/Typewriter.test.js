import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Typewriter from './components/Typewriter.vue'
import ImageCarousel from './components/ImageCarousel.vue'
import { markdown, markdownSource } from './mock.js'
import { parseMarkdown } from './markdown.js'

const images = '<img src="/images/mountain.svg" alt="山间日落"> <img src="/images/sea.svg" alt="海边晴天">'
const scenarios = [
  { markdown: '- 第一组\n\n  ' + images + '\n\n  说明\n\n- 第二组\n\n  ' + images + '\n\n  说明' },
  { markdown: '10. 第一组\n\n  ' + images + '\n\n11. 第二项' },
  { markdown: '10. 第一组\n\n    ' + images + '\n\n    说明' },
  { markdown: '- 外层\n  - 内层\n\n    ' + images + '\n\n    说明' },
]

const wrappers = []
function render(markdown, mode = 'fixed', instant = true) {
  const wrapper = mount(Typewriter, {
    props: { markdown, mode, instant, interval: 1 },
    slots: { imgs: ({ images }) => h(ImageCarousel, { images }) },
  })
  wrappers.push(wrapper)
  return wrapper
}
function depth(element) {
  let count = 0
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.tagName === 'LI') count += 1
  }
  return count
}
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
})

describe('imgs slot location', () => {
  it('reproduces moving both carousels outside the list despite correct indentation', () => {
    const wrapper = render(scenarios[0].markdown, 'broken')
    const carousels = wrapper.findAll('[data-carousel]')
    expect(carousels).toHaveLength(2)
    carousels.forEach(carousel => expect(carousel.element.closest('li')).toBeNull())
  })

  it('keeps separate image groups in their original list items', () => {
    const wrapper = render(scenarios[0].markdown)
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    items.forEach(item => expect(item.findAll('[data-carousel]')).toHaveLength(1))
    const children = Array.from(items[0].element.children).map(element => element.tagName)
    expect(children).toEqual(['P', 'DIV', 'P'])
    expect(wrapper.find('p .carousel').exists()).toBe(false)
  })

  it('does not repair incorrect ordered-list indentation by relocating the slot', () => {
    const wrong = render(scenarios[1].markdown)
    expect(wrong.find('[data-carousel]').element.closest('li')).toBeNull()
    const correct = render(scenarios[2].markdown)
    expect(correct.find('ol').attributes('start')).toBe('10')
    expect(depth(correct.find('[data-carousel]').element)).toBe(1)
  })

  it('preserves the nested list depth', () => {
    const wrapper = render(scenarios[3].markdown)
    expect(depth(wrapper.find('[data-carousel]').element)).toBe(2)
  })

  it('renders functional Vue slot components instead of static HTML', async () => {
    const wrapper = render(scenarios[0].markdown)
    const carousel = wrapper.find('[data-carousel]')
    expect(carousel.find('img').attributes('src')).toBe('/images/mountain.svg')
    await carousel.find('[aria-label="下一张"]').trigger('click')
    expect(carousel.find('img').attributes('src')).toBe('/images/sea.svg')
    expect(wrapper.findAll('[data-carousel]')[1].find('img').attributes('src')).toBe('/images/mountain.svg')
  })

  it('handles all streamed prefixes and stops timers when unmounted', async () => {
    vi.useFakeTimers()
    const wrapper = render(scenarios[0].markdown, 'fixed', false)
    for (let position = 0; position < scenarios[0].markdown.length; position += 1) {
      vi.advanceTimersByTime(1)
      await nextTick()
      wrapper.findAll('[data-carousel]').forEach(carousel => {
        expect(depth(carousel.element)).toBe(1)
      })
    }
    expect(wrapper.vm.done).toBe(true)
    expect(wrapper.findAll('[data-carousel]')).toHaveLength(2)
    wrapper.vm.replay()
    await nextTick()
    expect(wrapper.findAll('[data-carousel]')).toHaveLength(0)
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(vi.getTimerCount()).toBe(0)
  })
})


describe('provided Markdown without blank lines', () => {
  it('parses both unindented image lines inside the original list items', () => {
    const items = markdown.querySelectorAll('ul > li')
    expect(items).toHaveLength(2)
    expect(items[0].querySelectorAll('img[src]')).toHaveLength(2)
    expect(items[1].querySelectorAll('img[src]')).toHaveLength(2)
    expect(markdown.querySelector('ol').getAttribute('start')).toBe('10')
  })

  it('keeps two carousels in their own li and ignores the bare img as a slide', () => {
    const wrapper = render(markdownSource)
    const items = wrapper.findAll('ul > li')
    expect(wrapper.findAll('[data-carousel]')).toHaveLength(2)
    items.forEach(item => {
      const carousel = item.find('[data-carousel]')
      expect(carousel.exists()).toBe(true)
      expect(carousel.text()).toContain('1 / 2')
      expect(depth(carousel.element)).toBe(1)
    })
    expect(items[0].find('img:not([src])').exists()).toBe(true)
    expect(items[0].text()).toContain('这句话和轮播应该属于同一个 li。')
    expect(items[1].text()).toContain('这是第二个列表项的轮播。')
    expect(wrapper.find('p .carousel').exists()).toBe(false)
    const broken = render(markdownSource, 'broken')
    expect(broken.findAll('[data-carousel]')).toHaveLength(2)
    broken.findAll('[data-carousel]').forEach(carousel => expect(depth(carousel.element)).toBe(0))
  })

  it('shows that adding a blank line before unindented images changes list ownership', () => {
    const body = parseMarkdown('- 推荐旅行照片\n\n' + images)
    body.querySelectorAll('img').forEach(image => expect(image.closest('li')).toBeNull())
  })

  it('splits mixed p content rather than putting the carousel div inside p', () => {
    const wrapper = render('- 推荐旅行照片\n\n  之前的文字 ' + images + ' 之后的文字')
    const children = Array.from(wrapper.find('li').element.children).map(element => element.tagName)
    expect(children).toEqual(['P', 'P', 'DIV', 'P'])
    expect(wrapper.find('p .carousel').exists()).toBe(false)
  })

  it('renders every prefix of the provided mock and ends with both carousels in li', async () => {
    vi.useFakeTimers()
    const wrapper = render(markdownSource, 'fixed', false)
    for (let position = 0; position < markdownSource.length; position += 1) {
      vi.advanceTimersByTime(1)
      await nextTick()
      wrapper.findAll('[data-carousel]').forEach(carousel => expect(depth(carousel.element)).toBe(1))
    }
    expect(wrapper.vm.done).toBe(true)
    expect(wrapper.findAll('[data-carousel]')).toHaveLength(2)
  })
})
