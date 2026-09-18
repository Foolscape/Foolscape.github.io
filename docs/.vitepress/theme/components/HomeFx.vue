<script setup>
import { onMounted } from 'vue'

/**
 * 首页动效：统计数字滚动。
 *
 * 只做 JS 才能做的那一件事 —— 其余动效（入场错落、悬浮、渐变流动、
 * 光斑漂移）全部用纯 CSS 实现，见 custom.css 的「首页动效」一节。
 *
 * 尊重系统的「减少动态效果」设置：开了就直接显示最终数字。
 * 关掉 JS 也没关系 —— 服务端渲染出来的就是真实数字，不会显示成 0。
 */
onMounted(() => {
  const nums = document.querySelectorAll('.home-stat__num')
  if (!nums.length) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const countUp = (el) => {
    const target = parseInt(el.textContent, 10)
    if (!Number.isFinite(target) || target <= 0) return

    const duration = 700
    const start = performance.now()
    el.textContent = '0'

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      el.textContent = String(Math.round(target * eased))
      if (p < 1) requestAnimationFrame(tick)
      else el.textContent = String(target)
    }
    requestAnimationFrame(tick)
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          countUp(entry.target)
          io.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.4 }
  )

  nums.forEach((n) => io.observe(n))
})
</script>

<template>
  <span class="home-fx" aria-hidden="true" />
</template>

<style scoped>
.home-fx {
  display: none;
}
</style>
