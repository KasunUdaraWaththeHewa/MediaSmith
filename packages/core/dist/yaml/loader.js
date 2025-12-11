"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadJobConfig = loadJobConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yaml_1 = __importDefault(require("yaml"));
const schema_1 = require("./schema");
async function loadJobConfig(configPath) {
    const full = path_1.default.resolve(process.cwd(), configPath);
    const raw = await fs_1.default.promises.readFile(full, 'utf-8');
    const parsed = yaml_1.default.parse(raw);
    const res = schema_1.JobSchema.safeParse(parsed);
    if (!res.success) {
        const msg = res.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
        throw new Error(`Invalid job config:\n${msg}`);
    }
    return res.data;
}
