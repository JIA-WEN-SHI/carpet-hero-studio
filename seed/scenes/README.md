# 推荐场景种子图

运行种子脚本前，在本目录放置以下三张 1:1 PNG：

1. `01-cream-living-room.png`：奶油风客厅。
2. `02-modern-bedroom.png`：现代浅色空间。
3. `03-warm-entryway.png`：暖木色空间。

每张图必须有清晰可见的地毯区域、自然家具与真实光线，且不得包含文字、徽标、水印、价格或营销标签。图片会被提交给生图模型作为场景参考。

校验：

```powershell
pnpm seed:scenes --check
```

需要重新生成默认无文字场景时运行：

```powershell
pnpm seed:scenes:render
```

上传：

```powershell
pnpm seed:scenes
```
