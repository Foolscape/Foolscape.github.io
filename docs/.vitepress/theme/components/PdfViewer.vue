<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** PDF 路径，例如 /资料/大一春夏/常微分方程/ode笔记.pdf */
  src: { type: String, required: true },
  /** 显示名，不填就用文件名 */
  title: { type: String, default: '' },
  /** 展开后的高度 */
  height: { type: String, default: '78vh' },
  /** 是否默认展开。默认折叠，避免一进页面就下载十几 MB */
  open: { type: Boolean, default: false }
})

const expanded = ref(props.open)

const name = computed(() => {
  if (props.title) return props.title
  const raw = props.src.split('/').pop() || 'PDF'
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
})
</script>

<template>
  <div class="pdf-viewer">
    <div class="pdf-viewer__bar">
      <span class="pdf-viewer__name" :title="name">📄 {{ name }}</span>
      <span class="pdf-viewer__actions">
        <button
          type="button"
          class="pdf-viewer__btn pdf-viewer__btn--primary"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起预览' : '在线预览' }}
        </button>
        <a class="pdf-viewer__btn" :href="src" target="_blank" rel="noopener">新标签页</a>
        <a class="pdf-viewer__btn" :href="src" download>下载</a>
      </span>
    </div>

    <iframe
      v-if="expanded"
      class="pdf-viewer__frame"
      :src="src"
      :title="name"
      :style="{ height }"
    />
    <p v-else class="pdf-viewer__hint">
      点「在线预览」在本页打开。手机浏览器可能不支持内嵌 PDF，那就点「新标签页」或「下载」。
    </p>
  </div>
</template>

<style scoped>
.pdf-viewer {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.pdf-viewer__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
}

.pdf-viewer__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.pdf-viewer__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.pdf-viewer__btn {
  display: inline-block;
  padding: 7px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;
}
.pdf-viewer__btn:hover {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.pdf-viewer__btn--primary {
  border-color: var(--vp-c-brand-3);
  background: var(--vp-c-brand-3);
  color: #fff;
}
.pdf-viewer__btn--primary:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-2);
  color: #fff;
}

.pdf-viewer__frame {
  display: block;
  width: 100%;
  border: 0;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.pdf-viewer__hint {
  margin: 0;
  padding: 0 14px 12px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
