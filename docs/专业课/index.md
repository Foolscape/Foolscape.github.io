# 专业课

按学期归档的课程笔记与资料。点下面的卡片进入对应课程。

<!-- 课程卡片：开始（自动生成，勿手改这一段） -->

<div class="course-grid">
  <a class="course-card" href="/专业课/大一春夏/常微分方程/">
    <span class="course-card__term">大一春夏</span>
    <span class="course-card__name">常微分方程</span>
    <span class="course-card__meta">1 份资料</span>
  </a>
  <a class="course-card" href="/专业课/大二秋冬/大学物理甲II/">
    <span class="course-card__term">大二秋冬</span>
    <span class="course-card__name">大学物理甲II</span>
    <span class="course-card__meta">暂无资料</span>
  </a>
  <a class="course-card" href="/专业课/大二秋冬/电路与电子技术实验I/">
    <span class="course-card__term">大二秋冬</span>
    <span class="course-card__name">电路与电子技术实验I</span>
    <span class="course-card__meta">暂无资料</span>
  </a>
  <a class="course-card" href="/专业课/大二秋冬/电路与电子技术I/">
    <span class="course-card__term">大二秋冬</span>
    <span class="course-card__name">电路与电子技术I</span>
    <span class="course-card__meta">暂无资料</span>
  </a>
  <a class="course-card" href="/专业课/大二秋冬/复变函数与积分变换/">
    <span class="course-card__term">大二秋冬</span>
    <span class="course-card__name">复变函数与积分变换</span>
    <span class="course-card__meta">1 份资料</span>
  </a>
  <a class="course-card" href="/专业课/大二秋冬/概率论与数理统计/">
    <span class="course-card__term">大二秋冬</span>
    <span class="course-card__name">概率论与数理统计</span>
    <span class="course-card__meta">暂无资料</span>
  </a>
</div>

<!-- 课程卡片：结束 -->

## 目录结构约定

```text
docs/专业课/<学期>/<课程>/
  index.md          ← 课程总览（没有会自动生成），资料文件列表也自动并在这页末尾
  第01章-xxx.md     ← 章节笔记，按文件名排序
docs/public/资料/<学期>/<课程>/
  笔记.pdf          ← 你自己产出的笔记/扫描件放这里，自动列到课程页里
```

## 怎么新增内容

| 想做的事 | 怎么做 |
| --- | --- |
| 加一门课 | 在 `docs/专业课/大二秋冬/` 下新建课程文件夹，直接在里面写 `.md` |
| 加一个学期 | 在 `docs/专业课/` 下新建 `大二春夏` 这样的文件夹 |
| 只想传资料 | 把 PDF 丢进 `docs/public/资料/<学期>/<课程>/`，会自动建好对应课程 |

以上**都不需要改任何配置文件** —— 目录、导航、侧边栏、搜索索引全部自动生成。

> 学期排序规则：识别 `大N秋冬` / `大N春夏` 的形式，按 大二秋冬 → 大二春夏 → 大三秋冬 排列；认不出的名字排在最后按拼音排。
