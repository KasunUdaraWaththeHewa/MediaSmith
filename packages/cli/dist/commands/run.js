"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
const core_1 = require("@mediasmith/core");
async function runCommand(configPath) {
    try {
        const config = await (0, core_1.loadJobConfig)(configPath);
        await (0, core_1.runJobFromConfig)(config, {
            onLog: core_1.logger.info
        });
    }
    catch (err) {
        core_1.logger.error(`Error: ${err.message ?? err}`);
        process.exit(1);
    }
}
