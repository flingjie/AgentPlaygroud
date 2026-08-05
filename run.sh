#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  echo "Usage: $0 [backend|frontend|all|stop]"
  echo ""
  echo "  backend   Start only the FastAPI backend (port 8000)"
  echo "  frontend  Start only the React dev server (port 5173)"
  echo "  all       Start both backend and frontend (default)"
  echo "  stop      Kill all running dev servers"
  exit 1
}

stop_all() {
  echo -e "${YELLOW}Stopping all dev servers...${NC}"
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  echo -e "${GREEN}Done.${NC}"
}

start_backend() {
  echo -e "${BLUE}=== Starting Backend (FastAPI) on http://localhost:8000 ===${NC}"
  cd "$ROOT/backend"
  pip install -r requirements.txt -q 2>/dev/null
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
  BACKEND_PID=$!
  echo -e "${GREEN}Backend PID: $BACKEND_PID${NC}"
}

start_frontend() {
  echo -e "${BLUE}=== Starting Frontend (React/Vite) on http://localhost:5173 ===${NC}"
  cd "$ROOT/frontend"
  npm run dev &
  FRONTEND_PID=$!
  echo -e "${GREEN}Frontend PID: $FRONTEND_PID${NC}"
}

case "${1:-all}" in
  backend)
    start_backend
    wait $BACKEND_PID
    ;;
  frontend)
    start_frontend
    wait $FRONTEND_PID
    ;;
  all)
    trap stop_all EXIT INT TERM
    start_backend
    sleep 1
    start_frontend
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Agent Forge MVP is running!${NC}"
    echo -e "${GREEN}  Frontend : http://localhost:5173${NC}"
    echo -e "${GREEN}  Backend  : http://localhost:8000${NC}"
    echo -e "${GREEN}  API Docs : http://localhost:8000/docs${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop both servers.${NC}"
    wait
    ;;
  stop)
    stop_all
    ;;
  *)
    usage
    ;;
esac
