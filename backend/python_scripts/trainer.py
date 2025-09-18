#!/usr/bin/env python3
"""
Trainer Module
Loads linkbuilders.json data and indexes it into the vector database
"""

import os
import json
import sys
import logging
from typing import List, Dict, Any

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

def load_linkbuilders_data() -> List[Dict[str, Any]]:
    """Load data from linkbuilders.json file"""
    try:
        linkbuilders_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'linkbuilders.json')

        with open(linkbuilders_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        logger.info(f"Loaded {len(data)} items from linkbuilders.json")
        return data

    except FileNotFoundError:
        logger.error("linkbuilders.json file not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing linkbuilders.json: {e}")
        sys.exit(1)

def prepare_documents_for_indexing(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Prepare documents for indexing in the vector database"""
    documents = []

    for item in data:
        # Create a comprehensive content string
        content = f"Question: {item.get('question', '')}\nAnswer: {item.get('answer', '')}"

        # Prepare metadata
        meta = {
            'source': 'linkbuilders',
            'category': item.get('category', 'general'),
            'question': item.get('question', ''),
            'id': item.get('id', ''),
            'type': 'qa_pair'
        }

        documents.append({
            'content': content,
            'meta': meta
        })

    logger.info(f"Prepared {len(documents)} documents for indexing")
    return documents

def index_documents_with_haystack(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Index documents using Haystack RAG"""
    try:
        from haystack_rag import HaystackRAG

        # Initialize Haystack RAG
        rag = HaystackRAG()

        # Index documents
        logger.info(f"Indexing {len(documents)} documents with Haystack...")
        result = rag.index_documents(documents)

        return result

    except Exception as e:
        logger.error(f"Error indexing documents with Haystack: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main function to load and index linkbuilders data"""
    logger.info("Starting linkbuilders data indexing process...")

    try:
        # Load data from linkbuilders.json
        data = load_linkbuilders_data()

        # Prepare documents for indexing
        documents = prepare_documents_for_indexing(data)

        # Index documents using Haystack RAG
        result = index_documents_with_haystack(documents)

        if result['success']:
            logger.info(f"✅ Successfully indexed {result.get('documents_indexed', 0)} documents")
            print(json.dumps({
                'success': True,
                'message': f'Successfully indexed {result.get("documents_indexed", 0)} documents from linkbuilders.json',
                'documents_indexed': result.get('documents_indexed', 0)
            }))
        else:
            logger.error(f"❌ Failed to index documents: {result.get('error', 'Unknown error')}")
            print(json.dumps({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }))
            sys.exit(1)

    except Exception as e:
        logger.error(f"❌ Error in main process: {e}")
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()

