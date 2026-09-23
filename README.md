# DeepSeek-V4-Pro 推理流水线可视化

> ## 🔗 在线体验：<https://ezeror.github.io/DeepSeek-V4-Pro-PipeLine-viz/>
>
> **无需安装，打开即用** —— 悬停查看任意算子的输入/输出张量维度与量化精度，点击查看算子详解。

[![Deploy to GitHub Pages](https://github.com/EZeRor/DeepSeek-V4-Pro-PipeLine-viz/actions/workflows/deploy.yml/badge.svg)](https://github.com/EZeRor/DeepSeek-V4-Pro-PipeLine-viz/actions/workflows/deploy.yml)

一个交互式网页，可视化展示 DeepSeek-V4-Pro 大模型（1.6T 参数 MoE，1M 上下文）从 token 输入到 token 输出的完整推理流程。

## ✨ 功能

- **主流水线视图**：输入文本 → Tokenizer → Embedding → 61 层 Transformer Block → LM Head → 采样 → Detokenize 的完整旅程，连线上直接标注张量形状与精度（如 `[n, 7168] BF16`）
- **Hover 悬浮提示**：任意算子节点悬停即显示输入/输出张量的名称、形状、dtype/量化精度，附符号图例
- **点击详情面板**：算子作用详解、完整张量表、量化方案、数据来源标注（官方报告 / config / 推算）
- **层选择器（1–61）**：按真实排布自动切换 CSA（压缩率 4、FP4 Lightning Indexer、Top-1024）/ HCA（压缩率 128、密集注意力）路径，前 3 层标注 Hash 路由
- **prefill / decode 切换**：高亮 KV cache 读写路径，展示两阶段的算力/访存特征差异
- **量化图例**：FP4 MXFP4 / FP8 E4M3 / BF16 / FP32 等六种精度颜色编码，节点徽章一目了然

## 🛠 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建 → dist/
```

## 🚀 部署

push 到 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages。

## 📚 数据来源

- DeepSeek V4 官方技术报告：[arXiv:2606.19348](https://arxiv.org/abs/2606.19348)
- 官方配置：[config.json](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/resolve/main/config.json)
- 算子数据模型：[`src/data/pipeline.ts`](src/data/pipeline.ts)（视图与数据分离，欢迎 PR 补充）

## 技术栈

React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + shadcn/ui
