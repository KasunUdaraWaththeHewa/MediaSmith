"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommand = validateCommand;
const core_1 = require("@mediasmith/core");
async function validateCommand(configPath) {
    try {
        await (0, core_1.loadJobConfig)(configPath);
        console.log('Config is valid ✅');
    }
    catch (err) {
        console.error('Invalid config ❌');
        console.error(err.message ?? err);
        process.exit(1);
    }
}
