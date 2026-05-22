#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const rest_1 = require("@octokit/rest");
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("./config");
const program = new commander_1.Command();
const config = (0, config_1.loadConfig)();
const token = config.githubToken || process.env.GITHUB_TOKEN;
function createOctokit() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    return new rest_1.Octokit(token ? { auth: token } : {});
}
function parseRepo(value) {
    const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(value.trim());
    if (!match)
        throw new Error('Repository must be in the form owner/repo.');
    return { owner: match[1], repo: match[2] };
}
function parseIssueNumber(value) {
    const issueNumber = Number(value);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0)
        throw new Error('Issue number must be a positive integer.');
    return issueNumber;
}
function parseAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0)
        throw new Error('Amount must be a positive number.');
    return amount;
}
function parseToken(value = 'USDC') {
    const normalized = value.trim().toUpperCase();
    if (normalized !== 'USDC')
        throw new Error(`Unsupported token: ${value}. Only USDC is supported in this MVP.`);
    return normalized;
}
function parseNetwork(value = 'testnet') {
    const normalized = value.trim().toLowerCase();
    if (normalized !== 'testnet' && normalized !== 'mainnet')
        throw new Error(`Unsupported network: ${value}. Use testnet or mainnet.`);
    return normalized;
}
function createBountyRequest(input) {
    return { repository: input.repository, issueNumber: input.issueNumber, issueTitle: input.issueTitle, amount: input.amount, token: input.token, network: input.network, chain: 'stellar', status: input.dryRun ? 'dry-run' : 'pending-contract-integration' };
}
function printSummary(request) {
    console.log(chalk_1.default.cyan('\nBounty request summary'));
    console.log(`  Repository : ${request.repository}`);
    console.log(`  Issue      : #${request.issueNumber} — ${request.issueTitle}`);
    console.log(`  Amount     : ${request.amount} ${request.token}`);
    console.log(`  Network    : ${request.network}`);
    console.log(`  Chain      : ${request.chain}`);
}
async function submitBountyRequest(request) {
    return { message: 'Contract submission is not wired up yet in this MVP.', payload: request };
}
program
    .name('issueflow')
    .description('CLI tool for bulk GitHub issue management with Web3 bounties')
    .version('1.0.0');
program
    .command('list')
    .description('List all open issues in a repository')
    .option('-r, --repo <repo>', 'target repository (org/repo)')
    .action(async (options) => {
    const { owner, repo } = parseRepo(options.repo);
    const octokit = createOctokit();
    const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
    });
    console.log('Total issues found:', issues.length);
    if (issues.length === 0) {
        console.log('No open issues found.');
        return;
    }
    console.log(`\nOpen issues in ${options.repo}:\n`);
    issues.forEach((issue) => {
        console.log(`  #${issue.number} — ${issue.title}`);
    });
});
program.parse();
