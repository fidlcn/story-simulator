# Mac 部署指南 (Docker Desktop)

## 前提条件检查

```bash
# 确认 Docker Desktop 已启动
docker info > /dev/null 2>&1 && echo "✅ Docker 运行中" || echo "❌ 请先启动 Docker Desktop"

# 确认 Python 3.11+ 已安装
python3 --version

# 确认 Node.js 20+ 已安装
node --version

# 确认 pip 可用
pip3 --version
```

如果没有 Python 或 Node.js，先安装：
```bash
# Python (如果没装)
brew install python@3.11

# Node.js (如果没装)
brew install node
```

---

## 第一步：启动 PostgreSQL + Redis (Docker)

打开终端，进入项目目录：

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world
```

启动数据库和 Redis：

```bash
docker compose up postgres redis -d
```

等待几秒后验证：

```bash
docker compose ps
```

你应该看到 `postgres` 和 `redis` 两个服务状态为 `running` (healthy)。

---

## 第二步：配置后端

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world/services/api
```

创建环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，**必须设置你的 OpenAI API Key**：

```bash
# 用你喜欢的编辑器打开
open -e .env
# 或者
nano .env
```

将 `sk-your-api-key-here` 替换为你的真实 key：
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxx
LLM_MODEL=gpt-4o-mini
```

---

## 第三步：安装 Python 依赖

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world/services/api

# 创建虚拟环境 (推荐)
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

如果安装 `weasyprint` 报错，可以先移除它：
```bash
# weasyprint 是 PDF 导出用的，MVP 阶段可以先不用
pip install -r requirements.txt --no-deps || true
pip install fastapi uvicorn sqlalchemy asyncpg alembic pydantic pydantic-settings celery redis openai httpx python-multipart
```

---

## 第四步：创建数据库表

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world/services/api
source .venv/bin/activate

# 生成迁移文件
alembic revision --autogenerate -m "create all tables"

# 执行迁移
alembic upgrade head
```

如果 alembic 报 `target_metadata` 为空的警告，可以手动验证：
```bash
# 连接数据库验证表已创建
docker compose exec postgres psql -U postgres -d story_simulator -c "\dt"
```

应该看到 22 张表。

---

## 第五步：启动后端

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world/services/api
source .venv/bin/activate

uvicorn app.main:app --reload --port 8000
```

验证：浏览器打开 http://localhost:8000/api/health
应该看到 `{"status":"ok","version":"0.1.0"}`

API 文档：http://localhost:8000/api/docs

---

## 第六步：安装前端依赖并启动

**打开一个新的终端窗口**：

```bash
cd /Users/fidlcn/Documents/Project/agent-real-world/apps/web

npm install

npm run dev
```

验证：浏览器打开 http://localhost:3000
应该看到项目列表页面（还没有项目）。

---

## 第七步：验证端到端

1. 打开 http://localhost:3000
2. 点击 **"+ 新建项目"**
3. 输入：名称=`记忆之城`，题材=`政治幻想惊悚`，前提=`一座依靠记忆提取维持法律和金融系统的城邦...`
4. 点击 **"创建"**
5. 进入项目 → 点击 **"世界"** → 添加世界事实 → 锁定
6. 进入项目 → 点击 **"人物"** → 创建角色
7. 进入项目 → 点击 **"模拟"** → 新建模拟 → Run Tick

---

## 常见问题

### Q: `docker compose up` 报端口占用
```bash
# 检查是否有其他 PostgreSQL/Redis 在运行
lsof -i :5432
lsof -i :6379

# 停掉占用的服务
brew services stop postgresql
brew services stop redis
```

### Q: `alembic upgrade head` 报连接失败
```bash
# 确认数据库正在运行
docker compose ps postgres

# 如果没运行，重启
docker compose up postgres -d
```

### Q: `uvicorn` 启动报 `ModuleNotFoundError`
```bash
# 确保在虚拟环境中
cd /Users/fidlcn/Documents/Project/agent-real-world/services/api
source .venv/bin/activate
which python  # 应该显示 .venv/bin/python
```

### Q: `npm install` 报错
```bash
# 清除缓存重试
rm -rf node_modules package-lock.json
npm install
```

### Q: 前端页面打开空白/报错连接后端失败
确认后端已启动 (http://localhost:8000/api/health 返回 OK)。
如果后端在不同端口，设置环境变量：
```bash
NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT npm run dev
```

---

## 停止服务

```bash
# 停止后端/前端：在各自的终端按 Ctrl+C

# 停止 Docker 中的数据库和 Redis
cd /Users/fidlcn/Documents/Project/agent-real-world
docker compose down

# 停止并删除数据 (慎用！会清除所有数据)
docker compose down -v
```

---

## 总结：需要几个终端

| 终端 | 目录 | 命令 | 作用 |
|------|------|------|------|
| 1 | 项目根目录 | `docker compose up postgres redis -d` | 数据库+缓存 (后台) |
| 2 | `services/api/` | `source .venv/bin/activate && uvicorn app.main:app --reload` | 后端 API |
| 3 | `apps/web/` | `npm run dev` | 前端页面 |
