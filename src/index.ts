#!/usr/bin/env node
import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import { loadConfig } from './config';

type SupportedToken = 'USDC';
type SupportedNetwork = 'testnet' | 'mainnet';
interface ParsedRepo { owner: string; repo: string; }
interface BountyRequest {
  repository: string;
  issueNumber: number;
  issueTitle: string;
  amount: number;
  token: SupportedToken;
  network: SupportedNetwork;
  chain: string;
  status: string;
}

const program = new Command();
const config = loadConfig();

function createOctokit(): Octokit {
  const token = config.githubToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return new Octokit(token ? { auth: token } : {});
}

function parseRepo(value: string): ParsedRepo {
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(value.trim());
  if (!match) throw new Error('Repository must be in the form owner/repo.');
  return { owner: match[1], repo: match[2] };
}

function parseIssueNumber(value: string): number {
  const issueNumber = Number(value);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('Issue number must be a positive integer.');
  return issueNumber;
}

function parseAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive number.');
  return amount;
}

function parseToken(value = 'USDC'): SupportedToken {
  const normalized = value.trim().toUpperCase();
  if (normalized !== 'USDC') throw new Error(`Unsupported token: ${value}. Only USDC is supported in this MVP.`);
  return normalized as SupportedToken;
}

function parseNetwork(value = 'testnet'): SupportedNetwork {
  const normalized = value.trim().toLowerCase();
  if (normalized !== 'testnet' && normalized !== 'mainnet') throw new Error(`Unsupported network: ${value}. Use testnet or mainnet.`);
  return normalized as SupportedNetwork;
}

function createBountyRequest(input: { repository: string; issueNumber: number; issueTitle: string; amount: number; token: SupportedToken; network: SupportedNetwork; dryRun: boolean; }): BountyRequest {
  return { repository: input.repository, issueNumber: input.issueNumber, issueTitle: input.issueTitle, amount: input.amount, token: input.token, network: input.network, chain: 'stellar', status: input.dryRun ? 'dry-run' : 'pending-contract-integration' };
}

function printSummary(request: BountyRequest): void {
  console.log(chalk.cyan('\nBounty request summary'));
  console.log(`  Repository : ${request.repository}`);
  console.log(`  Issue      : #${request.issueNumber} — ${request.issueTitle}`);
  console.log(`  Amount     : ${request.amount} ${request.token}`);
  console.log(`  Network    : ${request.network}`);
  console.log(`  Chain      : ${request.chain}`);
  console.log(`  Status     : ${request.status}`);
}

async function submitBountyRequest(request: BountyRequest): Promise<{ message: string; payload: BountyRequest }> {
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
    if (!repoInput) throw new Error('Repository is required. Use --repo owner/repo or set defaultRepo in .issueflow.');

    const { owner, repo } = parseRepo(repoInput);
    const issueNumber = parseIssueNumber(options.issue);
    const amount = parseAmount(options.amount);
    const token = parseToken(options.token);
    const network = parseNetwork(options.network);
    const octokit = createOctokit();
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
    const request = createBountyRequest({ repository: repoInput, issueNumber, issueTitle: issue.title, amount, token, network, dryRun: Boolean(options.dryRun) });

    printSummary(request);
    if (options.dryRun) return;

    const result = await submitBountyRequest(request);
    console.log(chalk.yellow(`\n${result.message}`));
    console.log(chalk.green('Bounty request prepared successfully.'));
  });

program.parse();
