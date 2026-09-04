import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await verifySessionToken(
    request.cookies.get(COOKIE_NAME)?.value,
  );

  if (PUBLIC_PATHS.includes(pathname)) {
    // Already through the gate — don't show the login screen again.
    if (authenticated && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything but Next's own assets and the favicon goes through the gate.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
