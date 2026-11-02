import { NextResponse, type NextRequest } from 'next/server';

// Leitet nicht angemeldete Seitenaufrufe auf /login um. Die eigentliche Prüfung der Sitzung erfolgt in den API-Routen.
export function middleware(req: NextRequest) {
  if (!req.cookies.get('rtm_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|login|_next|icon\\.svg|icon-.*\\.png|apple-touch-icon\\.png|manifest\\.webmanifest|favicon\\.ico).*)'] };
