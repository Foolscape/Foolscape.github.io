<script setup>
import { ref, computed } from 'vue'

/**
 * 资料列表 + 单一共享预览区
 *
 * 为什么不是「每个文件一个预览条」：一学期攒下十几份作业 PDF 时，
 * 页面上会堆出十几个长得一模一样的方框，又长又难找。
 * 这里改成：紧凑的一行一个文件，预览区永远只有一个，点谁就加载谁。
 *
 * 列表是服务端渲染进 HTML 的（所以本地搜索能搜到文件名，爬虫也看得到），
 * 文件名本身就是 <a href>，「打开」「下载」也都是真实链接 —— 关掉 JS 也能用。
 *
 * 由 scripts/build-index.mjs 自动生成调用，一般不需要手写。
 * 想单独用也行：<MaterialList :files='[{"name":"x.pdf","url":"/资料/x.pdf","type":"PDF","size":"1 MB"}]' />
 */
const props = defineProps({
  files: { type: Array, default: () => [] },
  height: { type: String, default: '78vh' }
})

const activeUrl = ref('')
const expanded = ref(false)

const active = computed(() => props.files.find((f) => f.url === activeUrl.value) || null)

function preview(file) {
  // 点同一个文件 → 收起（像个开关）
  if (activeUrl.value === file.url && expanded.value) {
    expanded.value = false
    return
  }
  activeUrl.value = file.url
  expanded.value = true
}
</script>

<template>
  <div class="mat-list">
    <table>
      <thead>
        <tr>
          <th>文件</th>
          <th class="mat-list__type">类型</th>
          <th class="mat-list__size">大小</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="file in files"
          :key="file.url"
          :class="{ 'is-active': file.url === activeUrl && expanded }"
        >
          <td>
            <button class="mat-list__name" type="button" @click="preview(file)">
              <span class="mat-list__icon">📄</span>{{ file.name }}
            </button>
            <a class="mat-list__link" :href="file.url" target="_blank" rel="noopener">打开</a>
            <a class="mat-list__link" :href="file.url" download>下载</a>
          </td>
          <td class="mat-list__type">{{ file.type }}</td>
          <td class="mat-list__size">{{ file.size }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="expanded && active" class="mat-list__viewer">
      <div class="mat-list__bar">
        <span class="mat-list__title">📄 {{ active.name }}</span>
        <span class="mat-list__actions">
          <button type="button" class="mat-list__btn" @click="expanded = false">收起预览</button>
          <a class="mat-list__btn" :href="active.url" target="_blank" rel="noopener">新标签页</a>
        </span>
      </div>
      <iframe class="mat-list__frame" :src="active.url" :title="active.name" :style="{ height }" />
    </div>
    <p v-else class="mat-list__hint">
      点文件名即可在本页预览。手机浏览器可能不支持内嵌 PDF，那就用「打开」或「下载」。
    </p>
  </div>
</template>

<style scoped>
.mat-list {
  margin: 16px 0 24px;
}

.mat-list table {
  width: 100%;
  margin: 0;
}

.mat-list__name {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-align: left;
  cursor: pointer;
}

.mat-list__name:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.mat-list__icon {
  margin-right: 5px;
  font-size: 0.9em;
}

.mat-list__link {
  margin-left: 10px;
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  text-decoration: none;
  white-space: nowrap;
}

.mat-list__link:hover {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
}

.mat-list__type,
.mat-list__size {
  white-space: nowrap;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.mat-list tbody tr.is-active {
  background: var(--vp-c-brand-soft) !important;
}

/* 预览区 */
.mat-list__viewer {
  margin-top: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}

.mat-list__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
}

.mat-list__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.mat-list__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.mat-list__btn {
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
  transition: color 0.2s, border-color 0.2s;
}

.mat-list__btn:hover {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.mat-list__frame {
  display: block;
  width: 100%;
  border: 0;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.mat-list__hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

@media print {
  .mat-list__viewer,
  .mat-list__hint,
  .mat-list__link {
    display: none !important;
  }
}
</style>
