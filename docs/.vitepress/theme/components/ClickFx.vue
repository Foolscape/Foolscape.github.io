<script setup>
import { onMounted, onUnmounted } from 'vue'

/**
 * 鼠标点击动效：一圈扩散的涟漪 + 几点向外迸射的小粒子。
 *
 * 几个考虑：
 *  · 只处理主键（左键 / 触摸），右键菜单不触发
 *  · 整层 pointer-events: none，绝不拦截点击
 *  · 元素在动画结束时就删掉，另外加一道定时器兜底，防止动画事件没触发导致堆积
 *  · 尊重 prefers-reduced-motion，开了就完全不挂监听
 */
let layer = null
let handler = null

function spawn(x, y) {
  const ring = document.createElement('span')
  ring.className = 'click-fx'
  ring.style.left = `${x}px`
  ring.style.top = `${y}px`

  for (let i = 0; i < 6; i++) {
    const spark = document.createElement('i')
    spark.className = 'click-spark'
    spark.style.setProperty('--a', `${i * 60}deg`)
    ring.appendChild(spark)
  }

  const remove = () => ring.remove()
  ring.addEventListener('animationend', (e) => {
    // 粒子的动画也会冒泡上来，只在涟漪本身结束时清理
    if (e.target === ring) remove()
  })
  setTimeout(remove, 1400) // 兜底

  layer.appendChild(ring)
}

onMounted(() => {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  layer = document.createElement('div')
  layer.className = 'click-fx-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  handler = (e) => {
    if (e.button !== 0) return // 只认左键
    if (!e.isPrimary) return // 多点触控只响应第一个
    spawn(e.clientX, e.clientY)
  }

  window.addEventListener('pointerdown', handler, { passive: true })
})

onUnmounted(() => {
  if (handler) window.removeEventListener('pointerdown', handler)
  if (layer) layer.remove()
})
</script>

<template>
  <span class="click-fx-mount" aria-hidden="true" />
</template>

<style scoped>
.click-fx-mount {
  display: none;
}
</style>
