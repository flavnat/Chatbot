// containers/ChatBot/components/SuggestedQuestions.jsx
import React from "react";
import { SuggestedQuestionsContainer, SuggestedQuestionsGrid, SuggestedQuestionItem } from "../ChatBotWidget.styles";

const SuggestedQuestions = ({
   questions,
   limitReached,
   onQuestionClick,
   relatedQuestions = null,
   isFirst, // ✅ Add this prop
}) => {
   if (!questions || questions.length === 0 || limitReached) {
      return null;
   }

   console.log("relatedQuestions in SuggestedQuestions.jsx", relatedQuestions);
   console.log("isFirst in SuggestedQuestions.jsx", isFirst);

   // ✅ Use related questions if provided and not first visit, otherwise use regular questions
   const displayQuestions =
      !isFirst && relatedQuestions && relatedQuestions.length > 0
         ? relatedQuestions.map((q) =>
              q.question?.startsWith("Question: ")
                 ? q.question.replace("Question: ", "").split("\n")[0].trim()
                 : q.question || q
           )
         : questions;

   // ✅ Determine if we're showing related questions (not first visit and has related questions)
   const showingRelated = !isFirst && relatedQuestions && relatedQuestions.length > 0;

   console.log("displayQuestions:", displayQuestions);
   console.log("showingRelated:", showingRelated);

   return (
      <SuggestedQuestionsContainer>
         <SuggestedQuestionsGrid
            style={{
               // ✅ 2-column layout for related questions (not first visit), 1-column for initial
               gridTemplateColumns: showingRelated ? "1fr 1fr" : "1fr",
               gap: "8px",
            }}
         >
            {displayQuestions.map((question, index) => (
               <SuggestedQuestionItem key={index} onClick={() => onQuestionClick(question)}>
                  {question}
               </SuggestedQuestionItem>
            ))}
         </SuggestedQuestionsGrid>
      </SuggestedQuestionsContainer>
   );
};

export default SuggestedQuestions;
