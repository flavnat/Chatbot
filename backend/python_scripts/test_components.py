#!/usr/bin/env python3
"""
Test script to verify Python components are working correctly
"""

import sys
import os
import json
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

def test_llm_factory():
    """Test LLM factory functionality"""
    print("🔍 Testing LLM Factory...")

    try:
        from llm_factory import LLMFactory

        factory = LLMFactory()
        providers = factory.get_available_providers()

        print(f"✅ Available providers: {providers}")

        # Test with a simple prompt if providers are available
        for provider, available in providers.items():
            if available:
                try:
                    result = factory.generate_response(provider, "Hello, this is a test message", max_tokens=50)
                    print(f"✅ {provider} test successful: {result['response'][:50]}...")
                    break
                except Exception as e:
                    print(f"❌ {provider} test failed: {e}")
                    return False

        return True

    except Exception as e:
        print(f"❌ LLM Factory test failed: {e}")
        return False

def test_haystack_rag():
    """Test Haystack RAG functionality"""
    print("🔍 Testing Haystack RAG...")

    try:
        from haystack_rag import HaystackRAG

        rag = HaystackRAG()

        # Test document indexing (skip if already exists)
        test_docs = [
            {
                'content': 'Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.',
                'meta': {'source': 'test', 'topic': 'AI'}
            }
        ]

        index_result = rag.index_documents(test_docs)
        if not index_result['success']:
            # Check if it's a duplicate error (which is expected)
            error_msg = str(index_result.get('error', ''))
            if 'already exists' in error_msg or 'DuplicateDocumentError' in error_msg:
                print("✅ Document indexing skipped (document already exists)")
            else:
                print(f"❌ Document indexing failed: {error_msg}")
                return False
        else:
            print("✅ Document indexing successful")

        # Test document retrieval
        retrieve_result = rag.retrieve_documents("What is machine learning?", top_k=1)
        if not retrieve_result['success']:
            print(f"❌ Document retrieval failed: {retrieve_result.get('error', 'Unknown error')}")
            return False

        print(f"✅ Document retrieval successful: {len(retrieve_result['documents'])} documents found")

        # Test document count
        count_result = rag.get_document_count()
        if not count_result['success']:
            print(f"❌ Document count failed: {count_result.get('error', 'Unknown error')}")
            return False

        print(f"✅ Document count: {count_result['count']}")

        return True

    except Exception as e:
        print(f"❌ Haystack RAG test failed: {e}")
        return False

def test_rag_chatbot():
    """Test RAG Chatbot functionality"""
    print("🔍 Testing RAG Chatbot...")

    try:
        from rag_chatbot import RAGChatbot

        chatbot = RAGChatbot()

        # Test stats
        stats = chatbot.get_stats()
        if not stats['success']:
            print(f"❌ Chatbot stats failed: {stats.get('error', 'Unknown error')}")
            return False

        print(f"✅ Chatbot stats: {stats}")

        # Test response generation (without RAG for speed)
        response = chatbot.generate_response(
            "What is AI?",
            provider="gemini",
            use_rag=False,
            max_tokens=100
        )

        if 'error' in response:
            print(f"❌ Response generation failed: {response['error']}")
            return False

        print(f"✅ Response generation successful: {response['response'][:100]}...")

        return True

    except Exception as e:
        print(f"❌ RAG Chatbot test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Python Components Test Suite")
    print("=" * 50)

    tests = [
        ("LLM Factory", test_llm_factory),
        ("Haystack RAG", test_haystack_rag),
        ("RAG Chatbot", test_rag_chatbot)
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")

    all_passed = True
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
        if not result:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Python components are ready.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check your configuration and dependencies.")
        sys.exit(1)

if __name__ == '__main__':
    main()