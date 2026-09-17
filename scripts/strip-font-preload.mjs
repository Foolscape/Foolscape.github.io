#!/usr/bin/env node
/**
 * 构建后处理：移除 VitePress 硬注入的 Inter 字体预加载
 *
 * 为什么需要这一步：
 *   VitePress 在 node 内部用 additionalHeadTags 注入
 *     <link rel="preload" as="font" href="/assets/inter-roman-latin.*.woff2">
 *   而这段是在**用户 transformHead 之后**才追加的，所以配置层面删不掉。
 *
 * 为什么要删：
 *   Inter 只覆盖拉丁 / 西里尔 / 希腊字母，中文站根本不会用到它。
 *   但 rel=preload 是**强制下载**——不管有没有用到都会拉 66 KB，
 *   而且优先级很高，会和 CSS 抢带宽。对一个以中文为主的笔记站纯属浪费。
 *
 * 由 package.json 的 docs:build 在 vitepress build 之后自动调用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(ROOT, 'docs', '.vitepress', 'dist')

const INTER_PRELOAD = /<link rel="preload" href="[^"]*inter-[^"]*\.woff2"[^>]*>\s*/g

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkHtml(full))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

if (!fs.existsSync(DIST)) {
  console.warn('[strip-font-preload] 没找到构建产物目录，跳过。')
  process.exit(0)
}

let changed = 0
for (const file of walkHtml(DIST)) {
  const raw = fs.readFileSync(file, 'utf-8')
  const next = raw.replace(INTER_PRELOAD, '')
  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf-8')
    changed++
  }
}

console.log(`[strip-font-preload] 已从 ${changed} 个页面移除 Inter 字体预加载。`)
