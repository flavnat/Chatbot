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
            sys.exit(1)

    def generate_response(self,
                         query: str,
                         provider: str = 'gemini',
                         use_rag: bool = True,
                         top_k: int = 3,
                         **kwargs) -> Dict[str, Any]:
        """
        Generate a response using RAG (Retrieval-Augmented Generation)
        """
        try:
            context_docs = []
            context_text = ""

            # Retrieve relevant documents if RAG is enabled
            if use_rag:
                retrieval_result = self.rag_pipeline.retrieve_documents(query, top_k)
                if retrieval_result['success']:
                    context_docs = retrieval_result['documents']
                    # Combine document contents for context
                    context_texts = [doc['content'] for doc in context_docs if doc['content']]
                    context_text = "\n\n".join(context_texts)
            
            # Create enhanced prompt with context
            if context_text:
                enhanced_prompt = f"""
Based on the following context information, please answer the user's question.
If the context doesn't contain relevant information, use your general knowledge to provide a helpful response.

Context:
{context_text}

Question: {query}

Please provide a comprehensive and accurate answer based on the available context and your knowledge.
"""
            else:
                enhanced_prompt = query

            # Generate response using LLM
            llm_result = self.llm_factory.generate_response(provider, enhanced_prompt, **kwargs)

            # Combine results
            result = {
                'response': llm_result['response'],
                'provider': llm_result['provider'],
                'model': llm_result['model'],
                'usage': llm_result['usage'],
                'rag_used': use_rag,
                'context_documents': len(context_docs) if use_rag else 0,
                'query': query
            }

            if use_rag:
                result['retrieved_documents'] = context_docs

            return result

        except Exception as e:
            logger.error(f"Error generating RAG response: {e}")
            return {
                'error': str(e),
                'query': query,
                'provider': provider,
                'rag_used': use_rag
            }

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
            # python rag_chatbot.py chat "query" [provider] [use_rag] [top_k]
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python rag_chatbot.py chat <query> [provider] [use_rag] [top_k]'}))
                sys.exit(1)

            query = sys.argv[2]
            provider = sys.argv[3] if len(sys.argv) > 3 else 'gemini'
            use_rag = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
            top_k = int(sys.argv[5]) if len(sys.argv) > 5 else 3

            result = chatbot.generate_response(query, provider, use_rag, top_k)
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