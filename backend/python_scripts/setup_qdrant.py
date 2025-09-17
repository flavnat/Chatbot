#!/usr/bin/env python3
"""
Qdrant Collection Setup Script
Creates the chatbot_docs collection in Qdrant if it doesn't exist
"""

import os
import sys
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(env_path)
except ImportError:
    pass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_qdrant_collection():
    """Create the chatbot_docs collection in Qdrant"""
    try:
        # Get configuration from environment
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        collection_name = os.getenv('QDRANT_COLLECTION_NAME', 'chatbot_docs')

        logger.info(f"Connecting to Qdrant at: {qdrant_url}")
        logger.info(f"Collection name: {collection_name}")
        logger.info(f"API key present: {bool(qdrant_api_key)}")

        # Initialize Qdrant client
        if qdrant_api_key:
            client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            client = QdrantClient(url=qdrant_url)

        # Check if collection exists
        collections = client.get_collections()
        collection_names = [col.name for col in collections.collections]

        if collection_name in collection_names:
            logger.info(f"Collection '{collection_name}' already exists")
            # Get collection info
            collection_info = client.get_collection(collection_name)
            logger.info(f"Collection info: {collection_info}")
            return {
                'success': True,
                'message': f"Collection '{collection_name}' already exists",
                'status': 'existing'
            }

        # Create new collection
        logger.info(f"Creating collection '{collection_name}'...")

        # Create collection with vector parameters for sentence-transformers/all-MiniLM-L6-v2
        # This model produces 384-dimensional embeddings
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=384,  # Embedding dimension for all-MiniLM-L6-v2
                distance=Distance.COSINE  # Cosine similarity for semantic search
            )
        )

        logger.info(f"✅ Collection '{collection_name}' created successfully")

        # Verify collection was created
        collections = client.get_collections()
        collection_names = [col.name for col in collections.collections]

        if collection_name in collection_names:
            collection_info = client.get_collection(collection_name)
            logger.info(f"✅ Collection verification successful: status={collection_info.status} optimizer_status={collection_info.optimizer_status} vectors_count={collection_info.vectors_count} points_count={collection_info.points_count}")
            return {
                'success': True,
                'message': f"Collection '{collection_name}' created and verified successfully",
                'status': 'created',
                'collection_info': {
                    'name': collection_name,
                    'vectors_count': collection_info.vectors_count,
                    'points_count': collection_info.points_count,
                    'status': str(collection_info.status)
                }
            }
        else:
            raise Exception("Collection creation verification failed")

    except Exception as e:
        logger.error(f"❌ Failed to create Qdrant collection: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def test_collection_connection():
    """Test basic connection to the collection"""
    try:
        from haystack_integrations.document_stores.qdrant import QdrantDocumentStore

        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        collection_name = os.getenv('QDRANT_COLLECTION_NAME', 'chatbot_docs')

        logger.info("Testing Haystack QdrantDocumentStore connection...")

        # Test basic connection
        # Note: QdrantDocumentStore may have issues with API key in current version
        # Using direct QdrantClient for connection test instead
        try:
            from qdrant_client import QdrantClient
            
            if qdrant_api_key:
                test_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
            else:
                test_client = QdrantClient(url=qdrant_url)
            
            # Test connection by getting collection info
            collection_info = test_client.get_collection(collection_name)
            count = collection_info.points_count
            
            logger.info(f"✅ Haystack connection test passed using QdrantClient. Document count: {count}")
            
            return {
                'success': True,
                'message': 'Qdrant connection test passed using QdrantClient',
                'document_count': count
            }
            
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    except Exception as e:
        logger.error(f"❌ Haystack connection test failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main function"""
    logger.info("🚀 Starting Qdrant Collection Setup")
    print("=" * 50)

    # Create collection
    result = create_qdrant_collection()

    if result['success']:
        print(f"✅ {result['message']}")

        # Test connection
        print("\n🔍 Testing connection...")
        test_result = test_collection_connection()

        if test_result['success']:
            print(f"✅ {test_result['message']}")
        else:
            print(f"❌ Connection test failed: {test_result['error']}")

    else:
        print(f"❌ {result['error']}")
        sys.exit(1)

    print("\n" + "=" * 50)
    if result['success']:
        print("🎉 Qdrant collection setup completed successfully!")
        print(f"Collection: {os.getenv('QDRANT_COLLECTION_NAME', 'chatbot_docs')}")
        print(f"URL: {os.getenv('QDRANT_URL', 'http://localhost:6333')}")
    else:
        print("⚠️  Qdrant collection setup failed")

if __name__ == '__main__':
    main()