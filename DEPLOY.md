# CV HELL — 一键部署指南

## 系统要求

| 依赖 | 版本 |
|------|------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| Poppler | 最新 (PDF 转图片) |
| LibreOffice | 可选 (DOCX 转图片) |

---

## 快速部署（本地开发）

### 第一步：安装系统依赖

```bash
# macOS
brew install python node postgresql poppler

# Ubuntu / Debian
sudo apt update && sudo apt install python3 python3-pip nodejs npm postgresql poppler-utils
```

启动 PostgreSQL 服务：

```bash
# macOS (Homebrew)
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql
```

### 第二步：创建数据库

```bash
psql -U postgres -c "CREATE DATABASE cvhell;"
```

### 第三步：克隆项目

```bash
git clone https://github.com/CV-HELL-Lab/cv-hell.git
cd cv-hell
```

### 第四步：部署后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
```

编辑 `.env` 文件，填入你的实际配置：

```env
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/cvhell
JWT_SECRET_KEY=随便写一个长字符串
ADMIN_PASSWORD_HASH=见下方生成方式
ADMIN_SECRET_KEY=随便写一个长字符串
```

生成 Admin 密码哈希（替换 `your-password` 为你想用的密码）：

```bash
python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your-password'))"
```

初始化数据库 & 种子数据：

```bash
python seed.py
python seed_reference_pool.py
```

启动后端：

```bash
uvicorn main:app --reload --port 9090
```

验证后端运行：打开浏览器访问 `http://localhost:9090/docs` 查看 API 文档。

### 第五步：部署前端

打开**新的终端窗口**：

```bash
cd frontend

# 安装依赖
npm install

# 设置后端地址
export NEXT_PUBLIC_API_URL=http://127.0.0.1:9090

# 启动前端（开发模式）
npm run dev
```

### 第六步：配置 LLM API Key

1. 打开 `http://localhost:3000/admin`
2. 使用 Admin 账号登录（用户名 `admin`，密码为你在第四步生成哈希时设定的密码）
3. 点击侧边栏 **LLM Configs**
4. 点击 **Add Key**，选择 Provider（DeepSeek 或 Qwen），填入你的 API Key
5. 点击 **Save Key**

### 完成！

- 前端地址：`http://localhost:3000`
- 后端 API：`http://localhost:9090`
- Admin 面板：`http://localhost:3000/admin`
- API 文档：`http://localhost:9090/docs`

---

## 一键启动脚本

创建 `start.sh` 放在项目根目录，以后只需运行 `./start.sh` 即可：

```bash
#!/bin/bash
set -e

echo "=== CV HELL — Starting Services ==="

# 启动后端
echo "[1/2] Starting backend on port 9090..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 9090 &
BACKEND_PID=$!
cd ..

# 等待后端就绪
sleep 2

# 启动前端
echo "[2/2] Starting frontend on port 3000..."
cd frontend
export NEXT_PUBLIC_API_URL=http://127.0.0.1:9090
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== CV HELL is running! ==="
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:9090"
echo "  Admin:     http://localhost:3000/admin"
echo ""
echo "Press Ctrl+C to stop all services."

# 捕获退出信号，关闭所有子进程
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
```

赋予执行权限：

```bash
chmod +x start.sh
```

---

## 生产环境部署（可选）

### 前端构建

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://你的后端域名 npm run build
npm run start   # 默认监听 3000 端口
```

### 后端生产启动

```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 9090 --workers 4
```

### 环境变量检查清单

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串 |
| `JWT_SECRET_KEY` | 是 | 用户 JWT 签名密钥 |
| `ADMIN_PASSWORD_HASH` | 是 | Admin 密码的 bcrypt 哈希 |
| `ADMIN_SECRET_KEY` | 是 | Admin JWT 签名密钥 |
| `NEXT_PUBLIC_API_URL` | 是 | 前端连接后端的地址 |
| `SUBMISSION_COST` | 否 | 每次提交扣除积分（默认 10） |
| `INITIAL_POINTS` | 否 | 新用户初始积分（默认 100） |

### 反向代理（Nginx 示例）

```nginx
server {
    listen 80;
    server_name cvhell.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:9090;
        proxy_set_header Host $host;
        client_max_body_size 10M;
    }
}
```

---

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| `Address already in use` | 端口被占用，换一个端口或 `lsof -i :9090` 找到并 kill 旧进程 |
| `hash could not be identified` | `.env` 中的 `ADMIN_PASSWORD_HASH` 格式不对，重新生成 bcrypt 哈希 |
| 前端 404 | 确保前端 `npm run dev` 正在运行；确认访问的是 `localhost:3000` 而非 `9090` |
| LLM 调用失败 | 在 Admin 面板 → LLM Configs 确认已添加有效的 API Key |
| 数据库连接失败 | 确认 PostgreSQL 正在运行，`.env` 中的 `DATABASE_URL` 正确 |
| 上传文件失败 | 安装 `poppler`（PDF 转图片必需）；确认 `uploads/` 目录可写 |
