import { getReferralTag, submitReferral } from "@divvi/referral-sdk";
import type { Address, Hex } from "viem";

const CONSUMER = (process.env.NEXT_PUBLIC_DIVVI_CONSUMER ?? "") as Address | "";

export function divviSuffix(user: Address): Hex | undefined {
  if (!CONSUMER) return undefined;
  return `0x${getReferralTag({ user, consumer: CONSUMER })}` as Hex;
}

export async function reportDivvi(txHash: Hex, chainId: number): Promise<void> {
  if (!CONSUMER) return;
  try {
    await submitReferral({ txHash, chainId });
  } catch (err) {
    console.warn("Divvi submitReferral failed", err);
  }
}
