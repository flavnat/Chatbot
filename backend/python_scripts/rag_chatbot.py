#!/usr/bin/env python3
"""
RAG Chatbot Module
Combines LLM generation with document retrieval for context-aware responses
"""

import os
import json
import sys
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env file from the backend directory
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
    logging.info(f"Loaded environment variables from {env_path}")
except ImportError:
    logging.warning("python-dotenv not installed, using system environment variables")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RAGChatbot:
    def __init__(self):
        self.llm_factory = None
        self.rag_pipeline = None
        self.conversation_history = {}  # Store conversation context per session
        self._initialize_components()

    def _initialize_components(self):
        """Initialize LLM factory and RAG pipeline"""
        try:
            # Import and initialize LLM factory
            from llm_factory import LLMFactory
            self.llm_factory = LLMFactory()

            # Import and initialize RAG pipeline
            from haystack_rag import HaystackRAG
            self.rag_pipeline = HaystackRAG()

            logger.info("RAG Chatbot components initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import required modules: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to initialize components: {e}")

    def needs_rag(self, query: str) -> bool:
        """Determine if a query needs RAG or can be handled conversationally"""
        rag_keywords = [
            'how to', 'how do i', 'setup', 'configure', 'install', 'create',
            'delete', 'update', 'manage', 'feature', 'functionality', 'api',
            'documentation', 'guide', 'tutorial', 'pricing', 'cost', 'billing',
            'payment', 'support', 'help', 'troubleshoot', 'error', 'issue'
        ]

        lower_query = query.lower()
        return any(keyword in lower_query for keyword in rag_keywords)

    def get_conversation_context(self, session_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get conversation context for a session"""
        if session_id not in self.conversation_history:
            return []

        history = self.conversation_history[session_id]
        return history[-limit:]  # Get last N messages

    def add_to_history(self, session_id: str, role: str, message: str):
        """Add message to conversation history"""
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []

        history = self.conversation_history[session_id]
        history.append({
            'role': role,
            'message': message,
            'timestamp': str(datetime.now())
        })

        # Keep only last 20 messages to prevent memory issues
        if len(history) > 20:
            history.pop(0)
            sys.exit(1)

    def generate_response(self,
                         query: str,
                         session_id: str = None,
                         provider: str = 'gemini',
                         use_rag: bool = None,  # None = auto-detect
                         top_k: int = 3,
                         **kwargs) -> Dict[str, Any]:
        """
        Generate a conversational response, using RAG when appropriate
        """
        try:
            # Auto-detect if RAG is needed, unless explicitly specified
            should_use_rag = use_rag if use_rag is not None else self.needs_rag(query)

            if should_use_rag:
                return self._generate_rag_response(query, session_id, provider, top_k, **kwargs)
            else:
                return self._generate_conversational_response(query, session_id, provider, **kwargs)

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                'error': str(e),
                'query': query,
                'provider': provider,
                'session_id': session_id
            }

    def _generate_conversational_response(self,
                                        query: str,
                                        session_id: str,
                                        provider: str,
                                        **kwargs) -> Dict[str, Any]:
        """Generate a conversational response without RAG"""
        try:
            # Get conversation context
            context = self.get_conversation_context(session_id or 'default')
            context_text = '\n'.join([
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['message']}"
                for msg in context
            ])

            # Create conversational prompt
            conversational_prompt = f"""You are a helpful and friendly chatbot assistant for a platform called Linkbuilders. You should behave naturally and conversationally, like a helpful customer service representative.

Previous conversation:
{context_text}

Current user message: "{query}"

Guidelines:
- Be friendly, helpful, and conversational
- Don't start responses with "Based on the context" or similar formal language
- Ask follow-up questions when appropriate
- Show empathy and understanding
- Keep responses concise but helpful
- If the user asks about specific features or how-to questions, offer to provide more details
- Use natural language like "I'd be happy to help you with that!" or "That's a great question!"

Please respond naturally to the user's message:"""

            # Generate response using LLM
            llm_result = self.llm_factory.generate_response(provider, conversational_prompt, **kwargs)

            # Add to conversation history
            if session_id:
                self.add_to_history(session_id, 'user', query)
                self.add_to_history(session_id, 'assistant', llm_result['response'])

            return {
                'response': llm_result['response'],
                'provider': llm_result['provider'],
                'model': llm_result['model'],
                'usage': llm_result['usage'],
                'conversational': True,
                'session_id': session_id,
                'query': query
            }

        except Exception as e:
            logger.error(f"Error generating conversational response: {e}")
            return {
                'error': str(e),
                'query': query,
                'provider': provider,
                'session_id': session_id
            }

    def _generate_rag_response(self,
                              query: str,
                              session_id: str,
                              provider: str,
                              top_k: int,
                              **kwargs) -> Dict[str, Any]:
        """Generate a RAG-enhanced response for specific queries"""
        try:
            context_docs = []
            context_text = ""

            # Retrieve relevant documents
            retrieval_result = self.rag_pipeline.retrieve_documents(query, top_k)
            if retrieval_result['success']:
                context_docs = retrieval_result['documents']
                # Combine document contents for context
                context_texts = [doc['content'] for doc in context_docs if doc['content']]
                context_text = "\n\n".join(context_texts)

            # Get conversation context
            conversation_context = self.get_conversation_context(session_id or 'default')
            conversation_text = '\n'.join([
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['message']}"
                for msg in conversation_context
            ])

            # Create RAG prompt that's more conversational
            if context_text:
                enhanced_prompt = f"""You are a helpful chatbot assistant for Linkbuilders platform. The user is asking about something specific, and I have some relevant information to help answer their question.

Previous conversation:
{conversation_text}

Relevant information from our knowledge base:
{context_text}

User's question: "{query}"

Please provide a helpful, conversational response that:
- Uses the provided information to answer accurately
- Maintains a friendly, helpful tone
- Doesn't start with "Based on the context" - just answer naturally
- If the information isn't sufficient, use your general knowledge
- Keep the response focused and helpful

Response:"""
            else:
                # Fallback to conversational response if no relevant docs
                return self._generate_conversational_response(query, session_id, provider, **kwargs)

            # Generate response using LLM
            llm_result = self.llm_factory.generate_response(provider, enhanced_prompt, **kwargs)

            # Add to conversation history
            if session_id:
                self.add_to_history(session_id, 'user', query)
                self.add_to_history(session_id, 'assistant', llm_result['response'])

            result = {
                'response': llm_result['response'],
                'provider': llm_result['provider'],
                'model': llm_result['model'],
                'usage': llm_result['usage'],
                'rag_used': True,
                'context_documents': len(context_docs),
                'session_id': session_id,
                'query': query
            }

            if context_docs:
                result['retrieved_documents'] = context_docs

            return result

        except Exception as e:
            logger.error(f"Error generating RAG response: {e}")
            # Fallback to conversational response on error
            return self._generate_conversational_response(query, session_id, provider, **kwargs)

    def add_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Add documents to the knowledge base
        """
        try:
            result = self.rag_pipeline.index_documents(documents)
            return result
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_stats(self) -> Dict[str, Any]:
        """
        Get chatbot statistics
        """
        try:
            doc_count = self.rag_pipeline.get_document_count()
            available_providers = self.llm_factory.get_available_providers()

            return {
                'success': True,
                'document_count': doc_count.get('count', 0) if doc_count['success'] else 0,
                'available_providers': available_providers,
                'rag_enabled': True
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python rag_chatbot.py <command> [args...]',
            'commands': ['chat', 'add_docs', 'stats']
        }))
        sys.exit(1)

    command = sys.argv[1]

    try:
        chatbot = RAGChatbot()

        if command == 'chat':
            # python rag_chatbot.py chat "query" "session_id" [provider] [use_rag] [top_k]
            if len(sys.argv) < 4:
                print(json.dumps({'error': 'Usage: python rag_chatbot.py chat <query> <session_id> [provider] [use_rag] [top_k]'}))
                sys.exit(1)

            query = sys.argv[2]
            session_id = sys.argv[3]
            provider = sys.argv[4] if len(sys.argv) > 4 else 'gemini'
            use_rag = sys.argv[5].lower() == 'true' if len(sys.argv) > 5 else None  # None = auto-detect
            top_k = int(sys.argv[6]) if len(sys.argv) > 6 else 3

            result = chatbot.generate_response(query, session_id, provider, use_rag, top_k)
            print(json.dumps(result))

        elif command == 'add_docs':
            # python rag_chatbot.py add_docs "content1" "content2" ...
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python rag_chatbot.py add_docs <content> [content2] ...'}))
                sys.exit(1)

            documents = []
            for i, content in enumerate(sys.argv[2:], 2):
                documents.append({
                    'content': content,
                    'meta': {'source': f'command_line_{i}'}
                })

            result = chatbot.add_documents(documents)
            print(json.dumps(result))

        elif command == 'stats':
            result = chatbot.get_stats()
            print(json.dumps(result))

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))

    except Exception as e:
        logger.error(f"Error in main: {e}")
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()