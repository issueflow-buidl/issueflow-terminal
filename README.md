# issueflow-cli

CLI tool for managing GitHub issues and attaching Stellar USDC bounty details.

## Commands

### List open issues

```bash
issueflow list --repo owner/repo
```

### Attach a bounty to an issue

```bash
issueflow bounty --repo owner/repo --issue 42 --amount 25 --network testnet
```

The bounty command validates the target issue, token, amount, and Stellar
network, then posts a bounty summary comment to the GitHub issue. Pass
`--dry-run` to preview the request without changing GitHub.

Optional flags:

- `--contract-id <contractId>` records the Soroban bounty contract used for the
  request. It can also be provided through `STELLAR_BOUNTY_CONTRACT_ID`.
- `--no-comment` prepares and prints the bounty payload without posting a GitHub
  issue comment.

The command reads `GITHUB_TOKEN`, `GH_TOKEN`, or `githubToken` from `.issueflow`
for authenticated GitHub API calls.
