#!/usr/bin/env python3
"""
Haystack RAG Pipeline Module
Handles document indexing and retrieval using Haystack
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
        self.qdrant_client = None
        self.embedding_model = None
        self.collection_name = os.getenv('QDRANT_COLLECTION_NAME', 'chatbot_documents')
        self._initialize_components()

    def _initialize_components(self):
        """Initialize Qdrant client and embedding model"""
        try:
            from qdrant_client import QdrantClient
            from sentence_transformers import SentenceTransformer

            # Get configuration
            qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
            qdrant_api_key = os.getenv('QDRANT_API_KEY')

            # Initialize Qdrant client
            if qdrant_api_key:
                self.qdrant_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
            else:
                self.qdrant_client = QdrantClient(url=qdrant_url)

            # Initialize embedding model
            self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

            logger.info("Qdrant RAG components initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import required libraries: {e}")
            logger.error("Please install: pip install qdrant-client sentence-transformers")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to initialize components: {e}")
            sys.exit(1)

            # Create indexing pipeline
            self.indexing_pipeline = Pipeline()
            self.indexing_pipeline.add_component("embedder", SentenceTransformersDocumentEmbedder(
                model="sentence-transformers/all-MiniLM-L6-v2"
            ))
            self.indexing_pipeline.add_component("writer", DocumentWriter(
                document_store=self.document_store
            ))
            self.indexing_pipeline.connect("embedder", "writer")

            # Create retrieval pipeline
            self.retrieval_pipeline = Pipeline()
            self.retrieval_pipeline.add_component("embedder", SentenceTransformersTextEmbedder(
                model="sentence-transformers/all-MiniLM-L6-v2"
            ))
            self.retrieval_pipeline.add_component("retriever", QdrantEmbeddingRetriever(
                document_store=self.document_store
            ))
            self.retrieval_pipeline.connect("embedder", "retriever")

            logger.info("Haystack RAG pipeline initialized successfully")

        except ImportError as e:
            logger.error(f"Failed to import required libraries: {e}")
            logger.error("Please install: pip install haystack-ai qdrant-haystack sentence-transformers")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Failed to initialize pipeline: {e}")
            sys.exit(1)

    def index_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Index documents into the vector database using direct Qdrant client
        """
        try:
            from qdrant_client.models import PointStruct

            # Prepare points for indexing
            points = []
            for i, doc in enumerate(documents):
                # Generate embedding
                embedding = self.embedding_model.encode(doc['content']).tolist()

                # Create point using PointStruct
                point = PointStruct(
                    id=i + 1,  # Use integer ID starting from 1
                    vector=embedding,
                    payload={
                        'content': doc['content'],
                        'meta': doc['meta']
                    }
                )
                points.append(point)

            # Upload points to Qdrant in batches
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i:i + batch_size]
                self.qdrant_client.upload_points(
                    collection_name=self.collection_name,
                    points=batch
                )
                logger.info(f"Uploaded batch {i//batch_size + 1} with {len(batch)} points")

            logger.info(f"Successfully uploaded {len(points)} points to Qdrant")

            return {
                'success': True,
                'documents_indexed': len(documents),
                'message': f'Successfully indexed {len(documents)} documents'
            }

        except Exception as e:
            logger.error(f"Error indexing documents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def retrieve_documents(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Retrieve relevant documents for a query using direct Qdrant search
        """
        try:
            # Generate embedding for the query
            query_embedding = self.embedding_model.encode(query).tolist()

            # Search for similar documents
            search_result = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k
            )

            # Format results
            retrieved_docs = []
            for hit in search_result:
                retrieved_docs.append({
                    'content': hit.payload.get('content', ''),
                    'meta': hit.payload.get('meta', {}),
                    'score': hit.score
                })

            return {
                'success': True,
                'query': query,
                'documents': retrieved_docs,
                'count': len(retrieved_docs)
            }

        except Exception as e:
            logger.error(f"Error retrieving documents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def search_similar(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Search for similar documents using semantic similarity
        """
        try:
            # Generate embedding for the query
            query_embedding = self.embedding_model.encode(query).tolist()

            # Search for similar documents
            search_result = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k
            )

            # Format results
            similar_docs = []
            for hit in search_result:
                similar_docs.append({
                    'content': hit.payload.get('content', ''),
                    'meta': hit.payload.get('meta', {}),
                    'score': hit.score
                })

            return {
                'success': True,
                'query': query,
                'documents': similar_docs,
                'count': len(similar_docs)
            }

        except Exception as e:
            logger.error(f"Error searching similar documents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_document_count(self) -> Dict[str, Any]:
        """Get total number of documents in the collection"""
        try:
            # Get collection info
            collection_info = self.qdrant_client.get_collection(self.collection_name)

            return {
                'success': True,
                'count': collection_info.points_count,
                'collection_name': self.collection_name
            }

        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return {
                'success': False,
                'error': str(e)
            }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python haystack_rag.py <command> [args...]',
            'commands': ['index', 'retrieve', 'search', 'count']
        }))
        sys.exit(1)

    command = sys.argv[1]

    try:
        rag = HaystackRAG()

        if command == 'index':
            # python haystack_rag.py index "document content" "meta_json"
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python haystack_rag.py index <content> [meta_json]'}))
                sys.exit(1)

            content = sys.argv[2]
            meta = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}

            documents = [{'content': content, 'meta': meta}]
            result = rag.index_documents(documents)
            print(json.dumps(result))

        elif command == 'retrieve':
            # python haystack_rag.py retrieve "query" [top_k]
            if len(sys.argv) < 3:
                print(json.dumps({'error': 'Usage: python haystack_rag.py retrieve <query> [top_k]'}))
                sys.exit(1)

            query = sys.argv[2]
            top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 5

            result = rag.retrieve_documents(query, top_k)
            print(json.dumps(result))

        elif command == 'search':
            # python haystack_rag.py search "query" [top_k]
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

        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))

    except Exception as e:
        logger.error(f"Error in main: {e}")
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()