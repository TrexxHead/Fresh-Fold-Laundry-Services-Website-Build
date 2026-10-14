import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRuntimeMode, isConfigured } from "@/lib/runtime";

export async function proxy(request: NextRequest) {
  if (getRuntimeMode() === "review") return NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isConfigured(url) || !isConfigured(key)) {
    if (request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login") return NextResponse.redirect(new URL("/admin/login?reason=configuration", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const isProtectedAdmin = request.nextUrl.pathname.startsWith("/admin") && request.nextUrl.pathname !== "/admin/login";
  if (isProtectedAdmin) {
    if (!user) return NextResponse.redirect(new URL("/admin/login?reason=signin", request.url));
    const { data: staff } = await supabase.from("staff_roles").select("role,active").eq("user_id", user.id).eq("active", true).maybeSingle();
    if (!staff) return NextResponse.redirect(new URL("/admin/login?reason=role", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
