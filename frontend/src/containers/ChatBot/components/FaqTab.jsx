import React from "react";
import { Collapse } from "antd";
import { FaqContainer, FaqItem } from "../ChatBotWidget.styles";
import { faqData } from "../chatBotData";

const { Panel } = Collapse;

const FaqTab = () => {
    return (
        <FaqContainer>
            <Collapse
                accordion
                expandIconPosition="right"
                className="faq-collapse"
            >
                {faqData.map((faq) => (
                    <Panel
                        header={faq.label}
                        key={faq.key}
                        className="faq-panel"
                    >
                        <FaqItem>
                            <div className="faq-answer">{faq.children}</div>
                        </FaqItem>
                    </Panel>
                ))}
            </Collapse>
        </FaqContainer>
    );
};

export default FaqTab;
