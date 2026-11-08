import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

/**
 * Verificação otimista: sem sessão válida → /login.
 * A autorização real repete-se em cada Server Action / Route Handler (requireSession).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("from", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Tudo exceto assets estáticos e ficheiros com extensão (ícones, manifest, imagens…).
  matcher: ["/((?!_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
