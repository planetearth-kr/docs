export interface Env {
  GITHUB_OAUTH_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/api/callback`;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_OAUTH_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'repo,user');
  authorizeUrl.searchParams.set('state', state);

  const headers = new Headers({ Location: authorizeUrl.toString() });
  // CSRF state 검증용 — 콜백에서 이 쿠키 값과 GitHub이 돌려준 state를 대조한다.
  headers.append(
    'Set-Cookie',
    `decap_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );

  return new Response(null, { status: 302, headers });
};
