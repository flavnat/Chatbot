const fs = require("fs").promises;
const path = require("path");

class ConversationTemplates {
    constructor() {
        this.templates = new Map();
        this.templatesFile = path.join(
            __dirname,
            "../../data/conversation-templates.json"
        );
        this.loadTemplates();
    }

    async loadTemplates() {
        try {
            const data = await fs.readFile(this.templatesFile, "utf-8");
            const templates = JSON.parse(data);
            this.templates = new Map(Object.entries(templates));
        } catch (error) {
            // Create default templates if file doesn't exist
            await this.createDefaultTemplates();
        }
    }

    async createDefaultTemplates() {
        const defaultTemplates = {
            greeting: {
                id: "greeting",
                name: "Greeting",
                description: "Start a friendly conversation",
                category: "general",
                messages: [
                    {
                        role: "user",
                        content: "Hello! How can you help me today?",
                    },
                ],
                tags: ["greeting", "introduction"],
            },
            technical_help: {
                id: "technical_help",
                name: "Technical Support",
                description: "Get help with technical issues",
                category: "support",
                messages: [
                    {
                        role: "user",
                        content:
                            "I need help with a technical issue. Can you assist me?",
                    },
                ],
                tags: ["technical", "support", "help"],
            },
            product_info: {
                id: "product_info",
                name: "Product Information",
                description: "Learn about our products",
                category: "sales",
                messages: [
                    {
                        role: "user",
                        content:
                            "Can you tell me about your products and services?",
                    },
                ],
                tags: ["product", "information", "sales"],
            },
            pricing: {
                id: "pricing",
                name: "Pricing Inquiry",
                description: "Ask about pricing and plans",
                category: "sales",
                messages: [
                    {
                        role: "user",
                        content: "What are your pricing plans?",
                    },
                ],
                tags: ["pricing", "plans", "cost"],
            },
        };

        this.templates = new Map(Object.entries(defaultTemplates));
        await this.saveTemplates();
    }

    async saveTemplates() {
        try {
            const templatesObj = Object.fromEntries(this.templates);
            await fs.writeFile(
                this.templatesFile,
                JSON.stringify(templatesObj, null, 2)
            );
        } catch (error) {
            console.error("Error saving conversation templates:", error);
        }
    }

    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    getTemplateById(id) {
        return this.templates.get(id);
    }

    getTemplatesByCategory(category) {
        return Array.from(this.templates.values()).filter(
            (template) => template.category === category
        );
    }

    searchTemplates(query) {
        const lowercaseQuery = query.toLowerCase();
        return Array.from(this.templates.values()).filter(
            (template) =>
                template.name.toLowerCase().includes(lowercaseQuery) ||
                template.description.toLowerCase().includes(lowercaseQuery) ||
                template.tags.some((tag) =>
                    tag.toLowerCase().includes(lowercaseQuery)
                )
        );
    }

    async createTemplate(templateData) {
        const id = Date.now().toString();
        const template = {
            id,
            ...templateData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        this.templates.set(id, template);
        await this.saveTemplates();
        return template;
    }

    async updateTemplate(id, updates) {
        const template = this.templates.get(id);
        if (!template) {
            throw new Error("Template not found");
        }

        const updatedTemplate = {
            ...template,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        this.templates.set(id, updatedTemplate);
        await this.saveTemplates();
        return updatedTemplate;
    }

    async deleteTemplate(id) {
        if (!this.templates.has(id)) {
            throw new Error("Template not found");
        }

        this.templates.delete(id);
        await this.saveTemplates();
        return true;
    }
}

module.exports = ConversationTemplates;
