import { NextResponse, type NextRequest } from "next/server";

const AUTH_REALM = "High Bar";

function isAuthorized(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (authorization === `Bearer ${authSecret}`) return true;

  if (!authorization.startsWith("Basic ")) return false;

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return false;

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return username === "highbar" && password === authSecret;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (isAuthorized(request)) {
    return NextResponse.next();
  }

  if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "AUTH_SECRET is required in production" },
      { status: 503 }
    );
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
