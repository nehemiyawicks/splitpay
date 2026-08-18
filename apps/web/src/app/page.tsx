"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { celo } from "wagmi/chains";
import { formatUnits, isAddress, parseUnits, decodeEventLog, type Address } from "viem";
import {
  SPLITPAY_ABI,
  SPLITPAY_ADDRESS,
  ERC20_ABI,
  CELO_MAINNET_CUSD,
  CELO_MAINNET_USDC,
  CELO_SEPOLIA_CUSD,
  loadGroupIds,
  saveGroupId,
} from "@/lib/splitpay";
import { truncateAddress } from "@/lib/app-utils";
import { divviSuffix, reportDivvi } from "@/lib/divvi";

const TARGET_CHAIN_ID = celo.id;

export default function Home() {
  const { address, isConnected } = useAccount();

  if (!SPLITPAY_ADDRESS) {
    return (
      <main className="container max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">splitpay</h1>
        <p className="text-muted-foreground">
          Not configured yet. Deploy <code className="bg-muted px-1 rounded">SplitPay.sol</code> and set{" "}
          <code className="bg-muted px-1 rounded">NEXT_PUBLIC_SPLITPAY_ADDRESS</code> in{" "}
          <code className="bg-muted px-1 rounded">apps/web/.env.local</code>.
        </p>
      </main>
    );
  }

  if (!isConnected || !address) {
    return (
      <main className="container max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">splitpay</h1>
        <p className="text-muted-foreground">Connect a wallet to start splitting.</p>
      </main>
    );
  }

  return <SplitPayApp me={address} />;
}

function SplitPayApp({ me }: { me: Address }) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [groupIds, setGroupIds] = useState<`0x${string}`[]>([]);
  const [selected, setSelected] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    setGroupIds(loadGroupIds());
  }, []);

  const wrongChain = chainId !== TARGET_CHAIN_ID;

  const handleGroupCreated = (groupId: `0x${string}`) => {
    saveGroupId(groupId);
    setGroupIds(loadGroupIds());
    setSelected(groupId);
  };

  return (
    <main className="container max-w-3xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">splitpay</h1>
        <p className="text-sm text-muted-foreground">Signed in as {truncateAddress(me)}</p>
      </header>

      {wrongChain && (
        <div className="border border-yellow-500 rounded p-3 bg-yellow-500/10">
          <p className="text-sm mb-2">
            Your wallet is on chain {chainId}, but splitpay targets Celo ({TARGET_CHAIN_ID}).
          </p>
          <button
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="px-3 py-1 bg-yellow-500 text-black rounded text-sm"
          >
            Switch to Celo
          </button>
        </div>
      )}

      <CreateGroup me={me} onCreated={handleGroupCreated} />

      <section>
        <h2 className="text-xl font-semibold mb-3">My groups</h2>
        {groupIds.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No groups yet. Create one above.
          </p>
        )}
        <ul className="space-y-2">
          {groupIds.map((id) => (
            <li key={id}>
              <button
                onClick={() => setSelected(id)}
                className={`w-full text-left px-3 py-2 rounded border font-mono text-xs ${
                  selected === id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && <GroupDetail groupId={selected} me={me} />}
    </main>
  );
}

function CreateGroup({ me, onCreated }: { me: Address; onCreated: (id: `0x${string}`) => void }) {
  const [input, setInput] = useState<string>(me);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { data: receipt, isLoading: waiting } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: SPLITPAY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "GroupCreated") {
          onCreated(decoded.args.groupId as `0x${string}`);
          setTxHash(null);
          return;
        }
      } catch {}
    }
  }, [receipt, onCreated]);

  const submit = async () => {
    setError(null);
    const members = input
      .split(/[\s,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (members.length < 2) {
      setError("Need at least 2 members (comma or newline separated).");
      return;
    }
    for (const m of members) {
      if (!isAddress(m)) {
        setError(`Not a valid address: ${m}`);
        return;
      }
    }
    if (!members.map((m) => m.toLowerCase()).includes(me.toLowerCase())) {
      setError("You must include your own address.");
      return;
    }
    try {
      const hash = await writeContractAsync({
        chainId: TARGET_CHAIN_ID,
        address: SPLITPAY_ADDRESS as Address,
        abi: SPLITPAY_ABI,
        functionName: "createGroup",
        args: [members as Address[]],
        dataSuffix: divviSuffix(me),
      });
      setTxHash(hash);
      reportDivvi(hash, TARGET_CHAIN_ID);
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Transaction failed");
    }
  };

  return (
    <section className="border rounded-lg p-4 space-y-3">
      <h2 className="text-xl font-semibold">Create a group</h2>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={4}
        placeholder="Member addresses, one per line or comma-separated. Include yours."
        className="w-full font-mono text-xs p-2 border rounded bg-background"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={isPending || waiting}
          className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {isPending || waiting ? "Creating..." : "Create group"}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </section>
  );
}

function GroupDetail({ groupId, me }: { groupId: `0x${string}`; me: Address }) {
  const { data: members } = useReadContract({
    address: SPLITPAY_ADDRESS as Address,
    abi: SPLITPAY_ABI,
    functionName: "getMembers",
    args: [groupId],
    chainId: TARGET_CHAIN_ID,
  });

  const { data: myBalance } = useReadContract({
    address: SPLITPAY_ADDRESS as Address,
    abi: SPLITPAY_ABI,
    functionName: "getBalance",
    args: [groupId, me],
    chainId: TARGET_CHAIN_ID,
  });

  return (
    <section className="border rounded-lg p-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Group detail</h2>
        <p className="text-xs font-mono text-muted-foreground break-all">{groupId}</p>
      </div>

      <div>
        <h3 className="font-medium mb-2">Members</h3>
        <ul className="text-sm font-mono space-y-1">
          {members?.map((m) => <li key={m}>{m}{m.toLowerCase() === me.toLowerCase() && <span className="text-primary ml-2">(you)</span>}</li>)}
        </ul>
      </div>

      <div>
        <h3 className="font-medium mb-2">Your balance</h3>
        <p className="text-2xl font-mono">
          {myBalance !== undefined
            ? `${formatSignedUnits(myBalance as bigint, 6)} (USDC-scale)`
            : "loading..."}
        </p>
        <p className="text-xs text-muted-foreground">
          Positive = you are owed. Negative = you owe.
        </p>
      </div>

      {members && <AddExpense groupId={groupId} members={members as Address[]} me={me} />}
      {members && <Settle groupId={groupId} members={members as Address[]} me={me} />}
    </section>
  );
}

function AddExpense({
  groupId,
  members,
  me,
}: {
  groupId: `0x${string}`;
  members: Address[];
  me: Address;
}) {
  const [total, setTotal] = useState("");
  const [memo, setMemo] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(members.map((m) => [m, true]))
  );
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  const submit = async () => {
    setError(null);
    const debtors = members.filter((m) => selected[m]);
    if (debtors.length === 0) {
      setError("Pick at least one debtor.");
      return;
    }
    if (!total || Number(total) <= 0) {
      setError("Enter a total > 0.");
      return;
    }
    try {
      const amount = parseUnits(total, 6);
      const share = amount / BigInt(debtors.length);
      const shares = debtors.map(() => share);
      shares[0] += amount - share * BigInt(debtors.length);
      const hash = await writeContractAsync({
        chainId: TARGET_CHAIN_ID,
        address: SPLITPAY_ADDRESS as Address,
        abi: SPLITPAY_ABI,
        functionName: "addExpense",
        args: [groupId, amount, debtors, shares, memo],
        dataSuffix: divviSuffix(me),
      });
      reportDivvi(hash, TARGET_CHAIN_ID);
      setTotal("");
      setMemo("");
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Transaction failed");
    }
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <h3 className="font-medium">Add expense (I paid)</h3>
      <div className="flex gap-2">
        <input
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          placeholder="Total (e.g. 30 for 30 USDC)"
          type="number"
          step="0.01"
          className="flex-1 px-3 py-2 border rounded bg-background"
        />
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Memo (e.g. dinner)"
          className="flex-1 px-3 py-2 border rounded bg-background"
        />
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Split among:</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m} className="flex items-center gap-1 text-xs font-mono">
              <input
                type="checkbox"
                checked={selected[m] ?? false}
                onChange={(e) => setSelected({ ...selected, [m]: e.target.checked })}
              />
              {truncateAddress(m)}
              {m.toLowerCase() === me.toLowerCase() && <span className="text-primary">(you)</span>}
            </label>
          ))}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        {isPending ? "Adding..." : "Add expense"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Settle({
  groupId,
  members,
  me,
}: {
  groupId: `0x${string}`;
  members: Address[];
  me: Address;
}) {
  const chainId = useChainId();
  const defaultToken = chainId === 42220 ? CELO_MAINNET_USDC : CELO_SEPOLIA_CUSD;
  const [to, setTo] = useState<Address | "">("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<Address>(defaultToken);
  const [step, setStep] = useState<"idle" | "approving" | "settling">("idle");
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    setToken(defaultToken);
  }, [defaultToken]);

  const submit = async () => {
    setError(null);
    if (!to || !isAddress(to)) {
      setError("Pick a member to pay.");
      return;
    }
    if (to.toLowerCase() === me.toLowerCase()) {
      setError("Can't settle to yourself.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter an amount > 0.");
      return;
    }
    const value = parseUnits(amount, 6);
    try {
      setStep("approving");
      const approveHash = await writeContractAsync({
        chainId: TARGET_CHAIN_ID,
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SPLITPAY_ADDRESS as Address, value],
        dataSuffix: divviSuffix(me),
      });
      reportDivvi(approveHash, TARGET_CHAIN_ID);
      setStep("settling");
      const settleHash = await writeContractAsync({
        chainId: TARGET_CHAIN_ID,
        address: SPLITPAY_ADDRESS as Address,
        abi: SPLITPAY_ABI,
        functionName: "settle",
        args: [groupId, to as Address, token, value],
        dataSuffix: divviSuffix(me),
      });
      reportDivvi(settleHash, TARGET_CHAIN_ID);
      setAmount("");
      setTo("");
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Transaction failed");
    } finally {
      setStep("idle");
    }
  };

  const others = members.filter((m) => m.toLowerCase() !== me.toLowerCase());

  return (
    <div className="border-t pt-4 space-y-3">
      <h3 className="font-medium">Settle (I pay them)</h3>
      <div className="flex gap-2 flex-wrap">
        <select
          value={to}
          onChange={(e) => setTo(e.target.value as Address)}
          className="px-3 py-2 border rounded bg-background"
        >
          <option value="">Pay who...</option>
          {others.map((m) => (
            <option key={m} value={m}>
              {truncateAddress(m)}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="number"
          step="0.01"
          className="flex-1 px-3 py-2 border rounded bg-background"
        />
      </div>
      <button
        onClick={submit}
        disabled={step !== "idle"}
        className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        {step === "approving" ? "Approving..." : step === "settling" ? "Settling..." : "Settle"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function formatSignedUnits(v: bigint, decimals: number): string {
  const abs = v < 0n ? -v : v;
  const s = formatUnits(abs, decimals);
  return v < 0n ? `-${s}` : s;
}

// Reference imports to silence unused-var lints when tokens map isn't used yet.
void CELO_MAINNET_CUSD;
