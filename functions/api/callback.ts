export interface Env {
  GITHUB_OAUTH_ID: string;
  GITHUB_OAUTH_SECRET: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

// Decap이 기대하는 postMessage 핸드셰이크. 프로토콜은 Decap/Netlify CMS 클라이언트 쪽 코드가
// 고정해둔 것이라 임의로 바꿀 수 없다 (netlify-cms-github-oauth-provider / sveltia-cms-auth와 동일한 시퀀스):
// 1. 팝업이 opener에게 "authorizing:github"을 보낸다.
// 2. opener(Decap)가 신뢰할 origin을 확인하며 응답 메시지를 되돌려준다.
// 3. 팝업이 그 응답을 받는 순간, 최종 결과("authorization:github:success:{...}" 등)를 opener로 보낸다.
function renderResult(
  status: 'success' | 'error',
  payload: Record<string, string>,
  clearCookie: boolean,
): Response {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const html = `<!DOCTYPE html>
<html>
  <body>
    <script>
      (function() {
        function receiveMessage(e) {
          window.opener.postMessage(
            ${JSON.stringify(message)},
            e.origin
          );
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  </body>
</html>`;

  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  if (clearCookie) {
    headers.append('Set-Cookie', 'decap_oauth_state=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  }
  return new Response(html, { status: 200, headers });
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = getCookie(request, 'decap_oauth_state');

  if (!code || !state || !expectedState || state !== expectedState) {
    return renderResult('error', { message: 'Invalid OAuth state or missing authorization code.' }, false);
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_ID,
      client_secret: env.GITHUB_OAUTH_SECRET,
      code,
    }),
  });

  const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

  if (!tokenData.access_token) {
    return renderResult(
      'error',
      { message: tokenData.error_description ?? tokenData.error ?? 'GitHub token exchange failed.' },
      true,
    );
  }

  return renderResult('success', { token: tokenData.access_token, provider: 'github' }, true);
};
