<script setup>
import { onMounted } from 'vue'

/**
 * 首页动效控制器。
 *
 * 做两件事：
 *  1. 滚动入场 —— 元素进入视口时才浮现（元素初始 opacity:0 写在 custom.css 里）
 *  2. 数字滚动 —— 统计数字进入视口时从 0 滚上去
 *
 * ⚠️ 因为元素默认是隐藏的，一旦这个脚本没跑起来，内容就会看不见。
 *    所以有两道兜底：
 *      · <noscript> 里的样式 —— 关掉 JS 时直接显示
 *      · config.mts head 里的一段内联脚本 —— 2 秒后检查本脚本是否执行过，
 *        没执行就把所有元素显示出来
 */
const REVEAL_SELECTOR =
  '.home-stat, .home-dash .course-row, .home-dash .log-item, .home-dash .home-h2'

onMounted(() => {
  // 给兜底脚本留个标记：动效脚本已经跑起来了
  window.__fxReady = true

  const all = document.querySelectorAll(REVEAL_SELECTOR)
  const showAll = () => all.forEach((el) => el.classList.add('is-in'))

  const nums = document.querySelectorAll('.home-stat__num')
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

  // 系统开了「减少动态效果」就直接全显示、不滚数字
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll()
    return
  }

  // 1) 滚动入场
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in')
          reveal.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.1 }
  )
  all.forEach((el) => reveal.observe(el))

  // 2) 数字滚动：比卡片浮现稍晚一点开始，看起来像是「卡片浮上来，数字跟着跳上去」
  const counting = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target
          counting.unobserve(el)
          setTimeout(() => countUp(el), 260)
        }
      }
    },
    { threshold: 0.4 }
  )
  nums.forEach((n) => counting.observe(n))
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
