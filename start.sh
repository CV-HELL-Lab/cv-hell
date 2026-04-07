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

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
