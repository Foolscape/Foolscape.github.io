import DefaultTheme from 'vitepress/theme'
import PdfViewer from './components/PdfViewer.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 全局注册，任意 .md 里都能直接写 <PdfViewer src="..." />
    app.component('PdfViewer', PdfViewer)
  }
}
