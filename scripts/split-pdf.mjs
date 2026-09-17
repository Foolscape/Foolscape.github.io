#!/usr/bin/env node
/**
 * 无损拆分 PDF：按页范围切成多个文件，矢量内容原样搬运。
 *
 * 为什么用它：
 *   手写笔记导出成矢量 PDF 时体积很大，整份加载慢。按章节拆开后每次只看一部分，
 *   加载快 —— 而且画质和原文件**完全一致**（不像栅格化会引入分辨率上限和 JPEG 噪点）。
 *
 * 用法：
 *   node scripts/split-pdf.mjs <输入.pdf> <输出目录> <名字前缀> <起页-止页> [更多范围...]
 *
 * 例：
 *   node scripts/split-pdf.mjs 原版.pdf out 笔记 1-15 16-37 38-52
 *   → out/笔记-P01-15.pdf、out/笔记-P16-37.pdf、out/笔记-P38-52.pdf
 *
 * 页码是 1 起的、含两端。页码位数会按总页数自动补零，保证文件名排序正确。
 */
import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'

const [input, outDir, prefix, ...ranges] = process.argv.slice(2)

if (!input || !outDir || !prefix || ranges.length === 0) {
  console.error('用法: node scripts/split-pdf.mjs <输入.pdf> <输出目录> <名字前缀> <起页-止页> [更多范围...]')
  console.error('例:   node scripts/split-pdf.mjs a.pdf out 笔记 1-15 16-37')
  process.exit(1)
}
if (!fs.existsSync(input)) {
  console.error(`找不到输入文件: ${input}`)
  process.exit(1)
}

const src = await PDFDocument.load(fs.readFileSync(input), { updateMetadata: false })
const total = src.getPageCount()
const pad = String(total).length

fs.mkdirSync(outDir, { recursive: true })
console.log(`输入: ${input}（${total} 页，${(fs.statSync(input).size / 1024 / 1024).toFixed(2)} MB）`)

let sum = 0
for (const range of ranges) {
  const m = range.match(/^(\d+)-(\d+)$/)
  if (!m) {
    console.error(`范围格式错误: ${range}（应为 起页-止页）`)
    process.exit(1)
  }
  const from = Number(m[1])
  const to = Number(m[2])
  if (from < 1 || to > total || from > to) {
    console.error(`范围 ${range} 超出有效页范围 1-${total}`)
    process.exit(1)
  }

  const idxs = []
  for (let p = from; p <= to; p++) idxs.push(p - 1) // pdf-lib 页码从 0 起

  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, idxs)
  for (const page of pages) out.addPage(page)
  const bytes = await out.save({ useObjectStreams: true })

  const name = `${prefix}-P${String(from).padStart(pad, '0')}-${String(to).padStart(pad, '0')}.pdf`
  fs.writeFileSync(path.join(outDir, name), bytes)
  sum += bytes.length
  console.log(
    `  ${(bytes.length / 1024 / 1024).toFixed(2).padStart(6)} MB  ${name}  (${to - from + 1} 页)`
  )
}

console.log(`合计: ${(sum / 1024 / 1024).toFixed(2)} MB，${ranges.length} 个文件（画质与原件一致，无栅格化损失）`)
