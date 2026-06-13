<div align="center">

# 🎭 Story Simulator

**AI 驱动的多角色叙事模拟与剧本生成系统**

运行沙盒世界，让 AI 角色自主行动、产生冲突、推动剧情——再将客观事件流重组为结构化的叙事节拍和场景剧本。

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI Compatible](https://img.shields.io/badge/LLM-OpenAI_Compatible-412991?logo=openai&logoColor=white)](https://platform.openai.com/)

[English](./README_EN.md) · [设计文档](doc/) · [API 文档](http://localhost:8000/api/docs)

</div>

---

## ✨ 功能一览

### 🌍 世界构建
- 定义世界观的地理、政治、经济、技术等级、力量体系
- 世界事实管理（锁定/解锁、作用域控制）

### 👥 多角色系统
- 角色档案：公开身份 vs 隐藏身份、欲望/恐惧/错误信念
- 角色资源、关系网、秘密、知识库、人物弧光追踪

### ⚙️ 模拟引擎
- **Tick 管线**：角色 Agent → 世界裁判 → 冲突推进 → 连贯性审查 → 事件提交
- 事件溯源：已提交事件不可变，状态可从事件流重建
- 支持分支模拟（从任意 Tick 分叉探索不同走向）

### 📖 叙事工作台
- **多叙事并行**：同一模拟可创建多个叙事视角，对比不同主角/结构
- 8 种视角结构（单一主角、双主角、群像、反英雄、侦探、悲剧、反派等）
- 6 种叙事框架（三幕剧、五幕剧、英雄之旅、起承转合、剧集结构）
- **事件选择**：手动勾选关键事件，引导 AI 生成想要的情节
- AI 生成叙事节拍 → AI 生成带对白的场景剧本

### 📤 导出
- Markdown / Fountain 剧本格式导出
- 选择叙事视角后一键生成，浏览器直接下载

### 🌐 多语言界面
- 支持中文 / English 界面切换
- AI 输出语言可独立配置

### ⚙️ 运行时模型配置
- 网页端直接修改 API Key、Base URL、模型名、参数
- 即时生效，无需重启服务
- 配置持久化到 JSON 文件

---

## 🏗 系统架构

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Next.js    │────▶│  FastAPI Backend     │────▶│ PostgreSQL  │
│  Frontend   │◀────│                      │     │   + Redis   │
└─────────────┘     │  ┌──────────────┐   │     └─────────────┘
                    │  │ 8 AI Agents  │   │
                    │  │ ┌────────────┐│   │
                    │  │ │ Character  ││   │
                    │  │ │ WorldJudge ││   │
                    │  │ │ Conflict   ││   │
                    │  │ │ Consistency││   │
                    │  │ │ Narrative  ││   │
                    │  │ │ Screenplay ││   │
                    │  │ │ Seed       ││   │
                    │  │ │ Faction    ││   │
                    │  │ └────────────┘│   │
                    │  └──────────────┘   │
                    └──────────────────────┘
```

**支持任何 OpenAI 兼容 API**：OpenAI、DeepSeek、Ollama、vLLM 等。

---

## 🚀 快速启动

### Docker Compose（推荐）

```bash
git clone <repo-url>
cd agent-real-world

# 1. 配置 LLM（首次）
cp .env.example .env
# 编辑 .env 填入 API Key

# 2. 启动
docker compose up -d --build

# 前端：http://localhost:3000
# 后端 API 文档：http://localhost:8000/api/docs
```

启动后直接在网页端的 ⚙️ **模型设置** 中修改 LLM 配置，无需手动编辑 `.env`。

### 本地开发

```bash
# 后端
cd services/api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd apps/web
npm install
npm run dev
```

---

## 📁 项目结构

```
agent-real-world/
├── apps/web/                          # Next.js 前端
│   └── src/
│       ├── app/projects/[projectId]/  # 6 个页面 Tab
│       │   ├── page.tsx               # 概览
│       │   ├── world/                 # 世界构建
│       │   ├── characters/            # 角色管理
│       │   ├── simulation/            # 模拟控制台
│       │   ├── narrative/             # 叙事工作台
│       │   └── export/                # 导出
│       ├── components/
│       │   └── SettingsDialog.tsx     # 模型设置弹窗
│       └── lib/
│           ├── api.ts                 # API 客户端
│           └── i18n.tsx               # 国际化
│
├── services/api/                      # FastAPI 后端
│   └── app/
│       ├── agents/                    # 8 个 AI Agent
│       │   ├── base_agent.py          # Agent 基类
│       │   ├── llm_client.py          # LLM 调用客户端
│       │   ├── orchestrator.py        # Agent 编排器
│       │   ├── character_agent.py     # 角色意图生成
│       │   ├── world_judge.py         # 世界裁判
│       │   ├── conflict_resolver.py   # 冲突推进
│       │   ├── consistency_review.py  # 连贯性审查
│       │   ├── narrative_reconstruction.py  # 叙事节拍生成
│       │   ├── screenplay_formatter.py      # 场景剧本生成
│       │   ├── seed_generation.py     # 世界种子生成
│       │   ├── faction_agent.py       # 势力 Agent
│       │   └── prompts/               # Prompt 模板
│       ├── routers/                   # 9 组 API 路由
│       │   ├── projects.py
│       │   ├── worlds.py
│       │   ├── characters.py
│       │   ├── simulations.py
│       │   ├── narratives.py
│       │   ├── exports.py
│       │   ├── variables.py
│       │   └── settings.py
│       ├── models/                    # SQLAlchemy ORM 模型
│       ├── schemas/                   # Pydantic 校验模型
│       ├── services/                  # 核心业务逻辑
│       │   ├── simulation_engine.py   # Tick 管线引擎
│       │   ├── event_store.py         # 不可变事件存储
│       │   └── context_builder.py     # Agent 上下文构建
│       └── core/
│           ├── config.py              # .env 配置
│           ├── database.py            # 数据库连接
│           └── runtime_config.py      # 运行时可变配置
│
├── doc/                               # 设计文档
├── docker-compose.yml
└── .env                               # 环境变量
```

---

## 🧠 核心概念

### Tick 管线

每个模拟 Tick 执行 7 步管线：

```
构建角色上下文 → 并行运行角色 Agent → 世界裁判评判 → 冲突推进
    → 连贯性审查 → 提交事件（不可变） → 更新角色状态
```

### 叙事重组

客观事件流 → AI 筛选/重组 → 叙事节拍 → 场景剧本

模拟和叙事完全解耦：同一组事件可以从不同主角视角、不同叙事结构生成多个故事版本。

### 事件不可变

已提交事件永远不可修改或删除。过去是确定的，只有未来可以通过变量注入来干预。

---

## 🔧 配置

### 环境变量（`.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | LLM API Key | `sk-placeholder` |
| `OPENAI_API_BASE` | API Base URL（留空=OpenAI 官方） | `""` |
| `LLM_MODEL` | 模型名称 | `gpt-4o-mini` |
| `LLM_MAX_TOKENS` | 最大输出 Token | `4096` |
| `LLM_TEMPERATURE` | 温度 | `0.7` |
| `DATABASE_URL` | PostgreSQL 连接串 | 本地 Docker 默认 |

所有 LLM 配置都可在网页端 **⚙️ 模型设置** 中即时修改，无需重启。

---

## 🛠 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 15, React 19, TanStack Query, Tailwind CSS |
| 后端 | FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| AI | OpenAI Python SDK, 8 Agent 架构 |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7, Celery |
| 部署 | Docker Compose |

---

## 📄 License

MIT
