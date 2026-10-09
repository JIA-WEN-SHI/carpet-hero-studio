# 地毯首图生产平台

师嘉文 · AI 产品作品集项目

把商品素材、场景参考与首图制作组织成一条生产流程。

**先查看：** [直接演示](https://jia-wen-shi.github.io/demos/carpet/) · [项目案例](https://jia-wen-shi.github.io/#case-carpet) · [作品集首页](https://jia-wen-shi.github.io/)

无需登录 GitHub 即可浏览公开源码。案例页和公共原型不需要安装环境或填写模型密钥。

## 项目背景与职责

围绕天津地毯电商的商品图需求，先梳理原有制作方式，再设计商品原图、场景参考、修改要求、任务状态与候选检查流程。后续涉及数据问题，交付范围限定在主图生成。

我的职责：需求与工作流程梳理、产品方案、前端与交互。使用 Codex 和 Superpowers 辅助开发我负责的前端；后端功能由技术方开发。

这个案例的核心目标：理解设计与生成技术的能力边界，根据业务场景进行技术选型，通过 AI 辅助开发验证产品方案，并控制质量、成本和风险。

## 推进与技术判断

1. 根据原有地毯制作经验，区分商品原图、场景参考和不可改变的颜色、材质与样式。
2. 按任务比较传统渲染、图像二次编辑和控图工作流。当前工程采用商品图与场景图的双图编辑请求；过往 3ds Max、Photoshop、ComfyUI / Redux 实践不等于当前后端依赖。
3. 通过 Codex 和 Superpowers 辅助开发前端，检查提示词手动修改、模板重置、任务状态与候选显示。
4. 将文件有效性与商品一致性分别检查，再记录实际费用、人工修改和合格结果。已有交付不直接推导提效比例或模型选型最优。

详细过程：[产品执行步骤](https://jia-wen-shi.github.io/#case-carpet/product-practice) · [生产方式取舍](https://jia-wen-shi.github.io/#case-carpet/production-choice) · [质量与成本口径](https://jia-wen-shi.github.io/#case-carpet/evaluation)

## 当前范围

截至 2026 年 10 月 9 日，根据本人确认：生成主图的功能已交付给天津前老板，已收到付款，对方正在使用。SKU、详情页与后续数据相关能力不计作当前交付。尚无可公开核对的逐图验收、制作耗时和成本对照记录。

公开演示可直接操作现有前端：示例素材 · 预置插画与模拟生成 · 调整参数、提示词和交付流程。演示使用合成数据，不代表真实业务或实时模型效果。完整后端仍需本地服务与自己的配置。

## 源码结构

`src/ · server/ · scripts/ · supabase/ · seed/`

这是当前工作区源码的发布快照，未附带旧 Git 历史。真实密钥、数据库、浏览器会话、日志、客户原始金融材料和依赖缓存不在仓库内。

## 无后台演示

```bash
npx pnpm@10 install --frozen-lockfile
npx pnpm@10 dev:demo
npx pnpm@10 build:demo
```

静态产物在 `dist-demo/`。公开演示的图片是已有代码生成的插画，上传文件不离开浏览器。

## 本地运行

需要 Node.js 24、pnpm 10、自行配置的 Supabase 数据库/存储和图像模型服务。

```bash
npx pnpm@10 install --frozen-lockfile
# 将 .env.example 复制为 .env.local，填写自己的服务配置
npx pnpm@10 dev:full
```

前端默认 4173，API 默认 4174。数据库结构见 `supabase/migrations/`。模型生成会访问配置的服务，公共案例页面不执行生成。现有测试：`npx pnpm@10 test`。

## 说明

这里展示限定范围的产品交付、个人职责和当前工程。公共演示是模拟流程，未展示客户原始素材、付款金额或业务数据；质量、费用与效率结论需要独立的实际任务记录。
