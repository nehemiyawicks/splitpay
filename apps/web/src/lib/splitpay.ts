import type { Address } from "viem";

export const SPLITPAY_ADDRESS = (process.env.NEXT_PUBLIC_SPLITPAY_ADDRESS ?? "") as Address | "";

export const CELO_MAINNET_CUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as Address;
export const CELO_MAINNET_USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as Address;
export const CELO_SEPOLIA_CUSD = "0xB6C3d8ff01Cf78D8C7CD3d70e51e8a2Fd0362cf5" as Address;

export const SPLITPAY_ABI = [
  { inputs: [], name: "CreatorNotInMembers", type: "error" },
  { inputs: [], name: "DuplicateMember", type: "error" },
  { inputs: [], name: "MismatchedArrays", type: "error" },
  { inputs: [], name: "NotAMember", type: "error" },
  { inputs: [], name: "TooFewMembers", type: "error" },
  { inputs: [], name: "ZeroAddress", type: "error" },
  { inputs: [], name: "ZeroAmount", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "groupId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "payer", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "address[]", name: "debtors", type: "address[]" },
      { indexed: false, internalType: "uint256[]", name: "shares", type: "uint256[]" },
      { indexed: false, internalType: "string", name: "memo", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "ExpenseAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "groupId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "address[]", name: "members", type: "address[]" },
    ],
    name: "GroupCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "groupId", type: "bytes32" },
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Settled",
    type: "event",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "groupId", type: "bytes32" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address[]", name: "debtors", type: "address[]" },
      { internalType: "uint256[]", name: "shares", type: "uint256[]" },
      { internalType: "string", name: "memo", type: "string" },
    ],
    name: "addExpense",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address[]", name: "members", type: "address[]" }],
    name: "createGroup",
    outputs: [{ internalType: "bytes32", name: "groupId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "groupId", type: "bytes32" },
      { internalType: "address", name: "member", type: "address" },
    ],
    name: "getBalance",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "groupId", type: "bytes32" }],
    name: "getExpenseCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "groupId", type: "bytes32" }],
    name: "getMembers",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "groupId", type: "bytes32" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "settle",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const STORAGE_KEY = "splitpay:groups";

export function loadGroupIds(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as `0x${string}`[]) : [];
  } catch {
    return [];
  }
}

export function saveGroupId(groupId: `0x${string}`) {
  if (typeof window === "undefined") return;
  const existing = loadGroupIds();
  if (existing.includes(groupId)) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, groupId]));
}
