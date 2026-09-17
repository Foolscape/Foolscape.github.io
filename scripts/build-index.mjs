#!/usr/bin/env node
/**
 * 自动索引脚本 —— 这是整个笔记站「不用改配置」的关键
 *
 * 它每次在 dev / build 之前运行，做三件事：
 *   1. 扫描 docs/专业课/ 与 docs/public/资料/ 下所有课程文件夹（两边取并集）
 *   2. 保证每门课都有 index.md（没有就自动建一个）
 *   3. 扫描每门课的资料文件，自动生成「资料下载.md」
 *
 * 所以你新增一门课只需要：在 docs/专业课/ 下新建文件夹，或在
 * docs/public/资料/ 下新建文件夹。侧边栏由 config.mts 同步自动生成。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DOCS = path.join(ROOT, 'docs')
const COURSE_DIR = path.join(DOCS, '专业课')
const ASSET_ROOT = path.join(DOCS, 'public', '资料')

const GENERATED_BY = '本文件由 scripts/build-index.mjs 自动生成，请勿手动编辑（会被覆盖）。'

/** 列出目录下的子文件夹（忽略隐藏项） */
function listDirs(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
}

/** 递归列出目录下所有真实文件（忽略隐藏项），返回相对路径 */
function listFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fileKind(name) {
  const ext = path.extname(name).slice(1).toLowerCase()
  return ext ? ext.toUpperCase() : '文件'
}

/** 保证课程笔记文件夹与 index.md 存在 */
function ensureCourse(course) {
  const dir = path.join(COURSE_DIR, course)
  fs.mkdirSync(dir, { recursive: true })
  const indexFile = path.join(dir, 'index.md')
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(
      indexFile,
      `# ${course}\n\n` +
        `> 这门课的笔记总览。把本章节的 \`.md\` 笔记放到 \`docs/专业课/${course}/\` 下，侧边栏会自动出现。\n\n` +
        `## 笔记\n\n在左侧目录中选择章节开始阅读。\n\n` +
        `## 资料\n\n扫描件、课件、真题等放在 \`docs/public/资料/${course}/\`，会自动汇总到 [资料下载](./资料下载)。\n`,
      'utf-8'
    )
    console.log(`  + 新建课程页：docs/专业课/${course}/index.md`)
  }
}

/** 生成某门课的「资料下载.md」 */
function writeAssetPage(course) {
  const assetDir = path.join(ASSET_ROOT, course)
  fs.mkdirSync(assetDir, { recursive: true })

  const files = listFiles(assetDir).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
  const target = path.join(COURSE_DIR, course, '资料下载.md')

  const rows = files
    .map((rel) => {
      const size = fs.statSync(path.join(assetDir, rel)).size
      const url = encodeURI(`/资料/${course}/${rel}`)
      const label = rel.replace(/\//g, ' / ')
      return `| [${label}](${url}) | ${fileKind(rel)} | ${humanSize(size)} |`
    })
    .join('\n')

  const body = files.length
    ? `| 文件 | 类型 | 大小 |\n| --- | --- | --- |\n${rows}\n`
    : `_这门课还没有资料文件。_\n\n把 PDF、课件、扫描件拖进这个文件夹即可（文件名随意，中文也行）：\n\n\`\`\`\ndocs/public/资料/${course}/\n\`\`\`\n\n然后重新运行 \`npm run docs:dev\`（或直接推送到 GitHub），本页表格会自动填好。\n`

  fs.writeFileSync(
    target,
    `---\ntitle: 资料下载\n---\n\n<!-- ${GENERATED_BY} -->\n\n` +
      `# ${course} · 资料下载\n\n共 ${files.length} 个文件。\n\n${body}`,
    'utf-8'
  )
  console.log(`  ✓ 资料索引：docs/专业课/${course}/资料下载.md（${files.length} 个文件）`)
}

function main() {
  fs.mkdirSync(COURSE_DIR, { recursive: true })
  fs.mkdirSync(ASSET_ROOT, { recursive: true })

  const courses = [...new Set([...listDirs(COURSE_DIR), ...listDirs(ASSET_ROOT)])].sort((a, b) =>
    a.localeCompare(b, 'zh-CN')
  )

  console.log(`[build-index] 发现 ${courses.length} 门课程：${courses.join('、') || '（暂无）'}`)
  for (const course of courses) {
    ensureCourse(course)
    writeAssetPage(course)
  }
  console.log('[build-index] 完成。')
}

main()
