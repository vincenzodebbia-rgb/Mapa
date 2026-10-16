import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy-session";

// Only keeps the auth cookie fresh. Authorization is re-checked in every page and action.
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Skip static files: they never need a session.
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
