<script setup>
import { computed, defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { groupImageNodes, parseMarkdown } from '../markdown.js'

const props = defineProps({
  markdown: { type: String, required: true },
  mode: { type: String, default: 'fixed' },
  interval: { type: Number, default: 25 },
  instant: { type: Boolean, default: false },
})
const visibleLength = ref(0)
let timer
const visibleMarkdown = computed(() => props.markdown.slice(0, visibleLength.value))
const done = computed(() => visibleLength.value >= props.markdown.length)

function tick() {
  if (done.value) return
  visibleLength.value += 1
  timer = setTimeout(tick, props.interval)
}

function replay() {
  clearTimeout(timer)
  visibleLength.value = props.instant ? props.markdown.length : 0
  if (!props.instant) timer = setTimeout(tick, props.interval)
}

function finish() {
  clearTimeout(timer)
  visibleLength.value = props.markdown.length
}

watch(() => [props.markdown, props.instant], replay, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
defineExpose({ replay, finish, visibleMarkdown, done })

const MarkdownContent = defineComponent({
  props: { markdown: String, mode: String },
  setup(contentProps, { slots }) {
    return () => {
      const body = parseMarkdown(contentProps.markdown)
      const detachedGroups = []

      function renderNode(node, path) {
        if (node.nodeType === 3) return node.textContent
        if (node.nodeType !== 1) return null
        const attrs = Object.fromEntries(
          Array.from(node.attributes, attribute => [attribute.name, attribute.value]),
        )
        const groups = groupImageNodes(Array.from(node.childNodes))
        const hasSlots = Boolean(slots.imgs) && groups.some(group => group.images)
        const children = groups.flatMap((group, groupIndex) => {
          const groupPath = path + '.group.' + groupIndex
          if (group.images && slots.imgs) {
            const renderSlot = () => h('div', {
              key: groupPath,
              class: 'image-group',
              'data-group-path': groupPath,
            }, slots.imgs({ images: group.images, groupId: groupPath }))
            if (contentProps.mode === 'broken') {
              detachedGroups.push(renderSlot)
              return []
            }
            return [renderSlot()]
          }
          const nodes = group.nodes || group.images.map(image => {
            const element = body.ownerDocument.createElement('img')
            element.setAttribute('src', image.src)
            element.setAttribute('alt', image.alt)
            return element
          })
          const rendered = nodes.map((child, index) => renderNode(child, groupPath + '.' + index))
          if (node.tagName === 'P' && hasSlots) {
            if (nodes.every(child => child.nodeType === 3 && !child.textContent.trim())) return []
            return [h('p', { ...attrs, key: groupPath }, rendered)]
          }
          return rendered
        })
        if (node.tagName === 'P' && hasSlots) return children
        return h(node.tagName.toLowerCase(), { ...attrs, key: path }, children)
      }

      const content = Array.from(body.childNodes, (node, index) => renderNode(node, String(index)))
      return h('div', { class: 'markdown-content' }, [
        ...content,
        ...detachedGroups.map(renderSlot => renderSlot()),
      ])
    }
  },
})
</script>

<template>
  <MarkdownContent :markdown="visibleMarkdown" :mode="mode">
    <template v-if="$slots.imgs" #imgs="slotProps">
      <slot name="imgs" v-bind="slotProps" />
    </template>
  </MarkdownContent>
</template>
