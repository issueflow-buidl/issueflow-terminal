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
function createOctokit() {
    const token = config.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
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
    console.log(`  Status     : ${request.status}`);
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
    const { data: issues } = await octokit.issues.listForRepo({ owner, repo, state: 'open' });
    console.log('Total issues found:', issues.length);
    if (issues.length === 0) {
        console.log('No open issues found.');
        return;
    }
    console.log(`\nOpen issues in ${options.repo}:\n`);
    issues.forEach((issue) => console.log(`  #${issue.number} — ${issue.title}`));
});
program
    .command('bounty')
    .description('Attach a Stellar USDC bounty request to a GitHub issue')
    .requiredOption('-r, --repo <repo>', 'target repository (org/repo)')
    .requiredOption('-i, --issue <number>', 'target issue number')
    .requiredOption('-a, --amount <amount>', 'bounty amount in USDC')
    .option('-t, --token <token>', 'bounty token', 'USDC')
    .option('-n, --network <network>', 'Stellar network: testnet or mainnet', 'testnet')
    .option('--dry-run', 'validate and print the request without submitting')
    .action(async (options) => {
    const repoInput = options.repo || config.defaultRepo;
    if (!repoInput)
        throw new Error('Repository is required. Use --repo owner/repo or set defaultRepo in .issueflow.');
    const { owner, repo } = parseRepo(repoInput);
    const issueNumber = parseIssueNumber(options.issue);
    const amount = parseAmount(options.amount);
    const token = parseToken(options.token);
    const network = parseNetwork(options.network);
    const octokit = createOctokit();
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
    const request = createBountyRequest({ repository: repoInput, issueNumber, issueTitle: issue.title, amount, token, network, dryRun: Boolean(options.dryRun) });
    printSummary(request);
    if (options.dryRun)
        return;
    const result = await submitBountyRequest(request);
    console.log(chalk_1.default.yellow(`\n${result.message}`));
    console.log(chalk_1.default.green('Bounty request prepared successfully.'));
});
program
    .command('label')
    .description('Assign a label to multiple GitHub issues at once')
    .option('-r, --repo <repo>', 'target repository (org/repo)')
    .option('-i, --issues <numbers>', 'comma-separated issue numbers (e.g. 1,2,3)')
    .option('-l, --label <label>', 'label to assign')
    .action(async (options) => {
    const { owner, repo } = parseRepo(options.repo);
    const octokit = createOctokit();
    const issueNumbers = options.issues.split(',').map((n) => parseInt(n.trim()));
    for (const issueNumber of issueNumbers) {
        await octokit.issues.addLabels({
            owner,
            repo,
            issue_number: issueNumber,
            labels: [options.label],
        });
        console.log(`✓ Label "${options.label}" added to #${issueNumber}`);
    }
});
program.parse();
