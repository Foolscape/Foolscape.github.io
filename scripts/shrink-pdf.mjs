#!/usr/bin/env node
/**
 * PDF 瘦身：把矢量 / 扫描 PDF 逐页栅格化成 JPEG，重新封装。
 *
 * 用途：手写笔记用触控笔导出时，每一笔都是精确到小数后 6 位的矢量路径，
 *       一页能有 7 万条绘图指令 —— 体积非常大，而且网页上根本看不出区别。
 *       栅格化后体积通常能降到 1/4 ～ 1/10。
 *
 * 用法：
 *   npm run pdf:shrink -- "docs/public/资料/xxx/笔记.pdf"
 *   npm run pdf:shrink -- 输入.pdf 输出.pdf --dpi=150 --quality=70 --gray
 *
 * 参数：
 *   --dpi=N       渲染精度，默认 150（手写笔记 150 足够；越大越清晰也越大）
 *   --quality=N   JPEG 质量 1-100，默认 70
 *   --gray        转灰度（纯黑白手写笔记可以开，省 15%～20%）
 *   --pages=a-b   只处理指定页范围（用于试参数）
 *   --jpg=N:文件  不生成 PDF，只把第 N 页导出成 JPG，方便肉眼对比画质
 *
 * 换成图片后：文字不可选中、不可搜索，放大到很大时会略微发虚 —— 这是代价。
 * 原文件不会被修改，请自行对比确认后再替换。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createCanvas } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// ---------- 参数解析 ----------
const opts = { dpi: 150, quality: 70, gray: false, pages: null, jpg: null, format: 'jpeg' }
const positional = []

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--dpi=')) opts.dpi = Number(arg.slice(6))
  else if (arg.startsWith('--quality=')) opts.quality = Number(arg.slice(10))
  else if (arg === '--gray') opts.gray = true
  else if (arg.startsWith('--format=')) opts.format = arg.slice(9)
  else if (arg.startsWith('--pages=')) {
    const [a, b] = arg.slice(8).split('-')
    opts.pages = [Number(a), Number(b ?? a)]
  } else if (arg.startsWith('--jpg=')) {
    const [n, file] = arg.slice(6).split(':')
    opts.jpg = { page: Number(n), file }
  } else positional.push(arg)
}

const input = positional[0]
if (!input || !fs.existsSync(input)) {
  console.error('用法: node scripts/shrink-pdf.mjs <输入.pdf> [输出.pdf] [--dpi=150] [--quality=70] [--gray]')
  process.exit(1)
}
const output = positional[1] || input.replace(/\.pdf$/i, `-压缩.pdf`)

// ---------- 渲染一页 ----------
async function renderPage(page, scale) {
  const viewport = page.getViewport({ scale })
  const w = Math.ceil(viewport.width)
  const h = Math.ceil(viewport.height)
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')

  // 先铺白底：透明区域在 JPEG 里会变黑
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)

  await page.render({ canvasContext: ctx, viewport, canvas, intent: 'print' }).promise

  if (opts.gray) {
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
      d[i] = d[i + 1] = d[i + 2] = v
    }
    ctx.putImageData(img, 0, 0)
  }

  return { canvas, w, h, ptW: viewport.width / scale, ptH: viewport.height / scale }
}

// ⚠️ 注意：@napi-rs/canvas 的 toBuffer('image/jpeg', q) 里 q 是 **0-100**，
// 不是浏览器 Canvas 那种 0-1。传 0-1 会被钳到最低画质（而且不报错！）。
// --format=png 是无损的，没有 JPEG 块状噪点，但体积大不少。
const encode = (canvas) =>
  opts.format === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg', opts.quality)

// ---------- 主流程 ----------
const data = new Uint8Array(fs.readFileSync(input))
const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
console.log(`输入: ${input}`)
console.log(`原始: ${(fs.statSync(input).size / 1024 / 1024).toFixed(2)} MB, ${doc.numPages} 页`)
console.log(`参数: ${opts.dpi} DPI, JPEG 质量 ${opts.quality}${opts.gray ? ', 灰度' : ', 彩色'}`)

const scale = opts.dpi / 72

// 只导一张 JPG 用于肉眼对比画质
if (opts.jpg) {
  const page = await doc.getPage(opts.jpg.page)
  const { canvas } = await renderPage(page, scale)
  fs.writeFileSync(opts.jpg.file, jpeg(canvas))
  console.log(`已导出第 ${opts.jpg.page} 页 -> ${opts.jpg.file}`)
  process.exit(0)
}

const [from, to] = opts.pages ?? [1, doc.numPages]
const outDoc = await PDFDocument.create()
outDoc.setTitle(path.basename(input, '.pdf'))
let totalJpg = 0
const t0 = Date.now()

for (let n = from; n <= to; n++) {
  const page = await doc.getPage(n)
  const { canvas, ptW, ptH } = await renderPage(page, scale)
  const jpg = encode(canvas)
  totalJpg += jpg.length

  const embedded = opts.format === 'png' ? await outDoc.embedPng(jpg) : await outDoc.embedJpg(jpg)
  const outPage = outDoc.addPage([ptW, ptH])
  outPage.drawImage(embedded, { x: 0, y: 0, width: ptW, height: ptH })

  if (n % 10 === 0 || n === to) {
    const secs = ((Date.now() - t0) / 1000).toFixed(0)
    console.log(`  已处理 ${n - from + 1}/${to - from + 1} 页（${secs}s）`)
  }
}

const bytes = await outDoc.save({ useObjectStreams: true })
fs.writeFileSync(output, bytes)

const before = fs.statSync(input).size
const after = bytes.length
console.log('')
console.log(`输出: ${output}`)
console.log(`栅格数据合计: ${(totalJpg / 1024 / 1024).toFixed(2)} MB`)
console.log(`最终大小    : ${(after / 1024 / 1024).toFixed(2)} MB`)
console.log(`压缩比      : ${(before / after).toFixed(2)}x  （省 ${(100 - (after / before) * 100).toFixed(0)}%）`)
console.log(`每页平均    : ${(after / (to - from + 1) / 1024).toFixed(0)} KB`)
