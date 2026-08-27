import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "test@test.com";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "test12345678";
export const E2E_EMAIL_B = process.env.E2E_EMAIL_B ?? "testb@test.com";
export const E2E_PASSWORD_B = process.env.E2E_PASSWORD_B ?? "testb12345678";

export const AUTH_FILE_A = path.join("e2e", ".auth", "user.json");
export const AUTH_FILE_B = path.join("e2e", ".auth", "user-b.json");

export function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env) || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function decodeSessionCookie(value: string): {
  access_token: string;
  refresh_token: string;
} {
  const raw = value.startsWith("base64-")
    ? Buffer.from(value.slice("base64-".length), "base64url").toString("utf8")
    : decodeURIComponent(value);
  const parsed = JSON.parse(raw) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!parsed.access_token || !parsed.refresh_token) {
    throw new Error("Auth cookie missing access/refresh token");
  }
  return {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
  };
}

/** Supabase client authenticated as the user in a Playwright storageState file. */
export async function clientFromStorageState(
  storagePath: string,
): Promise<SupabaseClient> {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
  }

  const state = JSON.parse(readFileSync(storagePath, "utf8")) as {
    cookies: Array<{ name: string; value: string }>;
  };
  const cookie = state.cookies.find((row) => row.name.includes("auth-token"));
  if (!cookie) {
    throw new Error(`No auth-token cookie in ${storagePath}`);
  }

  const session = decodeSessionCookie(cookie.value);
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.setSession(session);
  if (error) {
    throw new Error(`setSession failed: ${error.message}`);
  }
  return supabase;
}

export function userIdFromJwt(accessToken: string): string {
  const payload = JSON.parse(
    Buffer.from(accessToken.split(".")[1]!, "base64url").toString("utf8"),
  ) as { sub: string };
  return payload.sub;
}

export async function userIdFromStorageState(storagePath: string): Promise<string> {
  const state = JSON.parse(readFileSync(storagePath, "utf8")) as {
    cookies: Array<{ name: string; value: string }>;
  };
  const cookie = state.cookies.find((row) => row.name.includes("auth-token"));
  if (!cookie) throw new Error(`No auth-token cookie in ${storagePath}`);
  return userIdFromJwt(decodeSessionCookie(cookie.value).access_token);
}
