"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionRegistry = void 0;
class ActionRegistry {
    constructor() {
        this.handlers = new Map();
    }
    register(action, handler) {
        this.handlers.set(action, handler);
    }
    getHandler(action) {
        return this.handlers.get(action);
    }
}
exports.ActionRegistry = ActionRegistry;
