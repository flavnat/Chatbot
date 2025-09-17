# RAG Chatbot

A production-ready chatbot with Retrieval-Augmented Generation (RAG) using MERN stack + Python.

## Features

- Multi-LLM Support: Google Gemini, OpenAI GPT, DeepSeek
- RAG Pipeline: Haystack framework for document processing and retrieval
- Vector Database: Qdrant for efficient similarity search
- Real-time Chat: WebSocket-based conversations
- Document Training: Automatic knowledge base updates
- Admin Dashboard: Chat statistics and management

## Tech Stack

- Frontend: React 19 + Redux Toolkit + Ant Design
- Backend: Node.js + Express + MongoDB
- AI/ML: Python + Haystack + Qdrant

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB
- Qdrant

### Installation

```bash
# Clone repository
git clone <repo-url>
cd chatbot

# Backend setup
cd backend
npm install
cd python_scripts
pip install -r requirements.txt

# Frontend setup
cd ../../frontend
pnpm install
```

### Configuration

Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatbot_db
GOOGLE_API_KEY=your_key
QDRANT_URL=http://localhost:6333
```

### Start Services

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && pnpm run dev
```

## Scripts

```bash
# Install all dependencies (Node.js + Python)
npm run install:all

# Setup Python environment
npm run setup:python

# Setup Qdrant database
npm run setup:qdrant

# Train chatbot on existing data
npm run train:chatbot

# Seed database with initial data
npm run db:seed

# Health check
npm run health:check

# Clean log files
npm run clean:logs

# Run tests
npm test

# Run Python tests
npm run test:python

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/sessions` | Get chat sessions |
| GET | `/api/chat/documents/train` | Train on chat data |
| GET | `/api/chat/stats` | Get statistics |

### Example Usage

```javascript
// Send message with RAG
const response = await fetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: "What is machine learning?",
        provider: "gemini",
        useRag: true
    })
});
```

## Project Structure

```
chatbot/
├── backend/
│   ├── src/routes/chat.js      # Chat API endpoints
│   ├── python_scripts/         # AI/ML components
│   │   ├── rag_chatbot.py     # Main chatbot logic
│   │   ├── haystack_rag.py    # Document processing
│   │   └── llm_factory.py     # LLM management
│   └── data/linkbuilders.json # Knowledge base
├── frontend/src/components/    # React components
└── docker-compose.yml          # Container orchestration
```

## Key Components

### Python Scripts
- `llm_factory.py`: Unified interface for multiple LLM providers
- `haystack_rag.py`: Document indexing and retrieval
- `rag_chatbot.py`: RAG pipeline combining retrieval + generation

### Training Process
1. Chat conversations stored in MongoDB
2. `GET /api/chat/documents/train` extracts Q&A pairs
3. Markdown formatting sanitized for vector DB
4. Documents indexed in Qdrant via Haystack
5. Knowledge base updated automatically

## Security

- Rate limiting and CORS protection
- Input validation and sanitization
- Secure API key management
- Production-ready error handling

## Monitoring

- Health checks: `GET /api/health`
- Chat statistics: `GET /api/chat/stats`
- Winston logging with daily rotation

## Production

1. Set `NODE_ENV=production`
2. Use production databases
3. Configure HTTPS and secure headers
4. Set up monitoring and alerts

