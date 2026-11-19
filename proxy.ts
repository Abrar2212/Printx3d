import { NextResponse, type NextRequest } from "next/server";
import { readSession, requiredRole, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const need = requiredRole(req.method, pathname);
  if (!need) return NextResponse.next();

  const role = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (role === "admin" || role === need) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: role ? "Forbidden" : "Unauthorized" },
      { status: role ? 403 : 401 }
    );
  }
  // Reception opening an admin page goes back to their queue; everyone else logs in.
  if (role === "staff") return NextResponse.redirect(new URL("/operator", req.url));
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/operator/:path*", "/api/admin/:path*", "/api/orders/:path*"],
};
