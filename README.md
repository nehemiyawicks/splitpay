# splitpay

Group expense splitter with instant on-chain settle. Track shared expenses in a group, see who owes whom, and settle any balance in cUSD or USDC via MiniPay in one tap.

Built for Celo, ships as a MiniApp for Opera's [MiniPay](https://www.opera.com/products/minipay) wallet.

## What it does

- **Create a group** for roommates, a trip, a dinner, a household, anyone with a Celo wallet.
- **Add an expense** with amount, description, and who owes what share. Recorded on-chain.
- **See running balances** for the group: who's up, who's down.
- **Settle** any balance instantly by tapping "Settle", pushes a cUSD/USDC transfer through the connected wallet (MiniPay-optimized) and clears the debt on-chain.

No intermediary. Balances live in a smart contract on Celo. Settlement is a real wallet-to-wallet stablecoin transfer.

## Status

Live on Celo mainnet.

- Contract: [`0x2979d1808024bd81eaba87942d79f7b2168e39c4`](https://celoscan.io/address/0x2979d1808024bd81eaba87942d79f7b2168e39c4#code), verified source on Celoscan.
- Frontend: [splitpay-orpin.vercel.app](https://splitpay-orpin.vercel.app), auto-deploys on push to `main`.
- Also deployed on Celo Sepolia at the same address (same deployer, same nonce, so `CREATE` produced the same address on both chains).

## Stack

- **Chain:** Celo mainnet (chainId 42220). Sepolia (11142220) for testing.
- **Contract:** Solidity 0.8.28, Hardhat + viem test toolbox. Deploy via `hardhat run scripts/deploy.ts --network celo`.
- **Frontend:** Next.js 14 App Router, wagmi v2, RainbowKit, viem.
- **Wallet:** MiniPay auto-connect when running inside the wallet's in-app browser; RainbowKit's injected connector otherwise.
- **Monorepo:** Turborepo + pnpm workspaces.

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

Built as an entry for [Celo Proof of Ship](https://talent.app/~/earn/celo-proof-of-ship), Celo's monthly builder program. Group expense splitting is a real daily use-case that fits MiniPay perfectly (peer-to-peer stablecoin transfers between people who already know each other).
