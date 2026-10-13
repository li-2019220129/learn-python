<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Typewriter from './components/Typewriter.vue'
import ImageCarousel from './components/ImageCarousel.vue'
import { markdownSource } from './mock.js'

const markdown = markdownSource
const speed = ref(25)
const broken = ref(null)
const fixed = ref(null)
const brokenPanel = ref(null)
const fixedPanel = ref(null)
const inspection = ref({ broken: [], fixed: [] })
const rawHtml = ref({ broken: '', fixed: '' })
let observer
let inspectionQueued = false

function describe(panel) {
  return Array.from(panel?.querySelectorAll('[data-carousel]') || [], (carousel, index) => {
    let depth = 0
    for (let parent = carousel.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'LI') depth += 1
    }
    const item = carousel.closest('li')
    return '轮播 ' + (index + 1) + '：' + (item
      ? '在第 ' + depth + ' 层 li 内（' + item.parentElement.tagName.toLowerCase() + '）'
      : '在列表外')
  })
}

function inspect() {
  inspection.value = { broken: describe(brokenPanel.value), fixed: describe(fixedPanel.value) }
  rawHtml.value = {
    broken: brokenPanel.value?.querySelector('.markdown-content')?.innerHTML || '',
    fixed: fixedPanel.value?.querySelector('.markdown-content')?.innerHTML || '',
  }
}

onMounted(() => {
  observer = new MutationObserver(() => {
    if (inspectionQueued) return
    inspectionQueued = true
    nextTick(() => {
      inspectionQueued = false
      inspect()
    })
  })
  for (const panel of [brokenPanel.value, fixedPanel.value]) {
    observer.observe(panel.querySelector('.markdown-content'), { childList: true, subtree: true, attributes: true, characterData: true })
  }
  inspect()
})
onBeforeUnmount(() => observer?.disconnect())

function replay() {
  broken.value.replay()
  fixed.value.replay()
}

function finish() {
  broken.value.finish()
  fixed.value.finish()
}
</script>

<template>
  <main>
    <header>
      <span class="eyebrow">VUE 3 · MARKDOWN · #imgs SLOT</span>
      <h1>为什么轮播图跑出了列表？</h1>
      <p>同一份 Markdown，同一个 div 轮播组件，只改变插槽的挂载位置。</p>
    </header>
    <section class="toolbar">
      <label>每字间隔 <input v-model.number="speed" type="range" min="5" max="80"> {{ speed }} ms</label>
      <button @click="replay">重新播放</button>
      <button class="primary" @click="finish">立即完成</button>
    </section>
    <p class="notice">蓝色虚线框是 li，橙色边框是 div 轮播。以下只使用你提供的完整 mock：图片前后没有空白行，观察 #imgs 插槽统一挂载和原位置挂载的区别。</p>
    <div class="comparison">
      <section class="panel">
        <h2>错误版 <small>抽出图片，统一在末尾渲染 #imgs</small></h2>
        <div ref="brokenPanel" class="render-area">
          <Typewriter ref="broken" :markdown="markdown" :interval="speed" mode="broken">
            <template #imgs="{ images }"><ImageCarousel :images="images" /></template>
          </Typewriter>
        </div>
        <div class="result"><p v-for="line in inspection.broken" :key="line">{{ line }}</p><p v-if="!inspection.broken.length">正在输入，等待多个图片标签完整输出…</p></div>
      </section>
      <section class="panel">
        <h2>修复版 <small>在原图片段落的位置调用 #imgs</small></h2>
        <div ref="fixedPanel" class="render-area">
          <Typewriter ref="fixed" :markdown="markdown" :interval="speed" mode="fixed">
            <template #imgs="{ images }"><ImageCarousel :images="images" /></template>
          </Typewriter>
        </div>
        <div class="result"><p v-for="line in inspection.fixed" :key="line">{{ line }}</p><p v-if="!inspection.fixed.length">正在输入，等待多个图片标签完整输出…</p></div>
      </section>
    </div>
    <section class="panel source">
      <h2>打字机当前 Markdown <small>空格以 · 显示，便于观察缩进</small></h2>
      <pre>{{ (fixed?.visibleMarkdown || '').replace(/ /g, '·') }}<span class="cursor">▍</span></pre>
      <details><summary>查看完整 mock 数据</summary><pre>{{ markdown }}</pre></details>
    </section>
    <div class="comparison">
      <details class="panel"><summary>错误版：实际 DOM</summary><pre>{{ rawHtml.broken }}</pre></details>
      <details class="panel"><summary>修复版：实际 DOM</summary><pre>{{ rawHtml.fixed }}</pre></details>
    </div>
    <section class="panel explanation">
      <h2>修复的关键</h2>
      <p>不是把轮播硬塞到 ul 下，而是保留 <code>ul → li → 轮播 div</code> 的原始位置。列表的内容应该放在 li 内，不能直接把 div 当成 ul 的普通子元素。</p>
      <p>修复版解析 Markdown 后递归生成 Vue VNode；识别同一父节点下的连续有效图片，在原位置调用 <code>slots.imgs({ images })</code>，。如果图片与文字位于同一个 p，则拆分成文字 p 与轮播 div，避免生成无效的 <code>p → div</code> 嵌套。</p>
      <p>本 Demo 只使用可信 mock。开启原始 HTML 的真实项目需要配合 HTML 清洗与 URL 白名单；此实现不是安全过滤器，也不是完整的流式 Markdown 解析器。</p>
    </section>
  </main>
</template>
