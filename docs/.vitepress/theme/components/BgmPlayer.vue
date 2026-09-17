<script setup>
import { ref } from 'vue'

/**
 * 背景音乐播放器（点击播放，不是自动播放）
 *
 * ⚠️ 为什么不做自动播放：浏览器一律拦截「未经用户操作就出声」的音频，
 *    Chrome / Safari / Firefox 都一样。这是浏览器的硬规定，改不了。
 *
 * ✅ 播放状态在全站页面切换之间保持 —— VitePress 是单页应用，切页不刷新，
 *    音频实例挂在模块级单例上，所以不会因为换页面而中断。
 *
 * 换音乐：把音频文件放到 docs/public/music/ 下，然后往下面的 tracks 里填路径。
 *        路径以 /music/ 开头（public 目录会映射到网站根目录）。
 *        填一首就单曲循环；填多首就按顺序自动切换。
 */
const tracks = [
  '/music/bgm.mp3',
]

let audio = null
let index = 0
const playing = ref(false)
const failed = ref(false)

function getAudio() {
  if (audio) return audio
  if (typeof window === 'undefined') return null // SSR 时不能碰 Audio

  audio = new Audio()
  audio.volume = 0.45
  audio.loop = tracks.length <= 1
  if (tracks.length) audio.src = tracks[0]

  audio.addEventListener('ended', () => {
    if (tracks.length <= 1) return
    index = (index + 1) % tracks.length
    audio.src = tracks[index]
    audio.play().catch(() => {})
  })

  audio.addEventListener('error', () => {
    failed.value = true
    playing.value = false
  })

  return audio
}

function toggle() {
  if (tracks.length === 0) return
  const a = getAudio()
  if (!a) return

  if (playing.value) {
    a.pause()
    playing.value = false
  } else {
    a.play()
      .then(() => {
        playing.value = true
      })
      .catch(() => {
        playing.value = false
      })
  }
}
</script>

<template>
  <div v-if="tracks.length" class="bgm">
    <p v-if="failed" class="bgm__tip">
      音频加载失败。确认文件放在 <code>docs/public/music/</code> 下，且路径填对了。
    </p>
    <button
      type="button"
      class="bgm__btn"
      :class="{ 'bgm__btn--on': playing }"
      :title="playing ? '暂停背景音乐' : '播放背景音乐'"
      :aria-label="playing ? '暂停背景音乐' : '播放背景音乐'"
      @click="toggle"
    >
      <span v-if="playing" class="bgm__bars"><i></i><i></i><i></i></span>
      <span v-else class="bgm__note">♪</span>
    </button>
  </div>
</template>

<style scoped>
.bgm {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 40;
}

.bgm__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: transform 0.2s ease, color 0.2s ease, border-color 0.2s ease,
    background-color 0.2s ease;
}

.bgm__btn:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-brand-1);
}

.bgm__btn--on {
  border-color: var(--vp-c-brand-3);
  background: var(--vp-c-brand-3);
  color: #fff;
}

.bgm__btn--on:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  color: #fff;
}

.bgm__note {
  font-size: 18px;
  line-height: 1;
}

/* 播放中的三根跳动柱子 */
.bgm__bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.bgm__bars i {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: currentColor;
  animation: bgm-bar 0.9s ease-in-out infinite;
}
.bgm__bars i:nth-child(1) {
  height: 8px;
  animation-delay: 0s;
}
.bgm__bars i:nth-child(2) {
  height: 15px;
  animation-delay: 0.15s;
}
.bgm__bars i:nth-child(3) {
  height: 11px;
  animation-delay: 0.3s;
}

@keyframes bgm-bar {
  0%,
  100% {
    transform: scaleY(0.45);
  }
  50% {
    transform: scaleY(1);
  }
}

.bgm__tip {
  position: absolute;
  right: 0;
  bottom: 52px;
  width: 220px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

@media print {
  .bgm {
    display: none !important;
  }
}
</style>
