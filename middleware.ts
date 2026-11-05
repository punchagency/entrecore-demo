import { NextRequest, NextResponse } from "next/server";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

//   const refreshToken = request.cookies.get("refresh_token")?.value;

//   const isProtectedRoute =
//     pathname.startsWith("/metrics") ||
//     pathname.startsWith("/data-room") ||
//     pathname.startsWith("/investor-access") ||
//     pathname.startsWith("/settings") ||
//     pathname.startsWith("/coreos") ||
//     pathname.startsWith("/market") ||
//     pathname.startsWith("/portfolio") ||
//     pathname.startsWith("/search");

//   if (isProtectedRoute && !refreshToken) {
//     const url = new URL("/auth/login", request.url);
//     url.searchParams.set("callbackUrl", encodeURI(pathname));
//     return NextResponse.redirect(url);
//   }

//   const isAuthPage = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup");
//   if (isAuthPage && refreshToken) {
//     return NextResponse.redirect(new URL("/metrics", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - public (public files)
//      */
//     "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
//   ],
};
