#!/usr/bin/env bash
set -e

echo "LLM Assessment Setup"
echo "========================"

# Check Ollama
if ! command -v ollama &> /dev/null; then
  echo "Ollama not found. Install from https://ollama.com"
  echo "   macOS:  brew install ollama"
  echo "   Linux:  curl -fsSL https://ollama.com/install.sh | sh"
  exit 1
fi
echo "Ollama found"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "⏳ Starting Ollama..."
  ollama serve &
  sleep 3
fi
echo "Ollama running"

# Pull model if not present
MODEL=${OLLAMA_MODEL:-llama3.2}
if ! ollama list | grep -q "$MODEL"; then
  echo "Pulling $MODEL (this may take a few minutes)..."
  ollama pull "$MODEL"
fi
echo "Model $MODEL ready"

# Install deps
echo "📦Installing dependencies..."
npm run install:all

# Copy env if missing
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from example"
fi

echo ""
echo "Setup complete!"
echo ""
echo "▶  Run:  npm run dev"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Ollama:   http://localhost:11434"
