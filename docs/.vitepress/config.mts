import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DOCS = fileURLToPath(new URL('..', import.meta.url))
const COURSE_DIR = path.join(DOCS, '专业课')
const LOG_DIR = path.join(DOCS, '学习日志')

const SITE = {
  owner: 'Foolscape',
  repo: 'Foolscape.github.io',
  url: 'https://foolscape.github.io'
}

/** 列出目录下的子文件夹 */
function listDirs(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
}

/** 取标题：优先 frontmatter 的 title，其次第一个 # 标题，最后用文件名 */
function readTitle(file) {
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
    /* 读取失败就退化成文件名 */
  }
  return path.basename(file, '.md')
}

/** index.md 排最前，「资料下载」排最后，其余按中文数字序 */
function fileRank(name) {
  if (name === 'index.md') return 0
  if (name.startsWith('资料下载')) return 2
  return 1
}

function mdFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => {
      const r = fileRank(a) - fileRank(b)
      return r !== 0 ? r : a.localeCompare(b, 'zh-CN', { numeric: true })
    })
}

/** 学期排序：大二秋冬 → 大二春夏 → 大三秋冬 …… 认不出的名字排最后 */
const GRADE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5 }
function semesterKey(name) {
  const grade = name.match(/大([一二三四五])/)?.[1]
  if (!grade) return `9${name}`
  const term = name.includes('秋冬') ? 1 : name.includes('春夏') ? 2 : 3
  return `${GRADE[grade]}${term}`
}

function sortSemesters(list) {
  return list.sort(
    (a, b) => semesterKey(a).localeCompare(semesterKey(b)) || a.localeCompare(b, 'zh-CN')
  )
}

function sortCourses(list) {
  return list.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))
}

/** 学期 → 课程 → 章节，两层可折叠分组 */
function courseSidebar() {
  return sortSemesters(listDirs(COURSE_DIR)).map((semester) => ({
    text: semester,
    collapsed: false,
    items: sortCourses(listDirs(path.join(COURSE_DIR, semester))).map((course) => {
      const children = mdFiles(path.join(COURSE_DIR, semester, course))
        .filter((f) => f !== 'index.md')
        .map((f) => ({
          text: readTitle(path.join(COURSE_DIR, semester, course, f)),
          link: `/专业课/${semester}/${course}/${f.replace(/\.md$/, '')}`
        }))
      // 没有子页面的课程直接当链接，不给折叠箭头 —— 避免侧边栏出现空分组
      return children.length
        ? { text: course, link: `/专业课/${semester}/${course}/`, collapsed: true, items: children }
        : { text: course, link: `/专业课/${semester}/${course}/` }
    })
  }))
}

/** 学习日志：按文件名倒序（文件名以日期开头，所以就是最新在前） */
function logSidebar() {
  const files = mdFiles(LOG_DIR)
    .filter((f) => f !== 'index.md')
    .sort((a, b) => b.localeCompare(a, 'zh-CN', { numeric: true }))
  return [
    {
      text: '学习日志',
      items: [
        { text: '全部日志', link: '/学习日志/' },
        ...files.map((f) => ({
          text: readTitle(path.join(LOG_DIR, f)),
          link: `/学习日志/${f.replace(/\.md$/, '')}`
        }))
      ]
    }
  ]
}

const semesters = sortSemesters(listDirs(COURSE_DIR))

export default defineConfig({
  lang: 'zh-CN',
  title: '峻熹的学习笔记',
  description: '顾峻熹（Foolscape / Junxiii）的学习记录：按专业课归档的 Markdown 笔记与 PDF 资料。',
  base: '/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [/^\/资料\//],

  head: [
    ['meta', { name: 'author', content: '顾峻熹 Foolscape' }],
    ['meta', { name: 'theme-color', content: '#3451b2' }]
  ],

  themeConfig: {
    siteTitle: '峻熹的学习笔记',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '专业课',
        items: [
          { text: '全部课程', link: '/专业课/' },
          ...semesters.map((s) => ({
            text: s,
            items: sortCourses(listDirs(path.join(COURSE_DIR, s))).map((c) => ({
              text: c,
              link: `/专业课/${s}/${c}/`
            }))
          }))
        ]
      },
      { text: '学习日志', link: '/学习日志/' },
      { text: '关于我', link: '/关于我' }
    ],

    sidebar: {
      '/专业课/': courseSidebar(),
      '/学习日志/': logSidebar()
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' }
    },
    editLink: {
      pattern: `https://github.com/${SITE.owner}/${SITE.repo}/edit/main/docs/:path`,
      text: '在 GitHub 上编辑此页'
    },
    footer: {
      message: '以 Markdown 记录，用 Git 保存',
      copyright: `© ${new Date().getFullYear()} 顾峻熹 · Foolscape`
    },
    socialLinks: [{ icon: 'github', link: `https://github.com/${SITE.owner}` }],
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索笔记', buttonAriaLabel: '搜索笔记' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除查询',
            backButtonTitle: '返回',
            noResultsText: '没有找到相关内容',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上箭头',
              navigateDownKeyAriaLabel: '下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc'
            }
          }
        }
      }
    }
  }
})
