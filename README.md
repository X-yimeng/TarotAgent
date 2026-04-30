# 塔罗占卜（TarotAgent）

这是一个可以直接上线分享给他人用的 **塔罗占卜 Web 应用**（Next.js App Router + Tailwind）。

## Getting Started

### 本地运行

```bash
npm run dev
```

打开 `http://localhost:3000` 即可使用。

### 功能

- 输入问题，选择 **一张/三张牌阵**，支持 **逆位**。
- 生成可分享链接（同一个 `seed + 问题 + 牌阵` 会抽到同样的牌，便于复现）。
- 后端接口：`POST /api/reading`（也支持 `GET /api/reading?q=...&s=...&seed=...`）。

### 可选：接入大模型生成“更像占卜师”的文本

复制 `.env.example` 为 `.env.local`，填入 `LLM_API_KEY`（不填也能用，默认走内置回应）：

```bash
copy .env.example .env.local
```

### 上线给他人用（Vercel）

1) 把项目推到 GitHub（或 GitLab）
2) 在 Vercel 导入仓库并部署（默认就能跑）
3) 如果要启用大模型解读，在 Vercel 项目的 Environment Variables 里设置：

- `LLM_API_KEY`
- `LLM_BASE_URL`（默认 `https://api.deepseek.com/v1`）
- `LLM_MODEL`（默认 `deepseek-v4-flash`）
- `LLM_THINKING`（默认 `disabled`）

### 扩展方向

- 把牌库从 22 张大阿尔克那扩到 78 张（含小阿尔克那）
- 加入牌面图片与更丰富的牌阵（十字、凯尔特十字等）
- 加“房间/匿名昵称/历史记录”功能
