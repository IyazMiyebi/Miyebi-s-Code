import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE, currencyForCountry, isCurrency } from "@/lib/currency";

// On a visitor's first page, pick their currency from the country Vercel
// detected (x-vercel-ip-country) and remember it in a cookie. A currency they
// choose in the header overwrites the cookie and is never second-guessed.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!isCurrency(request.cookies.get(CURRENCY_COOKIE)?.value)) {
    response.cookies.set(CURRENCY_COOKIE, currencyForCountry(request.headers.get("x-vercel-ip-country")), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Pages only: skip Next.js assets, images and files with an extension.
  matcher: ["/((?!_next/|api/|.*\\.[a-z0-9]+$).*)"],
};
