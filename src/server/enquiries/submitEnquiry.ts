import { createHash } from "node:crypto";
import type { Enquiry } from "../../lib/enquiry";

export type EnquiryReceipt = {
  receipt: string;
  fingerprint: string;
  pageId?: string;
};
export type EnquiryStore = {
  find(id: string): Promise<EnquiryReceipt | undefined>;
  create(value: Enquiry, fingerprint: string): Promise<EnquiryReceipt>;
  notify?(receipt: EnquiryReceipt): Promise<void>;
};
const pending = new Map<string, Promise<EnquiryReceipt>>();

/** Coalesce same-instance retries; the store also checks receipts after restarts. */
export async function submitEnquiry(
  value: Enquiry,
  store: EnquiryStore,
): Promise<EnquiryReceipt> {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
  const key = value.id;
  const existingRequest = pending.get(key);
  if (existingRequest) {
    const existing = await existingRequest;
    if (existing.fingerprint !== fingerprint)
      throw new Error("enquiry_conflict");
    return existing;
  }
  const request = (async () => {
    const existing = await store.find(value.id);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error("enquiry_conflict");
      return existing;
    }
    return store.create(value, fingerprint);
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}
