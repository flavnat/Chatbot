const JSLLMFactory = require("./js-llm-factory");
const JSRAG = require("./js-rag");
const RelatedQuestions = require("./related-questions");

class ConversationalChatbot {
   constructor() {
      this.llmFactory = null;
      this.ragPipeline = null;
      this.initialized = false;
      this.conversationHistory = new Map();
   }

   async initialize() {
      if (this.initialized) return;

      try {
         // Initialize LLM factory
         this.llmFactory = new JSLLMFactory();

         // Initialize RAG pipeline for when we need specific information
         this.ragPipeline = new JSRAG();
         await this.ragPipeline.initialize();

         this.initialized = true;
      } catch (error) {
         console.error("Failed to initialize Conversational Chatbot:", error);
         throw error;
      }
   }

   /**
    * Determine if a query needs RAG or can be handled conversationally
    */
   needsRAG(query) {
      const ragKeywords = [
         "how to",
         "how do i",
         "setup",
         "configure",
         "install",
         "create",
         "delete",
         "update",
         "manage",
         "feature",
         "functionality",
         "api",
         "documentation",
         "guide",
         "tutorial",
         "pricing",
         "cost",
         "billing",
         "payment",
         "support",
         "help",
         "troubleshoot",
         "error",
         "issue",
      ];

      const lowerQuery = query.toLowerCase();
      return ragKeywords.some((keyword) => lowerQuery.includes(keyword));
   }

   /**
    * Get conversation context for a session
    */
   getConversationContext(sessionId, limit = 5) {
      if (!this.conversationHistory.has(sessionId)) {
         return [];
      }

      const history = this.conversationHistory.get(sessionId);
      return history.slice(-limit); // Get last N messages
   }

   /**
    * Add message to conversation history
    */
   addToHistory(sessionId, role, message) {
      if (!this.conversationHistory.has(sessionId)) {
         this.conversationHistory.set(sessionId, []);
      }

      const history = this.conversationHistory.get(sessionId);
      history.push({
         role,
         message,
         timestamp: new Date(),
      });

      // Keep only last 20 messages to prevent memory issues
      if (history.length > 20) {
         history.shift();
      }
   }

   /**
    * Generate conversational response
    */
   async generateConversationalResponse(query, sessionId, provider = "gemini", options = {}) {
      if (!this.initialized) await this.initialize();

      try {
         // Get conversation context
         const context = this.getConversationContext(sessionId);
         const contextText = context
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.message}`)
            .join("\n");

         // Create conversational prompt
         const conversationalPrompt = `You are a helpful and friendly chatbot assistant for a platform called Linkbuilders. You should behave naturally and conversationally, like a helpful customer service representative.

Previous conversation:
${contextText}

Current user message: "${query}"

Guidelines:
- Be friendly, helpful, and conversational
- Don't start responses with "Based on the context" or similar formal language
- Ask follow-up questions when appropriate
- Show empathy and understanding
- Keep responses concise but helpful
- If the user asks about specific features or how-to questions, offer to provide more details
- Use natural language like "I'd be happy to help you with that!" or "That's a great question!"

Please respond naturally to the user's message:`;

         // Generate response using LLM
         const llmResult = await this.llmFactory.generateResponse(provider, conversationalPrompt, options);

         // Add to conversation history
         this.addToHistory(sessionId, "user", query);
         this.addToHistory(sessionId, "assistant", llmResult.response);

         return {
            response: llmResult.response,
            provider: llmResult.provider,
            model: llmResult.model,
            usage: llmResult.usage,
            conversational: true,
            sessionId: sessionId,
            query: query,
         };
      } catch (error) {
         console.error("Error generating conversational response:", error);
         return {
            error: error.message,
            query: query,
            provider: provider,
            conversational: true,
         };
      }
   }

   /**
    * Generate RAG-enhanced response for specific queries
    */
   async generateRAGResponse(query, sessionId, provider = "gemini", topK = 3, options = {}) {
      if (!this.initialized) await this.initialize();

      try {
         // Retrieve relevant documents
         const retrievalResult = await this.ragPipeline.retrieveDocuments(query, topK);
         let contextText = "";
         let contextDocs = [];

         if (retrievalResult.success) {
            contextDocs = retrievalResult.documents;
            const contextTexts = contextDocs.filter((doc) => doc.content).map((doc) => doc.content);
            contextText = contextTexts.join("\n\n");
         }

         // Get conversation context
         const conversationContext = this.getConversationContext(sessionId);
         const conversationText = conversationContext
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.message}`)
            .join("\n");

         // Create RAG prompt that's more conversational
         let enhancedPrompt;
         if (contextText) {
            enhancedPrompt = `You are a helpful chatbot assistant for Linkbuilders platform. The user is asking about something specific, and I have some relevant information to help answer their question.

Previous conversation:
${conversationText}

Relevant information from our knowledge base:
${contextText}

User's question: "${query}"

Please provide a helpful, conversational response that:
- Uses the provided information to answer accurately
- Maintains a friendly, helpful tone
- Doesn't start with "Based on the context" - just answer naturally
- If the information isn't sufficient, use your general knowledge but make sure to disclose that it's a general knowledge answer rather not specific to our company (linkbuilders)
- Keep the response focused and helpful

Response:`;
         } else {
            // Fallback to conversational response if no relevant docs
            return this.generateConversationalResponse(query, sessionId, provider, options);
         }

         // Generate response using LLM
         const llmResult = await this.llmFactory.generateResponse(provider, enhancedPrompt, options);

         // GET RELATED QUESTIONS FOR FOLLOW-UP SUGGESTIONS
         const relatedQuestionsResult = await this.getRelatedQuestions(query, 20);
         const relatedQuestions = relatedQuestionsResult.relatedQuestions || [];

         // Add to conversation history
         this.addToHistory(sessionId, "user", query);
         this.addToHistory(sessionId, "assistant", llmResult.response);

         return {
            response: llmResult.response,
            provider: llmResult.provider,
            model: llmResult.model,
            usage: llmResult.usage,
            ragUsed: true,
            contextDocuments: contextDocs.length,
            sessionId: sessionId,
            query: query,
            retrievedDocuments: contextDocs,
            relatedQuestions: relatedQuestions,
         };
      } catch (error) {
         console.error("Error generating RAG response:", error);
         // Fallback to conversational response on error
         return this.generateConversationalResponse(query, sessionId, provider, options);
      }
   }

   /**
    * Main method to generate response - automatically chooses between conversational and RAG
    */
   async generateResponse(
      query,
      sessionId,
      provider = "gemini",
      useRag = null, // null = auto-detect, true = force RAG, false = force conversational
      topK = 3,
      options = {}
   ) {
      if (!this.initialized) await this.initialize();

      try {
         // Auto-detect if RAG is needed, unless explicitly specified
         const shouldUseRAG = useRag === null ? this.needsRAG(query) : useRag;

         if (shouldUseRAG) {
            return await this.generateRAGResponse(query, sessionId, provider, topK, options);
         } else {
            return await this.generateConversationalResponse(query, sessionId, provider, options);
         }
      } catch (error) {
         console.error("Error in generateResponse:", error);
         return {
            error: error.message,
            query: query,
            provider: provider,
            sessionId: sessionId,
         };
      }
   }

   /**
    * Get related questions for follow-up
    */
   async getRelatedQuestions(query, topK = 20) {
      if (!this.initialized) await this.initialize();

      try {
         const relatedQuestionsService = new RelatedQuestions();
         await relatedQuestionsService.initialize();
         return await relatedQuestionsService.getRelatedQuestions(query, topK);
      } catch (error) {
         console.error("Error getting related questions:", error);
         return { success: false, error: error.message, relatedQuestions: [] };
      }
   }

   /**
    * Clear conversation history for a session
    */
   clearHistory(sessionId) {
      this.conversationHistory.delete(sessionId);
   }

   /**
    * Get conversation statistics
    */
   getConversationStats(sessionId) {
      if (!this.conversationHistory.has(sessionId)) {
         return { messageCount: 0, lastActivity: null };
      }

      const history = this.conversationHistory.get(sessionId);
      return {
         messageCount: history.length,
         lastActivity: history.length > 0 ? history[history.length - 1].timestamp : null,
      };
   }

   /**
    * Get available providers
    */
   getAvailableProviders() {
      if (!this.initialized) return {};
      return this.llmFactory.getAvailableProviders();
   }
}

module.exports = ConversationalChatbot;
