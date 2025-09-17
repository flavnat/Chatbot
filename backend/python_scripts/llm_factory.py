#!/usr/bin/env python3
"""
LLM Factory Module
Handles different LLM providers (Google Gemini, OpenAI GPT, DeepSeek)
"""

import os
import json
import sys
from typing import Dict, Any, Optional
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

class LLMFactory:
    def __init__(self):
        self.providers = {}
        self._load_providers()

    def _load_providers(self):
        """Load available LLM providers"""
        try:
            # Debug: Print environment variables (remove in production)
            logger.info(f"GOOGLE_API_KEY present: {bool(os.getenv('GOOGLE_API_KEY'))}")
            logger.info(f"OPENAI_API_KEY present: {bool(os.getenv('OPENAI_API_KEY'))}")
            logger.info(f"DEEPSEEK_API_KEY present: {bool(os.getenv('DEEPSEEK_API_KEY'))}")

            # Google Gemini
            google_key = os.getenv('GOOGLE_API_KEY')
            if google_key and google_key.strip():
                try:
                    from google import genai
                    self.providers['gemini'] = {
                        'client': genai.Client(api_key=google_key.strip()),
                        'available': True
                    }
                    logger.info("Google Gemini provider loaded successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize Google Gemini: {e}")
                    self.providers['gemini'] = {'available': False}
            else:
                logger.warning("GOOGLE_API_KEY not found or empty")
                self.providers['gemini'] = {'available': False}

            # OpenAI GPT
            openai_key = os.getenv('OPENAI_API_KEY')
            if openai_key and openai_key.strip():
                try:
                    from openai import OpenAI
                    self.providers['openai'] = {
                        'client': OpenAI(api_key=openai_key.strip()),
                        'available': True
                    }
                    logger.info("OpenAI provider loaded successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize OpenAI: {e}")
                    self.providers['openai'] = {'available': False}
            else:
                logger.warning("OPENAI_API_KEY not found or empty")
                self.providers['openai'] = {'available': False}

            # DeepSeek
            deepseek_key = os.getenv('DEEPSEEK_API_KEY')
            if deepseek_key and deepseek_key.strip():
                try:
                    from openai import OpenAI
                    self.providers['deepseek'] = {
                        'client': OpenAI(
                            api_key=deepseek_key.strip(),
                            base_url="https://api.deepseek.com"
                        ),
                        'available': True
                    }
                    logger.info("DeepSeek provider loaded successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize DeepSeek: {e}")
                    self.providers['deepseek'] = {'available': False}
            else:
                logger.warning("DEEPSEEK_API_KEY not found or empty")
                self.providers['deepseek'] = {'available': False}

        except ImportError as e:
            logger.error(f"Failed to import required libraries: {e}")
            sys.exit(1)

    def get_available_providers(self) -> Dict[str, bool]:
        """Get list of available providers"""
        return {provider: info['available'] for provider, info in self.providers.items()}

    def generate_response(self, provider: str, prompt: str, **kwargs) -> Dict[str, Any]:
        """
        Generate response using specified provider
        """
        if provider not in self.providers:
            raise ValueError(f"Unknown provider: {provider}")

        if not self.providers[provider]['available']:
            raise ValueError(f"Provider {provider} is not available")

        try:
            if provider == 'gemini':
                return self._generate_gemini(prompt, **kwargs)
            elif provider == 'openai':
                return self._generate_openai(prompt, **kwargs)
            elif provider == 'deepseek':
                return self._generate_deepseek(prompt, **kwargs)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
        except Exception as e:
            logger.error(f"Error generating response with {provider}: {e}")
            raise

    def _generate_gemini(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using Google Gemini"""
        client = self.providers['gemini']['client']

        model = kwargs.get('model', 'gemini-2.0-flash')
        max_tokens = kwargs.get('max_tokens', 1000)
        temperature = kwargs.get('temperature', 0.7)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                'max_output_tokens': max_tokens,
                'temperature': temperature
            }
        )

        return {
            'response': response.text,
            'model': model,
            'provider': 'gemini',
            'usage': {
                'input_tokens': response.usage_metadata.prompt_token_count,
                'output_tokens': response.usage_metadata.candidates_token_count,
                'total_tokens': response.usage_metadata.total_token_count
            }
        }

    def _generate_openai(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using OpenAI GPT"""
        client = self.providers['openai']['client']

        model = kwargs.get('model', 'gpt-3.5-turbo')
        max_tokens = kwargs.get('max_tokens', 1000)
        temperature = kwargs.get('temperature', 0.7)

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature
        )

        return {
            'response': response.choices[0].message.content,
            'model': model,
            'provider': 'openai',
            'usage': {
                'input_tokens': response.usage.prompt_tokens,
                'output_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }

    def _generate_deepseek(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using DeepSeek"""
        client = self.providers['deepseek']['client']

        model = kwargs.get('model', 'deepseek-chat')
        max_tokens = kwargs.get('max_tokens', 1000)
        temperature = kwargs.get('temperature', 0.7)

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature
        )

        return {
            'response': response.choices[0].message.content,
            'model': model,
            'provider': 'deepseek',
            'usage': {
                'input_tokens': response.usage.prompt_tokens,
                'output_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python llm_factory.py <provider> <prompt> [model] [max_tokens] [temperature]'
        }))
        sys.exit(1)

    provider = sys.argv[1]
    prompt = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 else None
    max_tokens = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
    temperature = float(sys.argv[5]) if len(sys.argv) > 5 else 0.7

    try:
        factory = LLMFactory()

        # Check if provider is available
        available_providers = factory.get_available_providers()
        if not available_providers.get(provider, False):
            print(json.dumps({
                'error': f'Provider {provider} is not available',
                'available_providers': available_providers
            }))
            sys.exit(1)

        # Generate response
        kwargs = {'max_tokens': max_tokens, 'temperature': temperature}
        if model:
            kwargs['model'] = model

        result = factory.generate_response(provider, prompt, **kwargs)
        print(json.dumps(result))

    except Exception as e:
        logger.error(f"Error in main: {e}")
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()