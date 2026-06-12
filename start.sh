#!/bin/bash
# Kill any existing instances first
pkill -f "server.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

echo "🚀 Starting backend..."
cd /workspaces/competitor-watch
python server.py &
BACKEND_PID=$!
echo "✅ Backend running (PID $BACKEND_PID) on :8000"

echo "🚀 Starting frontend..."
cd /workspaces/competitor-watch/frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running (PID $FRONTEND_PID) on :5173"

echo ""
echo "Both servers running. Open :5173 in browser."
echo "Press Ctrl+C to stop all."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
