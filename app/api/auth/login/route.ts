import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  checkPassword,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    password = String(((await request.json()) as { password?: unknown })?.password ?? "");
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  const store = await cookies();
  store.set(COOKIE_NAME, await createSessionToken(), sessionCookieOptions());
  return Response.json({ ok: true });
}
