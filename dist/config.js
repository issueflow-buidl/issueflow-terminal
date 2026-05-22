"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(require("fs"));
function loadConfig() {
    if (!fs_1.default.existsSync(".issueflow")) {
        return {};
    }
    try {
        const data = fs_1.default.readFileSync(".issueflow", "utf-8");
        return JSON.parse(data);
    }
    catch {
        console.error("Failed to parse .issueflow file");
        return {};
    }
}
