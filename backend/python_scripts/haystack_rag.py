#!/usr/bin/env python3
"""
Haystack RAG Pipeline            
"""

import os
import json
import sys
from typing import List, Dict, Any, Optional
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

class HaystackRAG:
    def __init__(self):
        self.document_store = None
        self.retrieval_pipeline = None
        self.collection_name = os.getenv('QDRANT_COLLECTION_NAME', 'chatbot_documents')
        self._initialize_components()

    def _initialize_components(self):
        """Initialize Haystack components and pipelines"""
        try:
            from haystack import Pipeline
            from haystack.components.embedders import SentenceTransformersDocumentEmbedder, SentenceTransformersTextEmbedder
            from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
            from haystack.components.writers import DocumentWriter
            from haystack_integrations.document_stores.qdrant import QdrantDocumentStore

            # Get configuration
            qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
            qdrant_api_key = os.getenv('QDRANT_API_KEY')

            # Initialize Qdrant document store
            try:
                if qdrant_api_key:
                    # Import Secret for API key
                    from haystack.utils.auth import Secret
                    self.document_store = QdrantDocumentStore(
                        url=qdrant_url,
                        api_key=Secret.from_token(qdrant_api_key),
                        index=self.collection_name,
                        embedding_dim=384,
                        recreate_index=False, 
                        return_embedding=True,
                        timeout=30
                    )
                else:
                    self.document_store = QdrantDocumentStore(
                        url=qdrant_url,
                        index=self.collection_name,
                        embedding_dim=384,
                        recreate_index=True,
                        return_embedding=True,
                        timeout=30
                    )
                logger.info("Qdrant document store initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Qdrant document store: {e}")
                raise

            # Create indexing pipeline
            self.indexing_pipeline = Pipeline()
            self.indexing_pipeline.add_component(
                "embedder",
                SentenceTransformersDocumentEmbedder(
                    model="sentence-transformers/all-MiniLM-L6-v2"
                )
            )
            self.indexing_pipeline.add_component(
                "writer",
                DocumentWriter(document_store=self.document_store)
            )
            self.indexing_pipeline.connect("embedder", "writer")

            # Create retrieval pipeline
            self.retrieval_pipeline = Pipeline()
            self.retrieval_pipeline.add_component(
                "embedder",
                SentenceTransformersTextEmbedder(
                    model="sentence-transformers/all-MiniLM-L6-v2"
                )
            )
            self.retrieval_pipeline.add_component(
                "retriever",
                QdrantEmbeddingRetriever(
                    document_store=self.document_store,
                    top_k=5
                )
            )
            self.retrieval_pipeline.connect("embedder", "retriever")

            logger.info("Haystack RAG components initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import required libraries: {e}")
            logger.error("Please install: pip install haystack-ai qdrant-haystack sentence-transformers")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to initialize Haystack components: {e}")
            sys.exit(1)

    def index_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Index documents
        """
        try:
            from haystack import Document

            # Convert documents to Haystack format
            haystack_docs = []
            for doc in documents:
                # Ensure content is a string and meta is a dict
                content = str(doc.get('content', ''))
                meta = doc.get('meta', {})
                if not isinstance(meta, dict):
                    meta = {}

                haystack_doc = Document(
                    content=content,
                    meta=meta
                )
                haystack_docs.append(haystack_doc)

            # Use the indexing pipeline to embed and store documents
            result = self.indexing_pipeline.run({"embedder": {"documents": haystack_docs}})

            logger.info(f"Successfully indexed {len(haystack_docs)} documents with embeddings")

            return {
                'success': True,
                'documents_indexed': len(documents),
                'message': f'Successfully indexed {len(documents)} documents with embeddings'
            }

        except Exception as e:
            logger.error(f"Error indexing documents: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }

    def retrieve_documents(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """
        Retrieve relevant documents
        """
        try:
            # Update retriever's top_k parameter
            self.retrieval_pipeline.get_component("retriever").top_k = top_k

            # Run retrieval pipeline
            result = self.retrieval_pipeline.run({
                "embedder": {"text": query}
            })

            # Format results
            retrieved_docs = []
            for doc in result["retriever"]["documents"]:
                retrieved_docs.append({
                    'content': doc.content,
                    'meta': doc.meta,
                    'score': doc.score if hasattr(doc, 'score') else 0.0
                })

            return {
                'success': True,
                'query': query,
                'documents': retrieved_docs,
                'count': len(retrieved_docs)
            }

        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }

    def search_similar(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Search for similar documents
        """
        return self.retrieve_documents(query, top_k)

    def get_document_count(self) -> Dict[str, Any]:
        """Get total number of documents in the collection"""
        try:
            # Get document count from document store
            count = self.document_store.count_documents()

            return {
                'success': True,
                'count': count,
                'collection_name': self.collection_name
            }

        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_documents(self, document_ids: List[str] = None) -> Dict[str, Any]:
        """
        Delete documents from the collection
        """
        try:
            if document_ids:
                # Delete specific documents
                self.document_store.delete_documents(document_ids)
                message = f"Deleted {len(document_ids)} documents"
            else:
                # Clear all documents
                self.document_store.delete_documents()
                message = "Cleared all documents from collection"

            logger.info(message)
            return {
                'success': True,
                'message': message
            }

        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python haystack_rag.py <command> [args...]',
            'commands': ['index', 'retrieve', 'search', 'count', 'delete']
        }))
        sys.exit(1)

    command = sys.argv[1]

    try:
        rag = HaystackRAG()

        if command == 'index':
            # index "document content" "meta_json"
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python haystack_rag.py index <content> [meta_json]'}))
                sys.exit(1)

            content = sys.argv[2]
            meta = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}

            documents = [{'content': content, 'meta': meta}]
            result = rag.index_documents(documents)
            print(json.dumps(result))

        elif command == 'retrieve':
            # retrieve "query" [top_k]
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python haystack_rag.py retrieve <query> [top_k]'}))
                sys.exit(1)

            query = sys.argv[2]
            top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5

            result = rag.retrieve_documents(query, top_k)
            print(json.dumps(result))

        elif command == 'search':
            # search "query" [top_k]
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python haystack_rag.py search <query> [top_k]'}))
                sys.exit(1)

            query = sys.argv[2]
            top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5

            result = rag.search_similar(query, top_k)
            print(json.dumps(result))

        elif command == 'count':
            result = rag.get_document_count()
            print(json.dumps(result))

        elif command == 'delete':
            if len(sys.argv) > 2:
                document_ids = sys.argv[2:]
                result = rag.delete_documents(document_ids)
            else:
                result = rag.delete_documents()  # Clear all
            print(json.dumps(result))

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))

    except Exception as e:
        logger.error(f"Error in main: {e}")
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()