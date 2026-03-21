import { getDb } from "@/lib/db";
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

  // Block well-known test key in production
  if (apiKey === "sk_test_localdevelopment" && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "test_key_blocked", message: "Test API keys are not allowed in production" },
      { status: 403 }
    );
  }

  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const db = await getDb();
  const result = await db.validateApiKey(keyHash);

  if (!result) {
    return NextResponse.json(
      { error: "invalid_api_key", message: "API key is invalid or revoked" },
      { status: 401 }
    );
  }

  return result;
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
