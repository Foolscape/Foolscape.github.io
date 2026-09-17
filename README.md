# 峻熹的学习笔记

顾峻熹（GitHub: [Foolscape](https://github.com/Foolscape)，昵称 Junxiii）的学习笔记站。

线上地址：**<https://foolscape.github.io/>**

用 [VitePress](https://vitepress.dev/) 构建，笔记写 Markdown，手写扫描件与课件以 PDF 归档，按专业课分类。推送到 `main` 分支后由 GitHub Actions 自动构建并发布。

---

## 一、日常怎么用（最常用的三条）

### 1. 写一篇新笔记

在对应课程文件夹下新建 `.md` 文件即可，**不用改任何配置**：

```text
docs/专业课/数据结构/第03章-栈和队列.md
```

侧边栏会在下次构建时自动出现这一条，标题取文件里第一个 `# 一级标题`。

### 2. 上传一份 PDF / 扫描件

丢进对应课程的资料文件夹：

```text
docs/public/资料/数据结构/第三章课件.pdf
```

构建时会自动生成 / 更新「资料下载」页，把文件列成表格（带文件名、类型、大小）。

### 3. 新增一门课

只要建立文件夹就行，两边哪个先建都可以：

```text
docs/专业课/操作系统/          ← 笔记
docs/public/资料/操作系统/     ← 资料（只放 PDF 也会自动建课）
```

课程总览页 `index.md` 如果不存在会自动生成。顶栏「专业课」下拉菜单、左侧目录同步自动更新。

> **删除课程**：把文件夹删掉即可，剩下的引用会自动消失。

---

## 二、本地预览

```bash
npm install        # 首次安装依赖，约 130 个包
npm run docs:dev   # 启动本地预览，默认 http://localhost:5173
```

修改文件会实时热更新，所见即所得。**改完记得先本地看一眼再推。**

其他命令：

```bash
npm run docs:build     # 只构建，产物在 docs/.vitepress/dist
npm run docs:preview   # 预览构建产物（和线上一致）
npm run index          # 只跑自动索引脚本
```

---

## 三、发布到线上

```bash
git add .
git commit -m "新增：数据结构第三章笔记"
git push
```

推送后 GitHub Actions 会自动跑（约 1～2 分钟），到仓库的 **Actions** 标签页能看到进度，跑完访问 <https://foolscape.github.io/> 就是最新的。

### ⚠️ 首次需要手动改一次设置

Pages 现在是「从分支部署」模式，要改成「从 Actions 部署」：

1. 打开 <https://github.com/Foolscape/Foolscape.github.io/settings/pages>
2. **Build and deployment → Source** 选 **GitHub Actions**
3. 回到 <https://github.com/Foolscape/Foolscape.github.io/actions>，手动跑一次 `Deploy notes site to GitHub Pages`（点进去 → `Run workflow`）

改完之后，以后每次 push 都会自动发布，再也不用管。

> **关于根目录那个旧的 `index.html`**：它是建站初期的手写占位页。切换到 Actions 部署后，线上服务的是构建产物，这个文件就再也不起作用了（留着不影响任何东西）。确认新站正常后想清理的话：
>
> ```bash
> git rm index.html
> git commit -m "删除旧占位页"
> git push
> ```
>
> 之所以先留着，是因为在切换设置之前，分支部署模式仍然靠它撑着首页 —— 提前删掉会让你看到 404，容易误以为站坏了。

---

## 四、目录结构

```text
个人博客/
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts          ← 站点配置：导航、侧边栏（自动扫描生成）、搜索
│  │  └─ theme/custom.css    ← 中文字体与排版微调
│  ├─ index.md               ← 首页
│  ├─ 关于我.md
│  ├─ 学习日志/
│  │  ├─ index.md
│  │  └─ 2026-09-17-建站记录.md   ← 文件名以日期开头，自动按时间倒序
│  ├─ 专业课/
│  │  ├─ index.md
│  │  ├─ 数据结构/
│  │  │  ├─ index.md
│  │  │  ├─ 第01章-绪论.md
│  │  │  ├─ 第02章-线性表.md
│  │  │  └─ 资料下载.md        ← 自动生成，别手动改
│  │  └─ 计算机组成原理/
│  └─ public/
│     └─ 资料/<课程名>/         ← PDF、图片、课件原件放这里
├─ scripts/build-index.mjs   ← 自动索引脚本（生成资料页、补全课程）
└─ .github/workflows/deploy.yml
```

---

## 五、命名约定

| 类型 | 规则 | 例子 |
| --- | --- | --- |
| 章节笔记 | `第NN章-标题.md`（**N 补零**，顺序才稳） | `第03章-栈和队列.md` |
| 学习日志 | `YYYY-MM-DD-标题.md` | `2026-09-20-第一周复盘.md` |
| 课程文件夹 | 课程中文名 | `数据结构`、`计算机组成原理` |
| 资料文件 | 随意，中文也行 | `第三章课件.pdf` |

排序规则：`index.md` 永远最前，「资料下载」永远最后，其余按中文数字序排列。

---

## 六、常见问题

**PDF 能直接放仓库吗？多大合适？**

能。单个文件 GitHub 限制 100MB，仓库建议控制在 1GB 以内（超过会收到警告）。手写扫描件建议先压缩：拍照的用图片压缩工具，多页的合成一个 PDF 再上传。现在「资料下载」页会显示每个文件的大小，方便你盯着。

**中文文件名会不会出问题？**

不会。URL 会被自动编码，浏览器、GitHub Pages 都正常处理。唯一要注意的是别用 `%`、`#`、`?` 这类在 URL 里有特殊含义的符号。

**笔记里的公式怎么写？**

VitePress 默认不支持 LaTeX 数学公式。要用的话执行 `npm i -D markdown-it-mathjax3`，然后在 `docs/.vitepress/config.mts` 里加：

```ts
import mathjax3 from 'markdown-it-mathjax3'
export default defineConfig({
  markdown: { config: (md) => md.use(mathjax3) }
})
```

**能不能直接在网上改笔记？**

可以。在 GitHub 上打开 `docs/专业课/.../某章.md`，点铅笔图标改完提交，网站会自动更新。手机上也能改，适合上课随手记一句。

**`npm install` 报 `EPERM` 怎么办？**

普通终端里不会遇到。如果是在受限环境（受管终端、沙箱）里，通常是两个原因：写不了系统缓存目录，或者禁止子进程管道（`esbuild` 的 postinstall 要 spawn 进程）。这样绕过：

```bash
npm install --cache ./.npm-cache --ignore-scripts
```

`--ignore-scripts` 在这里是安全的：esbuild 的可执行文件由 `@esbuild/win32-x64` 这个可选依赖直接提供，postinstall 只做版本校验，跳过它不影响构建和预览。

**为什么仓库名不能改成 Junxiii？**

GitHub Pages 的用户主页要求仓库**严格命名**为 `<用户名>.github.io`，这样才能拿到 `https://foolscape.github.io/` 这个根域名。改名后网址会变成 `https://foolscape.github.io/Junxiii/`，多一层路径，不划算。`Junxiii` 这个名字保留在 GitHub 的**昵称（Name）**字段里，个人主页上照样大字显示。
