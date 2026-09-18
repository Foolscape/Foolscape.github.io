import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import PdfViewer from './components/PdfViewer.vue'
import MaterialList from './components/MaterialList.vue'
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
    // 全局注册，任意 .md 里都能直接用
    // <PdfViewer src="..." />      —— 嵌单个 PDF（适合放进章节笔记里）
    // <MaterialList :files='...' /> —— 资料列表 + 共享预览区（课程页自动生成）
    app.component('PdfViewer', PdfViewer)
    app.component('MaterialList', MaterialList)
  }
}
