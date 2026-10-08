# 地毯首图生产平台

当前版本接通了“产品图 + 单张场景参考图 → JMR `gpt-image-2` → 单张候选首图”的完整前后端流程。

## 环境要求

- Node.js 20 或更高版本
- pnpm
- Supabase 项目
- JMR API Key

## 1. 配置 Supabase

在 Supabase SQL Editor 中运行：

```text
supabase/migrations/202607030001_scene_generation.sql
```

迁移会创建业务表、默认提示词模板和私有 Storage Bucket `carpet-assets`。

## 2. 配置本地环境

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
JMR_API_KEY=你的JMR密钥
JMR_BASE_URL=https://jmrai.net/v1
JMR_IMAGE_COST_POINTS=2.8
JMR_PROXY_URL=
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SECRET_KEY=你的sb_secret密钥
SUPABASE_STORAGE_BUCKET=carpet-assets
API_PORT=4174
ENABLE_JMR_CONTRACT_TEST=false
```

`JMR_API_KEY` 和 `SUPABASE_SECRET_KEY` 只能保存在后端环境变量中。不得改名为 `VITE_*`，不得放入浏览器代码或 Git。

如果 Windows 已开启系统代理，一键启动脚本会自动读取并传给后端。也可以手动设置 `JMR_PROXY_URL=http://127.0.0.1:端口`。

## 3. 上传三个推荐场景

仓库已经包含三张无文字默认场景。Supabase 配置完成后运行：

```powershell
pnpm seed:scenes --check
pnpm seed:scenes
```

可以用同名 1:1 PNG 替换 `seed/scenes/` 中的默认图片，再重新建立场景数据。

## 4. 启动

双击：

```text
一键打开首图平台.cmd
```

或在终端运行：

```powershell
pnpm dev:full
```

前端地址：`http://127.0.0.1:4173/`

API 健康检查：`http://127.0.0.1:4174/api/health`

## 5. 测试与构建

```powershell
pnpm test
pnpm build
pnpm build:api
```

真实 JMR 双图合约测试默认跳过，因为每次会产生一次正式模型请求和积分消耗。需要验证时显式设置：

```powershell
$env:ENABLE_JMR_CONTRACT_TEST='true'
$env:JMR_CONTRACT_SCENE_PATH='一张本地场景图片的绝对路径'
pnpm vitest run server/providers/jmr-image.contract.test.ts
Remove-Item Env:ENABLE_JMR_CONTRACT_TEST,Env:JMR_CONTRACT_SCENE_PATH
```

## 安全说明

- Supabase Secret Key 和 JMR Key 不会返回前端。
- Storage Bucket 为私有，浏览器只使用短期签名上传与读取地址。
- 日志不记录密钥、完整签名 URL 或图片 Base64。
- 如果密钥泄露，应立即在对应平台撤销并重新创建。
