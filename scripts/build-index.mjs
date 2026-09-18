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
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DOCS = path.join(ROOT, 'docs')
const COURSE_ROOT = path.join(DOCS, '专业课')
const ASSET_ROOT = path.join(DOCS, 'public', '资料')
const MUSIC_ROOT = path.join(DOCS, 'public', 'music')

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

/** 能当音乐放的扩展名 */
const AUDIO_EXT = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.oga', '.flac', '.opus']
/** 能当封面用的图片扩展名 */
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']

/**
 * 从 MP3 的 ID3v2 标签里提取内嵌封面（APIC 帧）。
 * 很多音乐平台下载的 mp3 都带封面，能直接抽出来用。找不到返回 null。
 */
function extractId3Cover(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return null
  const major = buf[3]
  if (major < 3 || major > 4) return null // v2.2 的帧结构不一样，不处理

  const tagSize =
    ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
  const end = Math.min(10 + tagSize, buf.length)
  let pos = 10

  while (pos + 10 <= end) {
    const id = buf.toString('latin1', pos, pos + 4)
    if (!/^[A-Z0-9]{4}$/.test(id)) break

    const frameSize =
      major >= 4
        ? ((buf[pos + 4] & 0x7f) << 21) |
          ((buf[pos + 5] & 0x7f) << 14) |
          ((buf[pos + 6] & 0x7f) << 7) |
          (buf[pos + 7] & 0x7f)
        : buf.readUInt32BE(pos + 4)

    if (frameSize <= 0 || pos + 10 + frameSize > end) break

    if (id === 'APIC') {
      const data = buf.subarray(pos + 10, pos + 10 + frameSize)
      const enc = data[0]
      let p = 1
      while (p < data.length && data[p] !== 0) p++ // MIME
      const mime = data.toString('latin1', 1, p)
      p += 1 // MIME 结尾的 0
      p += 1 // 图片类型字节
      // 描述字段：UTF-16 用双字节 0 结尾，其余用单字节
      if (enc === 1 || enc === 2) {
        while (p + 1 < data.length && !(data[p] === 0 && data[p + 1] === 0)) p += 2
        p += 2
      } else {
        while (p < data.length && data[p] !== 0) p++
        p += 1
      }
      if (p < data.length - 4) {
        return { mime, data: data.subarray(p) }
      }
    }
    pos += 10 + frameSize
  }
  return null
}

/** 给一首歌找封面：同名图片 > mp3 内嵌封面 > 默认封面 */
function resolveCover(file, base, coverDir) {
  // 1) 音乐文件夹里放一张同名图片（最省事）
  for (const ext of IMAGE_EXT) {
    if (fs.existsSync(path.join(MUSIC_ROOT, base + ext))) {
      return `/music/${encodeURIComponent(base)}${ext}`
    }
  }

  if (path.extname(file).toLowerCase() !== '.mp3') return DEFAULT_COVER

  // 2) 从 mp3 里抽内嵌封面
  try {
    const cover = extractId3Cover(fs.readFileSync(path.join(MUSIC_ROOT, file)))
    if (cover) {
      const ext = cover.mime.includes('png') ? '.png' : cover.mime.includes('webp') ? '.webp' : '.jpg'
      const name = `${base}${ext}`
      const target = path.join(coverDir, name)
      // 内容没变就不重写，免得每次构建都产生 diff
      const old = fs.existsSync(target) ? fs.readFileSync(target) : null
      if (!old || !old.equals(cover.data)) fs.writeFileSync(target, cover.data)
      console.log(`  ✓ 抽出内嵌封面：${base}${ext}（${Math.round(cover.data.length / 1024)} KB）`)
      return `/music/covers/${encodeURIComponent(name)}`
    }
  } catch {
    // 抽不出来就用默认封面，不影响构建
  }

  return DEFAULT_COVER
}

const DEFAULT_COVER = '/music/covers/default.svg'

/**
 * 扫描 docs/public/music/，生成 APlayer 用的歌单 playlist.json。
 *
 * 文件名写成「艺术家 - 标题.mp3」会自动拆成歌手和曲名。
 * 封面按「同名图片 → mp3 内嵌封面 → 默认封面」的顺序找。
 */
function writeMusicPlaylist() {
  fs.mkdirSync(MUSIC_ROOT, { recursive: true })
  const coverDir = path.join(MUSIC_ROOT, 'covers')
  fs.mkdirSync(coverDir, { recursive: true })

  const files = fs
    .readdirSync(MUSIC_ROOT)
    .filter((f) => !f.startsWith('.') && AUDIO_EXT.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

  const audio = files.map((file) => {
    const base = file.replace(/\.[^.]+$/, '')
    const parts = base.split(/\s+-\s+/)
    return {
      name: parts.length > 1 ? parts.slice(1).join(' - ') : base,
      artist: parts.length > 1 ? parts[0] : '',
      url: encodeURI(`/music/${file}`),
      pic: resolveCover(file, base, coverDir)
    }
  })

  fs.writeFileSync(
    path.join(MUSIC_ROOT, 'playlist.json'),
    JSON.stringify({ generated: true, audio }, null, 2),
    'utf-8'
  )
  console.log(
    audio.length
      ? `  ✓ 音乐歌单：docs/public/music/playlist.json（${audio.length} 首：${audio.map((a) => a.name).join('、')}）`
      : '  - 音乐文件夹里没有音频文件，播放器不会显示'
  )
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

/** 学期排序：大二秋冬 → 大二春夏 → 大三秋冬……跟 config.mts 里的规则保持一致 */
const GRADE_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 }
function semesterKey(name) {
  const grade = name.match(/大([一二三四五])/)?.[1]
  if (!grade) return `9${name}`
  const term = name.includes('秋冬') ? 1 : name.includes('春夏') ? 2 : 3
  return `${GRADE_NUM[grade]}${term}`
}
function sortSemesters(list) {
  return [...list].sort(
    (a, b) => semesterKey(a).localeCompare(semesterKey(b)) || a.localeCompare(b, 'zh-CN')
  )
}

/** 读标题：优先 frontmatter 的 title，其次第一个 # 标题，最后用文件名 */
function readDocTitle(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8')
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (fm) {
      const t = fm[1].match(/^title:\s*(.+)$/m)
      if (t) return t[1].trim().replace(/^['"]|['"]$/g, '')
    }
    const h = raw.match(/^#\s+(.+?)\s*$/m)
    if (h) return h[1]
  } catch {
    /* 读不到就用文件名 */
  }
  return path.basename(file, '.md')
}

/** 通用的「把生成块写进某个文件」逻辑：有标记就原地替换，没有就插到 anchor 之后 */
function writeBlockInto(file, startMark, endMark, block, insertAfter) {
  if (!fs.existsSync(file)) return false
  const raw = fs.readFileSync(file, 'utf-8')
  const s = raw.indexOf(startMark)
  const e = raw.indexOf(endMark)
  let next

  if (s !== -1 && e > s) {
    const before = raw.slice(0, s).replace(/\s+$/, '')
    const after = raw.slice(e + endMark.length).replace(/^\s+/, '')
    next = block
      ? `${before}\n\n${block}${after ? `\n\n${after}` : '\n'}`
      : after
        ? `${before}\n\n${after}`
        : `${before}\n`
  } else if (block) {
    const at = insertAfter ? insertAfter(raw) : 0
    next = `${raw.slice(0, at).replace(/\s+$/, '')}\n\n${block}\n${raw.slice(at)}`
  } else {
    return false
  }

  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf-8')
    return true
  }
  return false
}

// ---------- 学习日志时间线 ----------

const TIMELINE_START = '<!-- 日志时间线：开始（自动生成，勿手改这一段） -->'
const TIMELINE_END = '<!-- 日志时间线：结束 -->'

/** 扫描 docs/学习日志/，把日志列成一条竖向时间线 */
function writeLogTimeline() {
  const dir = path.join(DOCS, '学习日志')
  const files = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f))
        .sort((a, b) => b.localeCompare(a)) // 新的在前
    : []

  const items = files.map((f) => {
    const date = f.slice(0, 10)
    const title = escHtml(readDocTitle(path.join(dir, f)))
    return `  <a class="log-item" href="/学习日志/${encodeURIComponent(f.replace(/\.md$/, ''))}">
    <span class="log-item__date">${date}</span>
    <span class="log-item__title">${title}</span>
  </a>`
  })

  const block = [
    TIMELINE_START,
    '',
    '<div class="log-timeline">',
    items.length
      ? items.join('\n')
      : '  <p class="log-empty">还没有日志。在 <code>docs/学习日志/</code> 下新建 <code>YYYY-MM-DD-标题.md</code> 就会出现。</p>',
    '</div>',
    '',
    TIMELINE_END
  ].join('\n')

  const target = path.join(dir, 'index.md')
  if (writeBlockInto(target, TIMELINE_START, TIMELINE_END, block)) {
    console.log(`  ✓ 日志时间线：docs/学习日志/index.md（${items.length} 篇）`)
  }
}

// ---------- 首页看板 ----------

const HOME_START = '<!-- 首页看板：开始（自动生成，勿手改这一段） -->'
const HOME_END = '<!-- 首页看板：结束 -->'

/** 首页卡片上的课程图标。跟 config.mts 里的 COURSE_ICONS 保持一致 */
const HOME_ICONS = [
  [/实验/, '🔬'],
  [/电路|电子/, '⚡'],
  [/概率|统计/, '🎲'],
  [/物理/, '🔭'],
  [/复变|积分变换/, '🌀'],
  [/微分方程/, '📈'],
  [/数学|几何/, '📐'],
  [/程序|数据结构|算法|计算机/, '💻'],
  [/英语/, '🔤']
]

function homeIcon(name) {
  for (const [re, icon] of HOME_ICONS) if (re.test(name)) return icon
  return '📘'
}

/**
 * 从 git 历史里挑出最近改动过的**笔记文件**（只列仍然存在的，
 * 否则 git 里已删除的课程会变成死链、让构建失败）。
 *
 * 注：git 的输出用**文件描述符**接收而不是管道，因为某些受限环境禁止创建管道。
 */
function collectRecentNotes(limit = 5) {
  const tmp = path.join(ROOT, '.git-log.tmp')
  let raw = ''
  try {
    const fd = fs.openSync(tmp, 'w')
    execFileSync(
      'git',
      ['log', '-40', '--name-only', '--date=format:%m-%d', '--pretty=format:@@%ad', '--', 'docs'],
      { cwd: ROOT, stdio: ['ignore', fd, 'ignore'] }
    )
    fs.closeSync(fd)
    raw = fs.readFileSync(tmp, 'utf-8')
  } catch {
    return []
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      /* 清理失败无所谓 */
    }
  }

  const seen = new Set()
  const items = []
  for (const block of raw.split(/^@@/m).slice(1)) {
    const nl = block.indexOf('\n')
    const date = (nl === -1 ? block : block.slice(0, nl)).trim()
    const files = nl === -1 ? [] : block.slice(nl + 1).split('\n')

    for (const f of files) {
      const file = f.trim()
      if (!file.endsWith('.md')) continue
      const parts = file.replace(/^docs\//, '').split('/')
      const base = path.basename(file, '.md')
      const isCourseContent = parts[0] === '专业课' && parts.length >= 4
      const isLog = parts[0] === '学习日志' && parts.length === 2 && base !== 'index'
      if (!isCourseContent && !isLog) continue
      if (!fs.existsSync(path.join(ROOT, file))) continue
      if (seen.has(file)) continue
      seen.add(file)

      items.push({
        date,
        title: readDocTitle(path.join(ROOT, file)),
        href:
          base === 'index'
            ? `/${parts.slice(0, -1).join('/')}/`
            : `/${file.replace(/^docs\//, '').replace(/\.md$/, '')}`
      })
      if (items.length >= limit) return items
    }
  }
  return items
}

/**
 * 生成首页看板：数据统计 + 按学期分组的课程卡片 + 最近更新。
 * 首页不放解释性文字 —— 那些属于 关于我 和 README。
 */
function writeHomeDashboard(bySemester) {
  let courseCount = 0
  let noteCount = 0
  let assetCount = 0

  const sections = bySemester.map(([semester, courses]) => {
    courseCount += courses.length
    const rows = courses.map((course) => {
      const dir = path.join(COURSE_ROOT, semester, course)
      const notes = fs.existsSync(dir)
        ? fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.md') && f !== 'index.md' && !f.startsWith('资料下载')).length
        : 0
      const assets = listFiles(path.join(ASSET_ROOT, semester, course)).length
      noteCount += notes
      assetCount += assets

      const meta = []
      if (notes) meta.push(`${notes} 篇笔记`)
      if (assets) meta.push(`${assets} 份资料`)

      return (
        `  <a class="course-row" href="/专业课/${semester}/${course}/">\n` +
        `    <span class="course-row__name">${homeIcon(course)} ${escHtml(course)}</span>\n` +
        `    <span class="course-row__meta">${meta.join(' · ') || '还没开始记'}</span>\n` +
        `    <span class="course-row__arrow" aria-hidden="true">›</span>\n` +
        `  </a>`
      )
    })

    return (
      `  <h2 class="home-h2">${escHtml(semester)}</h2>\n` +
      `  <div class="course-list">\n${rows.join('\n')}\n  </div>`
    )
  })

  const recent = collectRecentNotes(5)
  const recentHtml = recent.length
    ? `  <h2 class="home-h2">最近更新</h2>\n  <div class="log-timeline">\n` +
      recent
        .map(
          (r) =>
            `    <a class="log-item" href="${r.href}"><span class="log-item__date">${r.date}</span><span class="log-item__title">${escHtml(r.title)}</span></a>`
        )
        .join('\n') +
      `\n  </div>`
    : ''

  const stat = (num, label) =>
    `  <div class="home-stat"><span class="home-stat__num">${num}</span><span class="home-stat__label">${label}</span></div>`

  const block = [
    HOME_START,
    '',
    '<div class="home-dash">',
    '  <div class="home-glows" aria-hidden="true">',
    '    <span class="home-glow home-glow--a"></span>',
    '    <span class="home-glow home-glow--b"></span>',
    '  </div>',
    '',
    '  <div class="home-stats">',
    stat(bySemester.length, '个学期'),
    stat(courseCount, '门课程'),
    stat(noteCount, '篇章节笔记'),
    stat(assetCount, '份资料'),
    '  </div>',
    '',
    sections.join('\n\n'),
    recentHtml ? `\n${recentHtml}` : '',
    '',
    '  <HomeFx />',
    '</div>',
    '',
    HOME_END
  ]
    .filter((s) => s !== '')
    .join('\n')

  const target = path.join(DOCS, 'index.md')
  if (writeBlockInto(target, HOME_START, HOME_END, block)) {
    console.log(
      `  ✓ 首页看板：${bySemester.length} 个学期 / ${courseCount} 门课 / ${noteCount} 篇笔记 / ${assetCount} 份资料，最近更新 ${recent.length} 条`
    )
  }
}

function main() {
  fs.mkdirSync(COURSE_ROOT, { recursive: true })
  fs.mkdirSync(ASSET_ROOT, { recursive: true })

  const semesters = sortSemesters([...new Set([...listDirs(COURSE_ROOT), ...listDirs(ASSET_ROOT)])])

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
  writeLogTimeline()
  writeHomeDashboard(bySemester)
  writeMusicPlaylist()
  console.log('[build-index] 完成。')
}

main()
