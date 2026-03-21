import { createServiceClient } from "@/lib/db/client";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

interface AuthResult {
  orgId: string;
  apiKeyId: string;
}

/**
 * Validate an API key from the Authorization header.
 * Keys are stored as SHA-256 hashes — never in plaintext.
 */
export async function validateApiKey(req: NextRequest): Promise<AuthResult | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Authorization header with Bearer token required" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, org_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "invalid_api_key", message: "API key is invalid or revoked" },
      { status: 401 }
    );
  }

  if (data.revoked_at) {
    return NextResponse.json(
      { error: "revoked_api_key", message: "This API key has been revoked" },
      { status: 401 }
    );
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then();

  return { orgId: data.org_id, apiKeyId: data.id };
}

/** Generate a new API key and return the raw key (shown once) + hash for storage */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawKey = "sk_live_" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 16);
  return { rawKey, keyHash, keyPrefix };
}
