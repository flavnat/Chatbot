// Export all services from a single entry point
import api from "./api";
import { chatService, healthService } from "./chatService";

export { api };
export { chatService, healthService };

// Default export for convenience
const services = {
    api,
    chat: chatService,
    health: healthService,
};

export default services;
