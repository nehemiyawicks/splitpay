# splitpay

Group expense splitter with instant on-chain settle. Track shared expenses in a group, see who owes whom, and settle any balance in cUSD or USDC via MiniPay in one tap.

Built for Celo, ships as a MiniApp for Opera's [MiniPay](https://www.opera.com/products/minipay) wallet.

## What it does

- **Create a group** for roommates, a trip, a dinner, a household — anyone with a Celo wallet.
- **Add an expense** with amount, description, and who owes what share. Recorded on-chain.
- **See running balances** for the group: who's up, who's down.
- **Settle** any balance instantly by tapping "Settle" — pushes a cUSD/USDC transfer through the connected wallet (MiniPay-optimized) and clears the debt on-chain.

No intermediary. Balances live in a smart contract on Celo. Settlement is a real wallet-to-wallet stablecoin transfer.

## Status

Pre-alpha. Scaffold in place, contract and UI in active development. Not yet deployed.

## Stack

- **Chain:** Celo (mainnet target, Sepolia for testing)
- **Contracts:** Hardhat + Viem, Solidity 0.8.x
- **Frontend:** Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Wallet:** RainbowKit + wagmi (MiniPay-compatible)
- **Monorepo:** Turborepo + PNPM workspaces

## Structure

```
splitpay/
├── apps/
│   ├── contracts/    Hardhat project (SplitPay.sol + tests + deploy)
│   └── web/          Next.js MiniApp frontend
├── package.json      Root workspace
└── turbo.json        Turborepo pipeline
```

## Local development

```bash
pnpm install
pnpm dev            # starts Next.js dev server on :3000
pnpm contracts:test # runs Hardhat tests
```

## Deployment

Testnet:

```bash
pnpm contracts:deploy:celo-sepolia
```

Mainnet:

```bash
pnpm contracts:deploy:celo
```

## Why

Built as an entry for [Celo Proof of Ship](https://talent.app/~/earn/celo-proof-of-ship) — Celo's monthly builder program. Group expense splitting is a real daily use-case that fits MiniPay perfectly (peer-to-peer stablecoin transfers between people who already know each other).
