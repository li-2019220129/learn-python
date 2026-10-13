<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({ images: { type: Array, required: true } })
const index = ref(0)
const current = computed(() => props.images[index.value])
watch(() => props.images.length, length => {
  if (index.value >= length) index.value = 0
})

function move(offset) {
  index.value = (index.value + offset + props.images.length) % props.images.length
}
</script>

<template>
  <div class="carousel" data-carousel>
    <img v-if="current" :src="current.src" :alt="current.alt">
    <div class="carousel-controls">
      <button type="button" aria-label="上一张" @click="move(-1)">←</button>
      <span>{{ index + 1 }} / {{ images.length }} · {{ current?.alt }}</span>
      <button type="button" aria-label="下一张" @click="move(1)">→</button>
    </div>
  </div>
</template>
