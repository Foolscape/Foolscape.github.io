<script setup>
import { ref, onMounted } from 'vue'

/**
 * APlayer 音乐播放器（固定底栏）
 * https://github.com/DIYgod/APlayer
 *
 * 歌单不是写死的：由 scripts/build-index.mjs 扫描 docs/public/music/ 生成
 * playlist.json，这里 fetch 过来。所以往那个文件夹丢歌就行，不用改代码。
 * 文件名写成「艺术家 - 标题.mp3」会自动拆成歌手和曲名。
 *
 * ⚠️ 两个必须注意的点：
 *  1. APlayer 会直接操作 document，不能在服务端渲染时执行 —— 所以用 onMounted
 *     里动态 import，SSR 阶段这段代码根本不会跑。
 *  2. 浏览器一律拦截「未经用户操作就出声」，所以 autoplay 必须关着，由用户点播放。
 */
const el = ref(null)

// 单例守卫：SPA 切页时组件可能重建，避免创建出两个播放器、放出两路声音
let created = false

async function loadTracks() {
  try {
    const res = await fetch('/music/playlist.json', { cache: 'no-cache' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data && data.audio) ? data.audio : []
  } catch {
    return []
  }
}

onMounted(async () => {
  if (created || !el.value) return

  const audio = await loadTracks()
  if (!audio.length) return

  try {
    const [mod] = await Promise.all([
      import('aplayer'),
      import('aplayer/dist/APlayer.min.css')
    ])
    const APlayer = mod.default || mod

    created = true

    new APlayer({
      container: el.value,
      fixed: true, // 固定底栏模式；想换成小圆球用 fixed: false + mini: true
      audio,
      autoplay: false, // 开着也没用，浏览器会拦
      preload: 'none', // 不点播放就不下载音频，省流量
      volume: 0.5,
      theme: '#f97316', // 跟站点主色一致的暖橙
      loop: 'all',
      order: 'list',
      listFolded: true,
      listMaxHeight: '240px',
      mutex: true,
      lrcType: 0, // 没有 .lrc 歌词文件
      storageName: 'foolscape-aplayer' // 记住音量和上次播到哪
    })

    // 底栏是固定定位的，给页面留出空间，别盖住正文
    document.documentElement.classList.add('has-aplayer-fixed')
  } catch (err) {
    // 播放器挂了不能影响看笔记
    console.warn('[APlayer] 初始化失败：', err)
  }
})
</script>

<template>
  <div ref="el" class="aplayer-host" />
</template>

<style scoped>
.aplayer-host {
  /* 固定底栏由 APlayer 自己定位，这里只是个挂载点 */
  line-height: 0;
}
</style>
