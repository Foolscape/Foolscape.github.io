import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import PdfViewer from './components/PdfViewer.vue'
import BgmPlayer from './components/BgmPlayer.vue'
import './custom.css'

export default {
  extends: DefaultTheme,

  Layout() {
    return h(DefaultTheme.Layout, null, {
      // 挂在 layout-bottom：全站每个页面都有，而且 SPA 切页时组件不被销毁，
      // 音频实例是模块级单例，所以音乐能跨页面连续播放不中断
      'layout-bottom': () => h(BgmPlayer)
    })
  },

  enhanceApp({ app }) {
    // 全局注册，任意 .md 里都能直接写 <PdfViewer src="..." />
    app.component('PdfViewer', PdfViewer)
  }
}
