const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

class JSLLMFactory {
    constructor() {
        this.providers = {};
        this._loadProviders();
    }

    _loadProviders() {
        try {
            console.log(
                "GOOGLE_API_KEY present:",
                !!process.env.GOOGLE_API_KEY
            );
            console.log(
                "OPENAI_API_KEY present:",
                !!process.env.OPENAI_API_KEY
            );
            console.log(
                "DEEPSEEK_API_KEY present:",
                !!process.env.DEEPSEEK_API_KEY
            );

            // Google Gemini
            const googleKey = process.env.GOOGLE_API_KEY;
            if (googleKey && googleKey.trim()) {
                try {
                    this.providers["gemini"] = {
                        client: new GoogleGenerativeAI(googleKey.trim()),
                        available: true,
                    };
                    console.log("Google Gemini provider loaded successfully");
                } catch (error) {
                    console.error("Failed to initialize Google Gemini:", error);
                    this.providers["gemini"] = { available: false };
                }
            } else {
                console.log("GOOGLE_API_KEY not found or empty");
                this.providers["gemini"] = { available: false };
            }

            // OpenAI GPT
            const openaiKey = process.env.OPENAI_API_KEY;
            if (openaiKey && openaiKey.trim()) {
                try {
                    this.providers["openai"] = {
                        client: new OpenAI({ apiKey: openaiKey.trim() }),
                        available: true,
                    };
                    console.log("OpenAI provider loaded successfully");
                } catch (error) {
                    console.error("Failed to initialize OpenAI:", error);
                    this.providers["openai"] = { available: false };
                }
            } else {
                console.log("OPENAI_API_KEY not found or empty");
                this.providers["openai"] = { available: false };
            }

            // DeepSeek
            const deepseekKey = process.env.DEEPSEEK_API_KEY;
            if (deepseekKey && deepseekKey.trim()) {
                try {
                    this.providers["deepseek"] = {
                        client: new OpenAI({
                            apiKey: deepseekKey.trim(),
                            baseURL: "https://api.deepseek.com",
                        }),
                        available: true,
                    };
                    console.log("DeepSeek provider loaded successfully");
                } catch (error) {
                    console.error("Failed to initialize DeepSeek:", error);
                    this.providers["deepseek"] = { available: false };
                }
            } else {
                console.log("DEEPSEEK_API_KEY not found or empty");
                this.providers["deepseek"] = { available: false };
            }
        } catch (error) {
            console.error("Failed to load LLM providers:", error);
        }
    }

    getAvailableProviders() {
        return Object.fromEntries(
            Object.entries(this.providers).map(([key, value]) => [
                key,
                value.available,
            ])
        );
    }

    async generateResponse(provider, prompt, options = {}) {
        if (!this.providers[provider]) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        if (!this.providers[provider].available) {
            throw new Error(`Provider ${provider} is not available`);
        }

        try {
            switch (provider) {
                case "gemini":
                    return await this._generateGemini(prompt, options);
                case "openai":
                    return await this._generateOpenAI(prompt, options);
                case "deepseek":
                    return await this._generateDeepSeek(prompt, options);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            console.error(`Error generating response with ${provider}:`, error);
            throw error;
        }
    }

    async _generateGemini(prompt, options = {}) {
        const client = this.providers["gemini"].client;
        const model = options.model || "gemini-2.0-flash";
        const maxTokens = options.maxTokens || 1000;
        const temperature = options.temperature || 0.7;

        const genModel = client.getGenerativeModel({ model });

        const result = await genModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: temperature,
            },
        });

        const response = result.response;
        const text = response.text();

        return {
            response: text,
            model: model,
            provider: "gemini",
            usage: {
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0,
            },
        };
    }

    async _generateOpenAI(prompt, options = {}) {
        const client = this.providers["openai"].client;
        const model = options.model || "gpt-3.5-turbo";
        const maxTokens = options.maxTokens || 1000;
        const temperature = options.temperature || 0.7;

        const completion = await client.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            temperature: temperature,
        });

        const choice = completion.choices[0];

        return {
            response: choice.message.content,
            model: model,
            provider: "openai",
            usage: {
                inputTokens: completion.usage?.prompt_tokens || 0,
                outputTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            },
        };
    }

    async _generateDeepSeek(prompt, options = {}) {
        const client = this.providers["deepseek"].client;
        const model = options.model || "deepseek-chat";
        const maxTokens = options.maxTokens || 1000;
        const temperature = options.temperature || 0.7;

        const completion = await client.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            temperature: temperature,
        });

        const choice = completion.choices[0];

        return {
            response: choice.message.content,
            model: model,
            provider: "deepseek",
            usage: {
                inputTokens: completion.usage?.prompt_tokens || 0,
                outputTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            },
        };
    }
}

module.exports = JSLLMFactory;
