import api from "./api";

/**
 * Chat API service
 */
export const chatService = {
   /**
    * Send a chat message and get AI response
    * @param {Object} messageData - The message data
    * @param {string} messageData.message - The user's message
    * @param {string} [messageData.sessionId] - Optional session ID
    * @param {string} [messageData.provider='gemini'] - AI provider (gemini, openai, deepseek)
    * @param {boolean} [messageData.useRag=true] - Whether to use RAG
    * @param {number} [messageData.topK=5] - Number of documents to retrieve
    * @returns {Promise<Object>} Response with AI message and metadata
    */
   async sendMessage(messageData) {
      try {
         // Validate message
         if (
            !messageData.message ||
            typeof messageData.message !== "string" ||
            messageData.message.trim().length === 0
         ) {
            throw new Error("Message cannot be empty");
         }
         const requestData = {
            message: messageData.message.trim(),
            provider: messageData.provider || "gemini",
            useRag: messageData.useRag !== undefined ? messageData.useRag : true,
            topK: messageData.topK || 5,
         };
         // Only include sessionId if it exists
         if (messageData.sessionId) {
            requestData.sessionId = messageData.sessionId;
         }

         const response = await api.post("/chat/message", requestData);
         console.log("Chat message sent:", requestData, "Response:", response.data);
         // Extract related questions from the response
         const relatedQuestions = response.data.relatedQuestions || [];
         console.log("Extracted related questions:", relatedQuestions);
         return {
            success: true,
            data: response.data,
            relatedQuestions: relatedQuestions,
         };
      } catch (error) {
         console.error("Error sending chat message:", error);
         return {
            success: false,
            error: error.response?.data?.message || error.message,
            relatedQuestions: [],
         };
      }
   },
   /**
    * Get chat history for a session
    * @param {string} sessionId - The session ID
    * @returns {Promise<Object>} Chat history data
    */
   async getChatHistory(sessionId) {
      try {
         const response = await api.get(`/chat/history/${sessionId}`);
         return {
            success: true,
            data: response.data,
         };
      } catch (error) {
         console.error("Error fetching chat history:", error);
         return {
            success: false,
            error: error.response?.data?.message || error.message,
         };
      }
   },

   /**
    * updated user reaction
    * @param {string} messageId, - The message Id
    */
   async updateReaction(messageId, reaction) {
      try {
         const res = await api.put(`/chat/userreaction/${messageId}`, { userReaction: reaction });

         return {
            success: true,
            data: res.data,
         };
      } catch (error) {
         console.error("Error updating reaction:", error);
         return {
            success: false,
            error: error.response?.data?.message || error.message,
         };
      }
   },

   /**
    * Create a new chat session
    * @returns {Promise<Object>} New session data
    */
   async createSession() {
      try {
         const response = await api.post("/chat/session");
         return {
            success: true,
            data: response.data,
         };
      } catch (error) {
         console.error("Error creating chat session:", error);
         return {
            success: false,
            error: error.response?.data?.message || error.message,
         };
      }
   },

   /**
    * Get conversation templates
    * @returns {Promise<Object>} Response with available templates
    */
   async getTemplates() {
      try {
         const response = await api.get("/chat/templates");
         return {
            success: true,
            data: response.data,
         };
      } catch (error) {
         console.error("Error fetching templates:", error);
         return {
            success: false,
            error: error.message,
         };
      }
   },
};

/**
 * Health check service
 */
export const healthService = {
   /**
    * Check API health status
    * @returns {Promise<Object>} Health status
    */
   async checkHealth() {
      try {
         const response = await api.get("/health");
         return {
            success: true,
            data: response.data,
         };
      } catch (error) {
         console.error("Health check failed:", error);
         return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: "unhealthy",
         };
      }
   },
};

export default {
   chat: chatService,
   health: healthService,
};
