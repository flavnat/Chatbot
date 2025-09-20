# RAG Chatbot

A production-ready chatbot with **Dual RAG Implementations** (Python + JavaScript) using MERN stack.


This project features **two complete RAG implementations** running in parallel, allowing you to choose the best approach for your specific use case:

### **Python RAG** (Haystack Framework)
- **Framework**: Haystack AI with advanced NLP pipelines
- **Embeddings**: SentenceTransformers with multiple model options
- **Vector Store**: Qdrant with optimized retrieval
- **Strengths**: Advanced preprocessing, complex queries, extensive customization
- **Performance**: Robust for complex document analysis and multi-modal content
- **Use Case**: Enterprise applications requiring sophisticated document processing

### **JavaScript RAG** (Node.js Native)
- **Framework**: Pure JavaScript with @xenova/transformers
- **Embeddings**: all-MiniLM-L6-v2 model running client-side
- **Vector Store**: Qdrant with REST API integration
- **Strengths**: Zero Python dependencies, fast startup, edge computing ready
- **Performance**: 53% faster response times, lower memory footprint
- **Use Case**: Web applications, edge computing, serverless environments

### **Built-in Comparison Testing**
Run comprehensive benchmarks between both implementations:
```bash
# Run full comparison suite
npm run test:compare

# Test individual implementations
npm run test:js      # JavaScript RAG tests
npm run test:python  # Python RAG tests
```

### **Automatic Fallback System**
- Both implementations run in parallel for maximum reliability
- Automatic failover if one implementation encounters issues
- Consistent API responses regardless of which RAG engine is used
- Real-time performance monitoring and switching capabilities

### **Performance Comparison** (Latest Benchmark - September 19, 2025)
```
📊 COMPARISON TEST RESULTS
============================================================

📈 Success Rates:
JavaScript: 4/4 tests passed (100.0%)
Python: 4/4 tests passed (100.0%)

⏱️  Total Execution Time:
JavaScript: 24.6s
Python: 52.8s
Time ratio (JS/Python): 0.47x (JavaScript 53% faster)

📋 Detailed Performance:
🔹 LLM Providers:     JavaScript: 0ms    | Python: 1.8s
🔹 Document Operations: JavaScript: 4.4s  | Python: 10.0s
🔹 Basic Chat Response: JavaScript: 10.6s | Python: 24.9s
🔹 Complex Response:   JavaScript: 9.6s  | Python: 16.0s

Key Insights:
- Both implementations achieve 100% success rate with proper error handling
- JavaScript implementation is 53% faster overall with consistent performance
- JavaScript excels in LLM provider initialization and basic operations
- Python shows strength in complex document processing when retrieval works
- JavaScript offers better reliability for production environments
```

## Features

- **Multi-LLM Support**: Google Gemini, OpenAI GPT, DeepSeek
- **RAG Pipeline**: Haystack framework for document processing and retrieval
- **Vector Database**: Qdrant for efficient similarity search
- **Real-time Chat**: WebSocket-based conversations with localStorage persistence
- **Conversation Templates**: Dynamic conversation starters and guided interactions
- **Document Training**: Automatic knowledge base updates
- **Backend Utilities**: Rate limiting, query caching, and conversation management

## Tech Stack

- **Frontend**: React 19 + Redux Toolkit + Ant Design + Styled Components
- **Backend**: Node.js + Express + MongoDB Atlas
- **AI/ML**: Python + Haystack + Qdrant + Multiple LLM Providers
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis-compatible query caching
- **Rate Limiting**: Express rate limiting middleware
- **Logging**: Winston with daily rotation
- **Containerization**: Docker + Docker Compose

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

``` env
cd backend
cp .env.example .env
```

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

## 🧪 Testing & Benchmarking

### **Comprehensive Test Suite**
```bash
# Run all tests
npm test

# Implementation comparison (RECOMMENDED)
npm run test:compare

# Individual implementation tests
npm run test:js          # JavaScript RAG tests
npm run test:python      # Python RAG tests

# Health and diagnostics
npm run health:check     # System health check
```

### **Test Coverage**
- ✅ **LLM Provider Testing**: Validates all AI providers (Gemini, OpenAI, DeepSeek)
- ✅ **Document Operations**: Tests indexing and retrieval performance
- ✅ **Chat Response Quality**: Benchmarks response generation and accuracy
- ✅ **Error Handling**: Ensures graceful failure recovery
- ✅ **Performance Metrics**: Detailed timing and resource usage analysis

### **Latest Test Results Summary**
- **Success Rate**: Both implementations achieve 100% test pass rate
- **Performance**: JavaScript RAG is 53% faster than Python RAG
- **Reliability**: Robust error handling with automatic fallback mechanisms
- **Compatibility**: Seamless integration with all supported LLM providers

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/sessions` | Get chat sessions |
| GET | `/api/chat/templates` | Get conversation templates |
| GET | `/api/chat/documents/train` | Train on chat data |
| GET | `/api/chat/stats` | Get chat statistics |
| GET | `/api/health` | Health check endpoint |
| GET | `/api/debug/database` | Database connection status |
| GET | `/api/debug/cache` | Cache statistics and status |
| GET | `/api/debug/rate-limit` | Rate limiting status |

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

// Get conversation templates
const templates = await fetch('/api/chat/templates');
const templateData = await templates.json();

// Check system health
const health = await fetch('/api/health');
const healthStatus = await health.json();
```


## Key Components

### Dual RAG Implementations

#### **Python RAG Stack**
- `haystack_rag.py`: Advanced document indexing and retrieval using Haystack framework
- `rag_chatbot.py`: Main chatbot logic combining retrieval + generation with conversation context
- `llm_factory.py`: Multi-provider LLM management (Gemini, OpenAI, DeepSeek)
- **Advantages**: Rich ecosystem, advanced NLP features, extensive customization options

#### **JavaScript RAG Stack**
- `js-rag.js`: Pure JavaScript document processing with @xenova/transformers
- `js-rag-chatbot.js`: Client-side RAG implementation with native performance
- `js-llm-factory.js`: JavaScript LLM provider integration
- **Advantages**: Zero Python dependencies, faster startup, edge computing compatible

### Backend Utilities
- **RateLimiter**: Express middleware for API rate limiting and abuse prevention
- **QueryCache**: Redis-compatible caching system for AI responses and frequently accessed data
- **ConversationTemplates**: Dynamic conversation starters with categorized templates (greeting, technical support, sales, etc.)
- **ConversationalChatbot**: Main AI chatbot logic with multi-provider LLM support
- **PythonProcessManager**: Orchestrates Python scripts and handles inter-process communication
- **TextSanitizer**: Input validation and sanitization for security
- **Logger**: Winston-based logging with daily rotation and multiple log levels
