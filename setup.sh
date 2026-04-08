#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
#  CV HELL — 一键安装 & 启动脚本
#  适用于 macOS / Ubuntu / Debian / Raspberry Pi
#  用法:  chmod +x setup.sh && ./setup.sh
# ============================================================================

REPO_URL="https://github.com/CV-HELL-Lab/cv-hell.git"
DEFAULT_BACKEND_PORT=9090
DEFAULT_FRONTEND_PORT=3000
DEFAULT_DB_NAME="cvhell"
DEFAULT_DB_USER="postgres"
DEFAULT_ADMIN_PASSWORD="123456"

# ---------- 颜色 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }
ask()   { echo -en "${BOLD}$*${NC}"; }

# ---------- 检测操作系统 ----------
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  elif [[ -f /etc/debian_version ]]; then
    OS="debian"
  else
    OS="unknown"
    warn "未检测到 macOS 或 Debian/Ubuntu，部分自动安装可能不可用"
  fi
  info "检测到操作系统: $OS"
}

# ---------- 交互式配置 ----------
configure() {
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}       CV HELL — 一键安装配置向导         ${NC}"
  echo -e "${BOLD}══════════════════════════════════════════${NC}"
  echo ""

  # 项目目录
  ask "项目安装目录 [默认: ~/Desktop/cv-hell]: "
  read -r PROJECT_DIR
  PROJECT_DIR="${PROJECT_DIR:-$HOME/Desktop/cv-hell}"

  # 是否克隆代码（如果目录已存在可跳过）
  CLONE_REPO=true
  if [[ -d "$PROJECT_DIR" ]]; then
    warn "目录 $PROJECT_DIR 已存在"
    ask "是否跳过克隆，使用现有代码？(Y/n): "
    read -r skip_clone
    if [[ "${skip_clone:-Y}" =~ ^[Yy]$ ]]; then
      CLONE_REPO=false
    fi
  fi

  # 数据库
  ask "PostgreSQL 数据库名 [默认: $DEFAULT_DB_NAME]: "
  read -r DB_NAME
  DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"

  ask "PostgreSQL 用户名 [默认: $DEFAULT_DB_USER]: "
  read -r DB_USER
  DB_USER="${DB_USER:-$DEFAULT_DB_USER}"

  ask "PostgreSQL 密码 [留空则无密码]: "
  read -rs DB_PASS
  echo ""

  # 端口（必须 1024-65535）
  while true; do
    ask "后端端口 [默认: $DEFAULT_BACKEND_PORT]: "
    read -r BACKEND_PORT
    BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}"
    BACKEND_PORT=$((10#$BACKEND_PORT))
    if [[ "$BACKEND_PORT" -ge 1024 && "$BACKEND_PORT" -le 65535 ]]; then break; fi
    warn "端口必须在 1024-65535 之间，请重新输入"
  done

  while true; do
    ask "前端端口 [默认: $DEFAULT_FRONTEND_PORT]: "
    read -r FRONTEND_PORT
    FRONTEND_PORT="${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}"
    FRONTEND_PORT=$((10#$FRONTEND_PORT))
    if [[ "$FRONTEND_PORT" -ge 1024 && "$FRONTEND_PORT" -le 65535 ]]; then break; fi
    warn "端口必须在 1024-65535 之间，请重新输入"
  done

  # Admin 密码
  ask "Admin 面板密码 [默认: $DEFAULT_ADMIN_PASSWORD]: "
  read -rs ADMIN_PASSWORD
  echo ""
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$DEFAULT_ADMIN_PASSWORD}"

  # 运行模式
  ask "运行模式 — dev(开发) 或 prod(生产) [默认: dev]: "
  read -r RUN_MODE
  RUN_MODE="${RUN_MODE:-dev}"

  # 构建 DATABASE_URL
  if [[ -n "$DB_PASS" ]]; then
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
  elif [[ "$DB_USER" == "postgres" && "$OS" == "macos" ]]; then
    DATABASE_URL="postgresql://localhost:5432/${DB_NAME}"
  elif [[ "$OS" == "debian" ]]; then
    # Debian/Raspberry Pi 默认 postgres 用 peer auth，需要设置密码
    DB_PASS="cvhell_$(python3 -c "import secrets; print(secrets.token_hex(4))" 2>/dev/null || echo pass)"
    info "为 PostgreSQL 用户 $DB_USER 自动生成密码"
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
  else
    DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}"
  fi

  echo ""
  echo -e "${BOLD}── 配置确认 ──${NC}"
  echo "  项目目录:     $PROJECT_DIR"
  echo "  克隆代码:     $CLONE_REPO"
  echo "  数据库:       $DATABASE_URL"
  echo "  后端端口:     $BACKEND_PORT"
  echo "  前端端口:     $FRONTEND_PORT"
  echo "  Admin 密码:   ******"
  echo "  运行模式:     $RUN_MODE"
  echo ""

  ask "确认以上配置并开始安装？(Y/n): "
  read -r confirm
  if [[ ! "${confirm:-Y}" =~ ^[Yy]$ ]]; then
    info "已取消"
    exit 0
  fi
}

# ---------- 安装系统依赖 ----------
install_system_deps() {
  info "检查系统依赖..."

  if [[ "$OS" == "macos" ]]; then
    if ! command -v brew &>/dev/null; then
      fail "未安装 Homebrew。请先安装: https://brew.sh"
    fi

    local deps_to_install=()
    command -v python3 &>/dev/null || deps_to_install+=(python)
    command -v node &>/dev/null    || deps_to_install+=(node)
    command -v psql &>/dev/null    || deps_to_install+=(postgresql)
    command -v pdftoppm &>/dev/null || deps_to_install+=(poppler)

    if [[ ${#deps_to_install[@]} -gt 0 ]]; then
      info "安装缺少的依赖: ${deps_to_install[*]}"
      brew install "${deps_to_install[@]}"
    fi

    # 确保 PostgreSQL 启动
    brew services start postgresql 2>/dev/null || true

  elif [[ "$OS" == "debian" ]]; then
    local deps_to_install=()
    command -v python3 &>/dev/null  || deps_to_install+=(python3 python3-pip python3-venv)
    command -v psql &>/dev/null     || deps_to_install+=(postgresql postgresql-client)
    command -v pdftoppm &>/dev/null || deps_to_install+=(poppler-utils)
    # 编译依赖（psycopg2 等在 ARM 上需要从源码编译）
    deps_to_install+=(python3-dev libpq-dev postgresql-server-dev-all build-essential libffi-dev libssl-dev)

    if [[ ${#deps_to_install[@]} -gt 0 ]]; then
      info "安装缺少的依赖: ${deps_to_install[*]}"
      sudo apt-get update -qq
      sudo apt-get install -y -qq "${deps_to_install[@]}" 2>/dev/null || \
        sudo apt-get install -y "${deps_to_install[@]}"
    fi

    # Node.js: Debian/Raspberry Pi 默认版本可能过旧，确保 >= 18
    if command -v node &>/dev/null; then
      NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
      if [[ "$NODE_VER" -lt 18 ]]; then
        warn "Node.js 版本过低 (v${NODE_VER})，需要 >= 18"
        info "通过 NodeSource 安装 Node.js 20..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      fi
    else
      info "安装 Node.js 20 (NodeSource)..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi

    sudo systemctl start postgresql 2>/dev/null || \
      sudo service postgresql start 2>/dev/null || true
    sudo systemctl enable postgresql 2>/dev/null || true
  fi

  # 验证
  command -v python3 &>/dev/null || fail "Python3 未安装"
  command -v node &>/dev/null    || fail "Node.js 未安装"
  command -v psql &>/dev/null    || fail "PostgreSQL 未安装"

  ok "系统依赖就绪"
}

# ---------- 创建数据库 ----------
setup_database() {
  info "检查数据库 $DB_NAME ..."

  local db_exists=false

  if psql -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    db_exists=true
  elif psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    db_exists=true
  elif sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    db_exists=true
  fi

  if [[ "$db_exists" == true ]]; then
    ok "数据库 $DB_NAME 已存在，跳过创建"
  else
    info "创建数据库 $DB_NAME ..."

    if createdb -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
      ok "数据库创建成功 (createdb -U $DB_USER)"
    elif createdb "$DB_NAME" 2>/dev/null; then
      ok "数据库创建成功 (createdb with current user)"
    elif sudo -u postgres createdb "$DB_NAME" 2>/dev/null; then
      ok "数据库创建成功 (sudo -u postgres createdb)"
    elif sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null; then
      ok "数据库创建成功 (sudo -u postgres psql)"
    else
      warn "无法自动创建数据库"
      echo ""
      echo -e "  请手动创建数据库，选择以下任意一种方式："
      echo -e "    ${BOLD}sudo -u postgres createdb $DB_NAME${NC}"
      echo -e "    ${BOLD}createdb $DB_NAME${NC}"
      echo -e "    ${BOLD}sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME;\"${NC}"
      echo ""
      ask "创建完成后按回车继续（或 Ctrl+C 退出）: "
      read -r
    fi
  fi

  # 始终确保数据库用户密码正确（Debian/树莓派默认用 peer auth，TCP 连接需要密码）
  if [[ -n "$DB_PASS" ]]; then
    info "设置数据库用户 $DB_USER 的密码..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null && \
      ok "数据库用户密码已设置" || warn "无法自动设置密码，请手动执行: sudo -u postgres psql -c \"ALTER USER $DB_USER WITH PASSWORD 'your_pass';\""
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
  fi

  # 确保 pg_hba.conf 允许密码认证（Debian 默认只有 peer）
  if [[ "$OS" == "debian" ]]; then
    local hba_file
    hba_file=$(sudo -u postgres psql -t -c "SHOW hba_file;" 2>/dev/null | tr -d ' ')
    if [[ -n "$hba_file" && -f "$hba_file" ]]; then
      if ! grep -q "host.*all.*all.*127.0.0.1.*md5\|host.*all.*all.*127.0.0.1.*scram" "$hba_file" 2>/dev/null; then
        info "配置 pg_hba.conf 允许本地密码认证..."
        sudo bash -c "echo 'host all all 127.0.0.1/32 md5' >> $hba_file"
        sudo bash -c "echo 'host all all ::1/128 md5' >> $hba_file"
        sudo systemctl reload postgresql 2>/dev/null || sudo service postgresql reload 2>/dev/null || true
        ok "pg_hba.conf 已更新"
      fi
    fi
  fi
}

# ---------- 克隆代码 ----------
clone_repo() {
  if [[ "$CLONE_REPO" == true ]]; then
    if [[ -d "$PROJECT_DIR/.git" ]]; then
      info "目录已存在且是 Git 仓库，拉取最新代码..."
      cd "$PROJECT_DIR" && git fetch --all && git reset --hard origin/main
      ok "代码已更新到最新版本"
    elif [[ -d "$PROJECT_DIR" ]]; then
      warn "目录已存在但不是 Git 仓库，备份后重新克隆..."
      mv "$PROJECT_DIR" "${PROJECT_DIR}.bak.$(date +%s)"
      git clone "$REPO_URL" "$PROJECT_DIR"
      ok "代码克隆完成（旧目录已备份）"
    else
      info "克隆项目代码..."
      git clone "$REPO_URL" "$PROJECT_DIR"
      ok "代码克隆完成"
    fi
  else
    ok "使用现有代码: $PROJECT_DIR"
    info "拉取最新代码..."
    cd "$PROJECT_DIR" && git pull || warn "git pull 失败，使用现有版本"
  fi
}

# ---------- 安装后端 ----------
setup_backend() {
  info "配置后端..."
  cd "$PROJECT_DIR/backend"

  # 如果旧 venv 存在且包含 psycopg2（不兼容 Python 3.13），删除重建
  if [[ -d "venv" ]] && venv/bin/pip show psycopg2-binary &>/dev/null; then
    warn "检测到旧的 psycopg2，重建虚拟环境以切换到 psycopg v3"
    rm -rf venv
  fi

  # 创建虚拟环境
  if [[ ! -d "venv" ]]; then
    python3 -m venv venv
    ok "Python 虚拟环境已创建"
  fi

  source venv/bin/activate

  # 安装依赖（ARM/树莓派上编译较慢，请耐心等待）
  info "安装 Python 依赖（ARM 设备上可能需要几分钟编译）..."

  # 树莓派默认 pip.conf 配置了 piwheels.org，经常超时
  # 临时备份并禁用系统 pip.conf 和用户 pip.conf
  RESTORE_PIP_CONF=false
  RESTORE_USER_PIP_CONF=false
  if [[ -f /etc/pip.conf ]] && grep -qi "piwheels" /etc/pip.conf 2>/dev/null; then
    warn "检测到系统 piwheels 配置，临时禁用以避免超时"
    sudo mv /etc/pip.conf /etc/pip.conf.bak.cvhell 2>/dev/null || true
    RESTORE_PIP_CONF=true
  fi
  if [[ -f "$HOME/.config/pip/pip.conf" ]] && grep -qi "piwheels" "$HOME/.config/pip/pip.conf" 2>/dev/null; then
    warn "检测到用户 piwheels 配置，临时禁用"
    mv "$HOME/.config/pip/pip.conf" "$HOME/.config/pip/pip.conf.bak.cvhell" 2>/dev/null || true
    RESTORE_USER_PIP_CONF=true
  fi

  PIP_OPTS="--timeout 120"

  pip install --upgrade pip setuptools wheel $PIP_OPTS -q
  pip install $PIP_OPTS -r requirements.txt || pip install $PIP_OPTS --no-cache-dir -r requirements.txt
  pip install $PIP_OPTS -q "httpx>=0.27,<0.28" "openai>=1.55"
  ok "Python 依赖安装完成"

  # 恢复 pip.conf
  if [[ "$RESTORE_PIP_CONF" == true ]]; then
    sudo mv /etc/pip.conf.bak.cvhell /etc/pip.conf 2>/dev/null || true
    info "已恢复 /etc/pip.conf"
  fi
  if [[ "$RESTORE_USER_PIP_CONF" == true ]]; then
    mv "$HOME/.config/pip/pip.conf.bak.cvhell" "$HOME/.config/pip/pip.conf" 2>/dev/null || true
    info "已恢复用户 pip.conf"
  fi

  # 生成 .env
  info "生成 .env 配置文件..."
  JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  ADMIN_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  ADMIN_HASH=$(python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('$ADMIN_PASSWORD'))")

  cat > .env <<ENVEOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET_KEY=$JWT_SECRET
JWT_EXPIRE_DAYS=7

MAX_REFERENCE_ITEMS=3
MAX_PRIOR_VERSIONS=3
BOSS_CONFIGS_PATH=./boss_configs
FILE_UPLOAD_MAX_BYTES=5242880
FILE_STORAGE_PATH=./uploads
ALLOWED_FILE_TYPES=pdf,docx

SUBMISSION_COST=10
INITIAL_POINTS=100

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$ADMIN_HASH
ADMIN_SECRET_KEY=$ADMIN_SECRET
ENVEOF

  ok ".env 已生成（Admin 用户名: admin，密码: 你设置的密码）"

  # 确保 uploads 目录存在
  mkdir -p uploads

  # 初始化数据库 & 种子数据
  info "初始化数据库..."
  python3 -c "
from core.database import engine, Base
import models
Base.metadata.create_all(bind=engine)
print('Tables created.')
"
  python3 seed.py
  python3 seed_reference_pool.py 2>/dev/null || warn "seed_reference_pool.py 跳过（doc 文件夹可能不存在）"

  ok "后端配置完成"
  deactivate
  cd ..
}

# ---------- 安装前端 ----------
setup_frontend() {
  info "配置前端..."
  cd "$PROJECT_DIR/frontend"

  info "安装 Node.js 依赖..."
  npm install --silent 2>/dev/null || npm install
  ok "Node.js 依赖安装完成"

  if [[ "$RUN_MODE" == "prod" ]]; then
    info "构建生产版本..."
    BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" npm run build
    ok "前端生产构建完成"
  fi

  cd ..
}

# ---------- 生成启动脚本 ----------
generate_start_script() {
  info "生成启动脚本..."

  if [[ "$RUN_MODE" == "dev" ]]; then
    cat > "$PROJECT_DIR/start.sh" <<STARTEOF
#!/bin/bash
set -e
echo ""
echo "═══════════════════════════════════════"
echo "       CV HELL — 启动服务"
echo "═══════════════════════════════════════"
echo ""

# 启动后端
echo "[1/2] 启动后端 (端口 $BACKEND_PORT)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port $BACKEND_PORT &
BACKEND_PID=\$!
cd ..

sleep 2

# 启动前端
echo "[2/2] 启动前端 (端口 $FRONTEND_PORT)..."
cd frontend
export BACKEND_URL=http://127.0.0.1:$BACKEND_PORT
npx next dev -p $FRONTEND_PORT &
FRONTEND_PID=\$!
cd ..

echo ""
echo "═══════════════════════════════════════"
echo "  CV HELL 已启动!"
echo "  前端:   http://localhost:$FRONTEND_PORT"
echo "  后端:   http://localhost:$BACKEND_PORT"
echo "  Admin:  http://localhost:$FRONTEND_PORT/admin"
echo "  API 文档: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "  Admin 登录 — 用户名: admin"
echo "═══════════════════════════════════════"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
STARTEOF
  else
    cat > "$PROJECT_DIR/start.sh" <<'STARTEOF'
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_PORT=PLACEHOLDER_BACKEND_PORT
FRONTEND_PORT=PLACEHOLDER_FRONTEND_PORT
PID_FILE="$SCRIPT_DIR/.cvhell.pids"

stop_services() {
  echo "[INFO] 停止服务..."

  # 先通过 PID 文件杀（包括所有子进程）
  if [[ -f "$PID_FILE" ]]; then
    while read -r pid; do
      # 杀掉进程及其所有子进程
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null && echo "  已停止 PID $pid" || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi

  sleep 1

  # 通过端口强杀残留进程（最可靠的方式）
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    # 方法1: fuser（Linux 最可靠）
    fuser -k "$port/tcp" 2>/dev/null && echo "  已清理端口 $port (fuser)" || true
    # 方法2: lsof 兜底
    local pids
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
    for p in $pids; do
      kill -9 "$p" 2>/dev/null && echo "  已清理端口 $port 上的进程 $p" || true
    done
  done

  sleep 1

  # 最终确认端口已释放
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    if lsof -i:"$port" >/dev/null 2>&1 || fuser "$port/tcp" >/dev/null 2>&1; then
      echo "[WARN] 端口 $port 仍被占用，强制清理..."
      fuser -k -9 "$port/tcp" 2>/dev/null || true
      lsof -t -i:"$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
      sleep 1
    fi
  done

  echo "[OK] 服务已停止"
}

start_services() {
  stop_services 2>/dev/null

  echo ""
  echo "═══════════════════════════════════════"
  echo "  CV HELL — 生产模式启动"
  echo "═══════════════════════════════════════"
  echo ""

  WORKERS=$(nproc 2>/dev/null || echo 2)
  if [ "$WORKERS" -gt 4 ]; then WORKERS=4; fi
  if [ "$WORKERS" -lt 1 ]; then WORKERS=1; fi

  echo "[1/2] 启动后端 (端口 $BACKEND_PORT, $WORKERS workers)..."
  cd backend
  source venv/bin/activate
  nohup uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --workers $WORKERS > ../logs/backend.log 2>&1 &
  echo $! >> "$PID_FILE"
  cd ..

  sleep 2

  echo "[2/2] 启动前端 (端口 $FRONTEND_PORT)..."
  cd frontend
  BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" nohup node node_modules/.bin/next start -p $FRONTEND_PORT > ../logs/frontend.log 2>&1 &
  echo $! >> "$PID_FILE"
  cd ..

  echo ""
  echo "═══════════════════════════════════════"
  echo "  CV HELL 生产环境已启动!"
  echo "  前端:   http://localhost:$FRONTEND_PORT"
  echo "  后端:   http://localhost:$BACKEND_PORT"
  echo "  Admin:  http://localhost:$FRONTEND_PORT/admin"
  echo ""
  echo "  Admin 登录 — 用户名: admin"
  echo "═══════════════════════════════════════"
  echo ""
  echo "  日志: logs/backend.log, logs/frontend.log"
  echo "  停止: ./start.sh stop"
  echo "  状态: ./start.sh status"
  echo ""
}

status_services() {
  if [[ -f "$PID_FILE" ]]; then
    echo "CV HELL 服务状态:"
    local running=0
    while read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        echo "  PID $pid — 运行中"
        running=$((running + 1))
      else
        echo "  PID $pid — 已停止"
      fi
    done < "$PID_FILE"
    echo "  运行中: $running 个进程"
  else
    echo "CV HELL 未运行"
  fi
}

mkdir -p logs

update_services() {
  echo ""
  echo "═══════════════════════════════════════"
  echo "  CV HELL — 更新"
  echo "═══════════════════════════════════════"

  stop_services

  echo "[1/3] 拉取最新代码..."
  git pull || { echo "[ERROR] git pull 失败，请检查网络或冲突"; exit 1; }

  echo "[2/3] 重新构建前端..."
  cd frontend
  rm -rf .next
  BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" npm run build || { echo "[ERROR] 前端构建失败"; exit 1; }
  cd ..

  echo "[3/3] 启动服务..."
  start_services

  echo ""
  echo "[OK] 更新完成！"
}

case "${1:-start}" in
  start)   start_services ;;
  stop)    stop_services ;;
  restart) stop_services; sleep 1; start_services ;;
  status)  status_services ;;
  update)  update_services ;;
  *)       echo "用法: $0 {start|stop|restart|status|update}" ;;
esac
STARTEOF
  fi

  # 替换端口占位符
  sed -i "s/PLACEHOLDER_BACKEND_PORT/$BACKEND_PORT/g" "$PROJECT_DIR/start.sh"
  sed -i "s/PLACEHOLDER_FRONTEND_PORT/$FRONTEND_PORT/g" "$PROJECT_DIR/start.sh"

  chmod +x "$PROJECT_DIR/start.sh"
  ok "启动脚本已生成: $PROJECT_DIR/start.sh"
}

# ---------- 主流程 ----------
main() {
  echo ""
  echo -e "${BOLD}${CYAN}"
  echo '   ██████╗██╗   ██╗    ██╗  ██╗███████╗██╗     ██╗     '
  echo '  ██╔════╝██║   ██║    ██║  ██║██╔════╝██║     ██║     '
  echo '  ██║     ██║   ██║    ███████║█████╗  ██║     ██║     '
  echo '  ██║     ╚██╗ ██╔╝    ██╔══██║██╔══╝  ██║     ██║     '
  echo '  ╚██████╗ ╚████╔╝     ██║  ██║███████╗███████╗███████╗'
  echo '   ╚═════╝  ╚═══╝      ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝'
  echo -e "${NC}"

  detect_os
  configure
  install_system_deps
  setup_database
  clone_repo
  setup_backend
  setup_frontend
  generate_start_script

  echo ""
  echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${GREEN}       安装完成!${NC}"
  echo -e "${BOLD}${GREEN}══════════════════════════════════════════${NC}"
  echo ""
  echo -e "  启动项目:  ${BOLD}cd $PROJECT_DIR && ./start.sh${NC}"
  echo ""
  echo -e "  Admin 面板: http://localhost:$FRONTEND_PORT/admin"
  echo -e "  用户名: ${BOLD}admin${NC}"
  echo -e "  密码:   ${BOLD}你设置的密码${NC}"
  echo ""
  echo -e "  ${YELLOW}提醒: 首次使用请在 Admin 面板添加 LLM API Key${NC}"
  echo -e "  ${YELLOW}路径: Admin → LLM Configs → Add Key${NC}"
  echo ""
}

main "$@"
