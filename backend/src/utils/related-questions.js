const JSRAG = require("./js-rag");

class RelatedQuestions {
   constructor() {
      this.ragPipeline = null;
      this.initialized = false;
   }

   async initialize() {
      if (this.initialized) return;

      try {
         // Use the existing JSRAG instance
         this.ragPipeline = new JSRAG();
         await this.ragPipeline.initialize();

         this.initialized = true;
      } catch (error) {
         console.error("Failed to initialize Related Questions service:", error);
         throw error;
      }
   }

   /**
    * Search for related questions without the main query match
    */
   async getRelatedQuestions(query, topK = 6) {
      if (!this.initialized) await this.initialize();

      try {
         // Using the existing RAG pipeline to search
         const searchResult = await this.ragPipeline.client.search(this.ragPipeline.collectionName, {
            vector: await this.ragPipeline.generateEmbedding(query),
            limit: topK,
            with_payload: true,
            with_vector: false,
         });

         // using position-based filtering first
         const SKIP_COUNT = 8;
         const TAKE_COUNT = 10;

         const initialResults = searchResult.slice(SKIP_COUNT, SKIP_COUNT + TAKE_COUNT).map((hit) => ({
            question: hit.payload.content || hit.payload.question || "",
            score: hit.score,
            answer: hit.payload.answer || hit.payload.content || "",
            meta: hit.payload.meta || {},
         }));

         // Remove duplicates based on question content (deduplication)
         const seenQuestions = new Set();
         const uniqueResults = [];

         for (const result of initialResults) {
            // Create a clean version of the question for comparison
            const cleanQuestion = result.question.toLowerCase().replace(/\s+/g, " ").trim();

            if (!seenQuestions.has(cleanQuestion)) {
               seenQuestions.add(cleanQuestion);
               uniqueResults.push(result);
            }
         }

         // Take only the first 6 unique results
         const finalResults = uniqueResults.slice(0, 4);
         return {
            success: true,
            query: query,
            relatedQuestions: finalResults,
            allResults: searchResult,
         };
      } catch (error) {
         console.error("Error searching for related questions:", error);
         return {
            success: false,
            error: error.message,
         };
      }
   }
}

module.exports = RelatedQuestions;
