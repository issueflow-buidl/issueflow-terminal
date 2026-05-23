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
const githubToken = config.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
function createOctokit() {
    return new rest_1.Octokit(githubToken ? { auth: githubToken } : {});
}
function parseRepo(value) {
    const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(value.trim());
    if (!match) {
        throw new Error('Repository must be in the form owner/repo.');
    }
    return { owner: match[1], repo: match[2] };
}
function parseIssueNumber(value) {
    const issueNumber = Number(value);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
        throw new Error('Issue number must be a positive integer.');
    }
    return issueNumber;
}
function parseAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number.');
    }
    return amount;
}
function parseToken(value = 'USDC') {
    const normalized = value.trim().toUpperCase();
    if (normalized !== 'USDC') {
        throw new Error(`Unsupported token: ${value}. Only USDC is supported in this MVP.`);
    }
    return normalized;
}
function parseNetwork(value = 'testnet') {
    const normalized = value.trim().toLowerCase();
    if (normalized !== 'testnet' && normalized !== 'mainnet') {
        throw new Error(`Unsupported network: ${value}. Use testnet or mainnet.`);
    }
    return normalized;
}
function createBountyRequest(input) {
    return {
        repository: input.repository,
        issueNumber: input.issueNumber,
        issueTitle: input.issueTitle,
        issueUrl: input.issueUrl,
        amount: input.amount,
        token: input.token,
        network: input.network,
        contractId: input.contractId,
        chain: 'stellar',
        status: input.dryRun ? 'dry-run' : input.comment ? 'attached-to-issue' : 'prepared',
    };
}
function printSummary(request) {
    console.log(chalk_1.default.cyan('\nBounty request summary'));
    console.log(`  Repository : ${request.repository}`);
    console.log(`  Issue      : #${request.issueNumber} - ${request.issueTitle}`);
    console.log(`  Amount     : ${request.amount} ${request.token}`);
    console.log(`  Network    : ${request.network}`);
    console.log(`  Chain      : ${request.chain}`);
    if (request.contractId) {
        console.log(`  Contract   : ${request.contractId}`);
    }
    console.log(`  Status     : ${request.status}`);
}
function buildBountyComment(request) {
    const lines = [
        '### Stellar USDC bounty',
        '',
        `- Amount: ${request.amount} ${request.token}`,
        `- Network: ${request.network}`,
        `- Issue: ${request.issueUrl}`,
        `- Status: ${request.contractId ? 'contract configured' : 'ready for contract funding'}`,
    ];
    if (request.contractId) {
        lines.push(`- Soroban contract: \`${request.contractId}\``);
    }
    return lines.join('\n');
}
async function submitBountyRequest(request, options) {
    if (options.dryRun) {
        return { message: 'Dry run completed. No GitHub changes were made.', payload: request };
    }
    if (!options.comment) {
        return { message: 'Bounty payload prepared. No GitHub comment was posted.', payload: request };
    }
    await options.octokit.issues.createComment({
        owner: options.owner,
        repo: options.repo,
        issue_number: request.issueNumber,
        body: buildBountyComment(request),
    });
    return { message: 'Bounty details attached to the GitHub issue.', payload: request };
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
        console.log(`  #${issue.number} - ${issue.title}`);
    });
});
program
    .command('bounty')
    .description('Attach a Stellar USDC bounty to a GitHub issue')
    .option('-r, --repo <repo>', 'target repository (org/repo)')
    .requiredOption('-i, --issue <number>', 'GitHub issue number')
    .requiredOption('-a, --amount <amount>', 'bounty amount')
    .option('-t, --token <token>', 'bounty token', 'USDC')
    .option('-n, --network <network>', 'Stellar network', 'testnet')
    .option('--contract-id <contractId>', 'Soroban bounty contract id', process.env.STELLAR_BOUNTY_CONTRACT_ID)
    .option('--dry-run', 'validate and print the bounty without posting a GitHub comment')
    .option('--no-comment', 'skip the GitHub issue comment')
    .action(async (options) => {
    try {
        const repository = options.repo || config.defaultRepo;
        if (!repository) {
            throw new Error('Repository is required. Pass --repo owner/repo or set defaultRepo in .issueflow.');
        }
        const { owner, repo } = parseRepo(repository);
        const issueNumber = parseIssueNumber(options.issue);
        const amount = parseAmount(options.amount);
        const bountyToken = parseToken(options.token);
        const network = parseNetwork(options.network);
        const octokit = createOctokit();
        const { data: issue } = await octokit.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
        });
        if (issue.pull_request) {
            throw new Error('Bounties can only be attached to issues, not pull requests.');
        }
        const request = createBountyRequest({
            repository,
            issueNumber,
            issueTitle: issue.title,
            issueUrl: issue.html_url,
            amount,
            token: bountyToken,
            network,
            contractId: options.contractId,
            dryRun: Boolean(options.dryRun),
            comment: Boolean(options.comment),
        });
        printSummary(request);
        const result = await submitBountyRequest(request, {
            octokit,
            owner,
            repo,
            comment: Boolean(options.comment),
            dryRun: Boolean(options.dryRun),
        });
        console.log(chalk_1.default.green(`\n${result.message}`));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk_1.default.red(message));
        process.exitCode = 1;
    }
});
program.parse();
