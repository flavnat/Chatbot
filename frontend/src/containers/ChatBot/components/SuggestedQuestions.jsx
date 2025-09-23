import React from "react";
import {
    SuggestedQuestionsContainer,
    SuggestedQuestionsGrid,
    SuggestedQuestionItem,
} from "../ChatBotWidget.styles";

const SuggestedQuestions = ({ questions, limitReached, onQuestionClick }) => {
    if (!questions || questions.length === 0 || limitReached) {
        return null;
    }

    return (
        <SuggestedQuestionsContainer>
            <SuggestedQuestionsGrid>
                {questions.map((question, index) => (
                    <SuggestedQuestionItem
                        key={index}
                        onClick={() => onQuestionClick(question)}
                    >
                        {question}
                    </SuggestedQuestionItem>
                ))}
            </SuggestedQuestionsGrid>
        </SuggestedQuestionsContainer>
    );
};

export default SuggestedQuestions;
