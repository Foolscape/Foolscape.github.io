#!/usr/bin/env node
/**
 * 自动索引脚本 —— 这是整个笔记站「不用改配置」的关键
 *
 * 目录约定：docs/专业课/<学期>/<课程>/
 *   例：docs/专业课/大二秋冬/概率论与数理统计/
 *
 * 每次在 dev / build 之前运行，做三件事：
 *   1. 扫描 docs/专业课/ 与 docs/public/资料/ 下的学期与课程（两边取并集）
 *   2. 保证每门课都有 index.md（没有就自动建一个）
 *   3. 扫描每门课的资料文件，自动生成「资料下载.md」
 *
 * 新增一门课只需要建个文件夹；新学期也一样。侧边栏由 config.mts 同步自动生成。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DOCS = path.join(ROOT, 'docs')
const COURSE_ROOT = path.join(DOCS, '专业课')
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

/** 列出目录下的 .md 文件 */
function listMd(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
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
function ensureCourse(semester, course) {
  const dir = path.join(COURSE_ROOT, semester, course)
  fs.mkdirSync(dir, { recursive: true })
  const indexFile = path.join(dir, 'index.md')
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(
      indexFile,
      `# ${course}\n\n` +
        `> ${semester} · ${course} 的笔记总览。把章节 \`.md\` 放到 \`docs/专业课/${semester}/${course}/\` 下，侧边栏会自动出现。\n\n` +
        `## 课程信息\n\n| 项目 | 内容 |\n| --- | --- |\n| 学期 | ${semester} |\n| 教材 | 待填 |\n| 教师 | 待填 |\n| 考核 | 待填 |\n\n` +
        `## 笔记\n\n在左侧目录中选择章节开始阅读。\n\n` +
        `## 资料\n\n把你自己产出的笔记、扫描件放到 \`docs/public/资料/${semester}/${course}/\`，会自动列在本页末尾。\n`,
      'utf-8'
    )
    console.log(`  + 新建课程页：docs/专业课/${semester}/${course}/index.md`)
  }
}

/** 资料列表在课程页里的标记，方便原地替换与整段移除 */
const MARK_START = '<!-- 资料列表：开始（自动生成，勿手改这一段） -->'
const MARK_END = '<!-- 资料列表：结束 -->'

/**
 * 资料栏目的展示顺序。写在里面的排前面，没写的按拼音排在其后。
 * 想调整顺序改这一行就行（比如把「真题」提到最前）。
 */
const FOLDER_ORDER = ['作业', '笔记', '真题', '课件']

function sortFolders(list) {
  return [...list].sort((a, b) => {
    const ia = FOLDER_ORDER.indexOf(a)
    const ib = FOLDER_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return a.localeCompare(b, 'zh-CN', { numeric: true })
  })
}

/** 转义 HTML 属性值里的特殊字符 */
function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * 渲染资料列表区块：一张紧凑列表 + 单一共享预览区
 * （组件在 theme/components/MaterialList.vue）
 *
 * 以前是「每个 PDF 一个预览条」，一学期攒下十几份作业就会堆出十几个一样的方框。
 * 改成列表 + 共享预览区之后，无论多少文件，预览区永远只有一个。
 */
function renderAssetBlock(semester, course, files, folders) {
  const assetDir = path.join(ASSET_ROOT, semester, course)

  const items = files.map((rel) => ({
    name: rel.replace(/\//g, ' / '),
    url: encodeURI(`/资料/${semester}/${course}/${rel}`),
    type: fileKind(rel),
    size: humanSize(fs.statSync(path.join(assetDir, rel)).size)
  }))

  // 属性都用单引号包，所以只需转义 & 和 '（组件里会被解码回合法 JSON）
  const esc = (json) => json.replace(/&/g, '&amp;').replace(/'/g, '&#39;')
  const folderAttr = folders.length ? ` :folders='${esc(JSON.stringify(folders))}'` : ''

  return [
    MARK_START,
    '',
    '## 资料文件',
    '',
    `共 ${files.length} 个文件。`,
    '',
    `<MaterialList :files='${esc(JSON.stringify(items))}'${folderAttr} />`,
    '',
    MARK_END
  ].join('\n')
}

/**
 * 把资料列表**合并进课程页本身**，不再单独开一个「资料下载」页。
 *
 * 列表用标记包起来：每次构建原地替换，文件删光时整段移除。
 * 标记不存在时追加到页面末尾 —— 所以你可以把它整段拖到任意位置，位置会被保留。
 */
function syncCourseAssets(semester, course) {
  const assetDir = path.join(ASSET_ROOT, semester, course)
  fs.mkdirSync(assetDir, { recursive: true })

  const files = listFiles(assetDir).sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
  // 子文件夹 = 资料栏目（作业 / 笔记 / 真题……）。
  // 空的也带上，这样先把栏目建好、之后再往里放文件，栏目不会消失。
  const folders = sortFolders(listDirs(assetDir))
  const dir = path.join(COURSE_ROOT, semester, course)
  const indexFile = path.join(dir, 'index.md')

  // 迁移：删掉早期版本生成的独立「资料下载」页
  const legacy = path.join(dir, '资料下载.md')
  if (fs.existsSync(legacy)) {
    fs.rmSync(legacy)
    console.log(`  - 移除旧的独立资料页：docs/专业课/${semester}/${course}/资料下载.md`)
  }

  if (fs.existsSync(indexFile)) {
    const raw = fs.readFileSync(indexFile, 'utf-8')
    const block = files.length || folders.length ? renderAssetBlock(semester, course, files, folders) : ''
    const s = raw.indexOf(MARK_START)
    const e = raw.indexOf(MARK_END)
    let next

    if (s !== -1 && e > s) {
      // 已有标记：原地替换；没有文件时连标记整段删掉
      const before = raw.slice(0, s)
      const after = raw.slice(e + MARK_END.length)
      if (block) {
        next = `${before}${block}${after}`
      } else {
        const b = before.replace(/\s+$/, '')
        const a = after.replace(/^\s+/, '')
        next = a ? `${b}\n\n${a}` : `${b}\n`
      }
    } else if (block) {
      // 首次出现：追加到页面末尾
      next = `${raw.replace(/\s*$/, '')}\n\n${block}\n`
    }

    if (next !== undefined && next !== raw) {
      fs.writeFileSync(indexFile, next, 'utf-8')
      console.log(
        block
          ? `  ✓ 资料列表已并入课程页：${semester}/${course}/index.md（${files.length} 个文件` +
              (folders.length ? `，${folders.length} 个栏目：${folders.join('、')}` : '') +
              '）'
          : `  - 无资料，移除课程页里的资料列表：${semester}/${course}/index.md`
      )
    }
  }

  // 安全网：还留着指向旧「资料下载」页的链接会导致死链、构建失败
  for (const f of listMd(dir)) {
    if (fs.readFileSync(path.join(dir, f), 'utf-8').includes('](./资料下载)')) {
      console.warn(
        `[build-index] ⚠ ${semester}/${course}/${f} 里还有 [资料下载](./资料下载) 这种链接，` +
          `那个页面已经不存在了，构建会因为死链失败 —— 改成 [资料文件](#资料文件) 或直接删掉。`
      )
    }
  }
}

/** 生成学期总览页 */
function writeSemesterPage(semester, courses) {
  const target = path.join(COURSE_ROOT, semester, 'index.md')
  const list = courses.length
    ? courses.map((c) => `- [${c}](./${c}/)`).join('\n')
    : '_这个学期还没有课程。_'
  fs.writeFileSync(
    target,
    `---\ntitle: ${semester}\n---\n\n<!-- ${GENERATED_BY} -->\n\n` +
      `# ${semester}\n\n本学期的课程笔记，共 ${courses.length} 门。\n\n${list}\n\n` +
      `> 这份列表会自动更新。新增课程只需在 \`docs/专业课/${semester}/\` 下建个文件夹。\n`,
    'utf-8'
  )
  console.log(`  ✓ 学期总览：docs/专业课/${semester}/index.md（${courses.length} 门课）`)
}

/** 章节进度条的标记 */
const PROG_START = '<!-- 章节进度：开始（自动生成，勿手改这一段） -->'
const PROG_END = '<!-- 章节进度：结束 -->'

/**
 * 统计课程页「章节规划」里的复选框（`- [x]` / `- [ ]`），在页面里画一条进度条。
 * 没有复选框的课程不显示，不留空块。勾选状态由你自己维护，进度条每次构建自动重算。
 */
function syncProgress(semester, course) {
  const indexFile = path.join(COURSE_ROOT, semester, course, 'index.md')
  if (!fs.existsSync(indexFile)) return
  const raw = fs.readFileSync(indexFile, 'utf-8')

  const done = (raw.match(/^- \[[xX]\]/gm) || []).length
  const todo = (raw.match(/^- \[ ?\]/gm) || []).length
  const total = done + todo
  const pct = total ? Math.round((done / total) * 100) : 0

  const block =
    total === 0
      ? ''
      : [
          PROG_START,
          '',
          '<div class="course-progress">',
          '  <div class="course-progress__row">',
          '    <span class="course-progress__label">章节进度</span>',
          `    <span class="course-progress__count">${done} / ${total}</span>`,
          '  </div>',
          '  <div class="course-progress__track">',
          `    <div class="course-progress__fill" style="width:${pct}%"></div>`,
          '  </div>',
          '</div>',
          '',
          PROG_END
        ].join('\n')

  const s = raw.indexOf(PROG_START)
  const e = raw.indexOf(PROG_END)
  let next

  if (s !== -1 && e > s) {
    // 原地替换，两侧都规整成「恰好一个空行」。
    // 手工编辑后很容易出现「结束标记紧贴着下面的引用块」，markdown 会把它并进 HTML 块里。
    const before = raw.slice(0, s).replace(/\s+$/, '')
    const after = raw.slice(e + PROG_END.length).replace(/^\s+/, '')
    if (block) {
      next = `${before}\n\n${block}${after ? `\n\n${after}` : '\n'}`
    } else {
      next = after ? `${before}\n\n${after}` : `${before}\n`
    }
  } else if (block) {
    // 首次出现：优先插在「## 章节规划」标题正下方
    const heading = raw.match(/^##\s*章节规划\s*$/m)
    if (heading) {
      const at = heading.index + heading[0].length
      next = `${raw.slice(0, at)}\n\n${block}${raw.slice(at)}`
    } else {
      // 没有那个标题（比如实验课叫「## 实验清单」），就放在正文开头——
      // 也就是第一个二级标题之前，别丢到文件最末尾
      const firstH2 = raw.match(/^##\s/m)
      if (firstH2) {
        next = `${raw.slice(0, firstH2.index).replace(/\s*$/, '')}\n\n${block}\n\n${raw.slice(firstH2.index)}`
      } else {
        next = `${raw.replace(/\s*$/, '')}\n\n${block}\n`
      }
    }
  }

  if (next !== undefined && next !== raw) {
    fs.writeFileSync(indexFile, next, 'utf-8')
    console.log(`  ✓ 章节进度：${semester}/${course}（${done} / ${total}）`)
  }
}

/** 课程卡片网格的标记 */
const CARD_START = '<!-- 课程卡片：开始（自动生成，勿手改这一段） -->'
const CARD_END = '<!-- 课程卡片：结束 -->'

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 把「专业课」首页的朴素表格换成课程卡片网格 */
function syncCourseCards(bySemester) {
  const cards = []
  for (const [semester, courses] of bySemester) {
    for (const course of courses) {
      const n = listFiles(path.join(ASSET_ROOT, semester, course)).length
      cards.push(
        `  <a class="course-card" href="/专业课/${semester}/${course}/">\n` +
          `    <span class="course-card__term">${escHtml(semester)}</span>\n` +
          `    <span class="course-card__name">${escHtml(course)}</span>\n` +
          `    <span class="course-card__meta">${n > 0 ? `${n} 份资料` : '暂无资料'}</span>\n` +
          `  </a>`
      )
    }
  }

  const block =
    cards.length === 0
      ? ''
      : `${CARD_START}\n\n<div class="course-grid">\n${cards.join('\n')}\n</div>\n\n${CARD_END}`

  const indexFile = path.join(COURSE_ROOT, 'index.md')
  if (!fs.existsSync(indexFile)) return
  const raw = fs.readFileSync(indexFile, 'utf-8')
  const s = raw.indexOf(CARD_START)
  const e = raw.indexOf(CARD_END)
  let next

  if (s !== -1 && e > s) {
    const before = raw.slice(0, s)
    const after = raw.slice(e + CARD_END.length)
    if (block) {
      next = `${before}${block}${after}`
    } else {
      const b = before.replace(/\s+$/, '')
      const a = after.replace(/^\s+/, '')
      next = a ? `${b}\n\n${a}` : `${b}\n`
    }
  } else if (block) {
    const h1 = raw.match(/^#\s+.+$/m)
    const at = h1 ? h1.index + h1[0].length : 0
    next = `${raw.slice(0, at)}\n\n${block}${raw.slice(at)}`
  }

  if (next !== undefined && next !== raw) {
    fs.writeFileSync(indexFile, next, 'utf-8')
    console.log(`  ✓ 课程卡片：docs/专业课/index.md（${cards.length} 门课）`)
  }
}

function main() {
  fs.mkdirSync(COURSE_ROOT, { recursive: true })
  fs.mkdirSync(ASSET_ROOT, { recursive: true })

  const semesters = [...new Set([...listDirs(COURSE_ROOT), ...listDirs(ASSET_ROOT)])].sort((a, b) =>
    a.localeCompare(b, 'zh-CN', { numeric: true })
  )

  if (semesters.length === 0) {
    console.log('[build-index] 还没有任何学期。在 docs/专业课/ 下新建「大二秋冬」这样的文件夹即可。')
    return
  }

  const bySemester = []
  for (const semester of semesters) {
    const stray = listMd(path.join(COURSE_ROOT, semester)).filter((f) => f !== 'index.md')
    if (stray.length) {
      console.warn(
        `[build-index] ⚠ ${semester}/ 下直接放了 ${stray.length} 个 .md 文件，它们不会被索引。` +
          `\n             结构应该是 专业课/${semester}/<课程名>/xxx.md，请移进课程文件夹。`
      )
    }

    const courses = [
      ...new Set([
        ...listDirs(path.join(COURSE_ROOT, semester)),
        ...listDirs(path.join(ASSET_ROOT, semester))
      ])
    ].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

    console.log(`[build-index] ${semester}：${courses.length} 门课 —— ${courses.join('、') || '（暂无）'}`)
    writeSemesterPage(semester, courses)
    for (const course of courses) {
      ensureCourse(semester, course)
      syncCourseAssets(semester, course)
      syncProgress(semester, course)
    }
    bySemester.push([semester, courses])
  }

  syncCourseCards(bySemester)
  console.log('[build-index] 完成。')
}

main()
