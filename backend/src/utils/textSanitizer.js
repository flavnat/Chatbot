/**
 * Text sanitization utilities
 */

/**
 * Sanitizes markdown formatting from text for vector database storage
 * Removes common markdown elements while preserving the content
 * @param {string} text - The text to sanitize
 * @returns {string} - The sanitized text
 */
function sanitizeMarkdown(text) {
    if (!text || typeof text !== "string") {
        return text;
    }

    let sanitized = text;

    // Remove bold/italic markers
    sanitized = sanitized.replace(/\*\*\*(.*?)\*\*\*/g, "$1"); // ***bold italic***
    sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, "$1"); // **bold**
    sanitized = sanitized.replace(/\*(.*?)\*/g, "$1"); // *italic*

    // Remove underline markers
    sanitized = sanitized.replace(/__(.*?)__/g, "$1"); // __underline__
    sanitized = sanitized.replace(/_(.*?)_/g, "$1"); // _underline_

    // Remove strikethrough
    sanitized = sanitized.replace(/~~(.*?)~~/g, "$1"); // ~~strikethrough~~

    // Remove code blocks (both inline and multi-line)
    sanitized = sanitized.replace(/```[\s\S]*?```/g, ""); // ```code blocks```
    sanitized = sanitized.replace(/`(.*?)`/g, "$1"); // `inline code`

    // Remove headers
    sanitized = sanitized.replace(/^#{1,6}\s+/gm, ""); // # ## ### headers

    // Remove links but keep the text
    sanitized = sanitized.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // [text](url)

    // Remove images
    sanitized = sanitized.replace(/!\[([^\]]*)\]\([^\)]+\)/g, ""); // ![alt](url)

    // Remove blockquotes
    sanitized = sanitized.replace(/^>\s+/gm, ""); // > blockquotes

    // Remove horizontal rules
    sanitized = sanitized.replace(/^[-*_]{3,}$/gm, ""); // --- or *** or ___

    // Remove list markers
    sanitized = sanitized.replace(/^[\s]*[-\*\+]\s+/gm, ""); // - * + list items
    sanitized = sanitized.replace(/^[\s]*\d+\.\s+/gm, ""); // 1. 2. numbered lists

    // Remove extra whitespace and normalize
    sanitized = sanitized.replace(/\n{3,}/g, "\n\n"); // Multiple newlines
    sanitized = sanitized.trim();

    return sanitized;
}

/**
 * Sanitizes text for general use, removing potentially problematic characters
 * @param {string} text - The text to sanitize
 * @returns {string} - The sanitized text
 */
function sanitizeText(text) {
    if (!text || typeof text !== "string") {
        return text;
    }

    let sanitized = text;

    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
}

/**
 * Comprehensive text sanitization for vector database storage
 * Combines markdown sanitization with general text cleaning
 * @param {string} text - The text to sanitize
 * @returns {string} - The fully sanitized text
 */
function sanitizeForVectorDB(text) {
    return sanitizeText(sanitizeMarkdown(text));
}

module.exports = {
    sanitizeMarkdown,
    sanitizeText,
    sanitizeForVectorDB,
};
