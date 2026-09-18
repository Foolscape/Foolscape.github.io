# 概率论与数理统计

> 大二秋冬 · 概率论与数理统计的笔记总览。

## 课程信息

| 项目 | 内容 |
| --- | --- |
| 学期 | 大二秋冬 |
| 学分 | 待填 |
| 教材 | 待填 |
| 教师 | 待填 |
| 考核 | 待填 |

## 章节规划

<!-- 章节进度：开始（自动生成，勿手改这一段） -->

<div class="course-progress">
  <div class="course-progress__row">
    <span class="course-progress__label">章节进度</span>
    <span class="course-progress__count">0 / 8</span>
  </div>
  <div class="course-progress__track">
    <div class="course-progress__fill" style="width:0%"></div>
  </div>
</div>

<!-- 章节进度：结束 -->

> 下面是按常见大纲列的清单，**请按你的实际教学进度增删**。学完一章把 `- [ ]` 改成 `- [x]`。

- [ ] 第 01 章 随机事件与概率
- [ ] 第 02 章 随机变量及其分布
- [ ] 第 03 章 多维随机变量及其分布
- [ ] 第 04 章 随机变量的数字特征
- [ ] 第 05 章 大数定律与中心极限定理
- [ ] 第 06 章 样本及抽样分布
- [ ] 第 07 章 参数估计
- [ ] 第 08 章 假设检验

## 复习要点

> 期末前把最容易忘、最容易考的点挪到这里。

- **全概率公式与贝叶斯公式**：全概率是"由因求果"，贝叶斯是"由果溯因"，先画事件树再套公式

  $$P(B) = \sum_{i=1}^{n} P(A_i)\,P(B \mid A_i), \qquad P(A_k \mid B) = \frac{P(A_k)\,P(B \mid A_k)}{\sum_{i=1}^{n} P(A_i)\,P(B \mid A_i)}$$

- **连续型随机变量**：$P(X = a) = 0$，所以 $P(a < X < b) = P(a \le X \le b)$
- **独立 vs 不相关**：独立一定不相关，不相关不一定独立；但对**二维正态分布**，两者等价
- **方差的可加性**：$D(X+Y) = D(X) + D(Y) + 2\operatorname{Cov}(X,Y)$，只有独立时协方差项才为 0

  更一般地：$D\left(\sum_{i=1}^{n} X_i\right) = \sum_{i=1}^{n} D(X_i) + 2\sum_{i<j} \operatorname{Cov}(X_i, X_j)$

- **正态总体抽样分布**：$\chi^2$、$t$、$F$ 三大分布的构造条件要能默写

  设 $X_1,\dots,X_n \sim N(\mu,\sigma^2)$ 独立，则 $\dfrac{(n-1)S^2}{\sigma^2} \sim \chi^2(n-1)$，$\dfrac{\bar{X}-\mu}{S/\sqrt{n}} \sim t(n-1)$

- **矩估计 vs 极大似然估计**：极大似然要写似然函数并取对数求导，别漏了参数空间边界

<!-- 资料列表：开始（自动生成，勿手改这一段） -->

## 资料文件

共 1 个文件。

<MaterialList :files='[{"name":"概统HW01.pdf","url":"/%E8%B5%84%E6%96%99/%E5%A4%A7%E4%BA%8C%E7%A7%8B%E5%86%AC/%E6%A6%82%E7%8E%87%E8%AE%BA%E4%B8%8E%E6%95%B0%E7%90%86%E7%BB%9F%E8%AE%A1/%E6%A6%82%E7%BB%9FHW01.pdf","type":"PDF","size":"1.25 MB"}]' />

<!-- 资料列表：结束 -->
