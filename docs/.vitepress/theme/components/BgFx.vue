<script setup>
import { onMounted, onUnmounted } from 'vue'

/**
 * 背景特效：鼠标跟随光晕。
 *
 * 一束很淡的暖光跟着光标走，用 lerp 缓动追上去，所以是「飘」过去而不是硬贴。
 *
 * 三个不做的情况：
 *  · 系统开了「减少动态效果」
 *  · 触摸设备（没有鼠标，光晕会僵在某个点）
 *  · 服务端渲染阶段
 */
let el = null
let onMove = null
let raf = 0

onMounted(() => {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  el = document.createElement('div')
  el.className = 'spotlight'
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)

  let tx = window.innerWidth / 2
  let ty = window.innerHeight / 3
  let x = tx
  let y = ty

  const tick = () => {
    // lerp 缓动：每次只走剩余距离的 14%，所以拖尾感自然
    x += (tx - x) * 0.14
    y += (ty - y) * 0.14
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`

    // 收敛了就停掉 rAF，别让它在空闲时还一直跑
    if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) {
      raf = requestAnimationFrame(tick)
    } else {
      raf = 0
    }
  }

  onMove = (e) => {
    tx = e.clientX
    ty = e.clientY
    el.style.opacity = '1'
    if (!raf) raf = requestAnimationFrame(tick)
  }

  window.addEventListener('pointermove', onMove, { passive: true })
})

onUnmounted(() => {
  if (onMove) window.removeEventListener('pointermove', onMove)
  if (raf) cancelAnimationFrame(raf)
  if (el) el.remove()
})
</script>

<template>
  <span class="bg-fx-mount" aria-hidden="true" />
</template>

<style scoped>
.bg-fx-mount {
  display: none;
}
</style>
