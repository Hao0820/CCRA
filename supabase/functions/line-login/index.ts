import { createClient, type User } from 'npm:@supabase/supabase-js@2';

const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const COOKIE_PATH = '/functions/v1/line-login';
const COOKIE_MAX_AGE = 600;

type LineTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

type LineProfile = {
  sub: string;
  name?: string;
  picture?: string;
  nonce?: string;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function base64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function randomValue(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

function parseCookies(request: Request) {
  const values = new Map<string, string>();
  for (const pair of (request.headers.get('cookie') ?? '').split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) values.set(key, decodeURIComponent(value));
  }
  return values;
}

function cookie(name: string, value: string, maxAge = COOKIE_MAX_AGE) {
  return `${name}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  cookies.forEach((value) => headers.append('set-cookie', value));
  return new Response(null, { status: 302, headers });
}

function safeReturnUrl(requestedUrl: string | null) {
  const appUrl = getRequiredEnv('APP_URL');
  const allowed = (Deno.env.get('ALLOWED_APP_URLS') ?? appUrl)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!requestedUrl) return appUrl;

  try {
    const requested = new URL(requestedUrl);
    const matched = allowed.some((allowedUrl) => {
      const candidate = new URL(allowedUrl);
      return candidate.origin === requested.origin &&
        requested.pathname.startsWith(candidate.pathname);
    });
    return matched ? requested.toString() : appUrl;
  } catch {
    return appUrl;
  }
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw error;
    const user = data.users.find((item) => item.email === email);
    if (user) return user;
    if (data.users.length < 100) break;
  }
  return null;
}

async function getOrCreateUser(
  admin: ReturnType<typeof createClient>,
  profile: LineProfile,
) {
  const { data: existingProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('line_user_id', profile.sub)
    .maybeSingle();
  if (profileError) throw profileError;

  let user: User | null = null;
  if (existingProfile) {
    const { data, error } = await admin.auth.admin.getUserById(
      existingProfile.id,
    );
    if (error) throw error;
    user = data.user;
  }

  const lineHash = base64Url(await sha256(profile.sub)).slice(0, 40);
  const email = `line-${lineHash}@users.ccra.invalid`;

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        provider: 'line',
        line_user_id: profile.sub,
        display_name: profile.name ?? 'LINE 使用者',
        picture_url: profile.picture ?? null,
      },
    });

    if (error) {
      user = await findUserByEmail(admin, email);
      if (!user) throw error;
    } else {
      user = data.user;
    }
  }

  const { error: upsertError } = await admin.from('profiles').upsert({
    id: user.id,
    line_user_id: profile.sub,
    display_name: profile.name ?? 'LINE 使用者',
    picture_url: profile.picture ?? null,
  }, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  return { user, email: user.email ?? email };
}

async function startLogin(request: Request) {
  const channelId = getRequiredEnv('LINE_CHANNEL_ID');
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const url = new URL(request.url);
  const returnTo = safeReturnUrl(url.searchParams.get('return_to'));
  const state = randomValue();
  const nonce = randomValue();
  const verifier = randomValue(48);
  const challenge = base64Url(await sha256(verifier));
  const callbackUrl = `${supabaseUrl}/functions/v1/line-login/callback`;

  const authorizeUrl = new URL(LINE_AUTHORIZE_URL);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: callbackUrl,
    state,
    scope: 'openid profile',
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  return redirect(authorizeUrl.toString(), [
    cookie('ccra_line_state', state),
    cookie('ccra_line_nonce', nonce),
    cookie('ccra_line_verifier', verifier),
    cookie('ccra_line_return', returnTo),
  ]);
}

async function finishLogin(request: Request) {
  const channelId = getRequiredEnv('LINE_CHANNEL_ID');
  const channelSecret = getRequiredEnv('LINE_CHANNEL_SECRET');
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = new URL(request.url);
  const cookies = parseCookies(request);
  const returnTo = safeReturnUrl(cookies.get('ccra_line_return') ?? null);
  const clearCookies = [
    cookie('ccra_line_state', '', 0),
    cookie('ccra_line_nonce', '', 0),
    cookie('ccra_line_verifier', '', 0),
    cookie('ccra_line_return', '', 0),
  ];

  const error = url.searchParams.get('error');
  if (error) {
    const message = url.searchParams.get('error_description') ?? error;
    const target = new URL(returnTo);
    target.searchParams.set('line_error', message);
    return redirect(target.toString(), clearCookies);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookies.get('ccra_line_state');
  const nonce = cookies.get('ccra_line_nonce');
  const verifier = cookies.get('ccra_line_verifier');

  if (!code || !state || state !== expectedState || !nonce || !verifier) {
    throw new Error('LINE login state validation failed');
  }

  const callbackUrl = `${supabaseUrl}/functions/v1/line-login/callback`;
  const tokenResponse = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: channelId,
      client_secret: channelSecret,
      code_verifier: verifier,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`LINE token exchange failed: ${await tokenResponse.text()}`);
  }
  const tokens = await tokenResponse.json() as LineTokenResponse;

  const verifyResponse = await fetch(LINE_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: tokens.id_token,
      client_id: channelId,
      nonce,
    }),
  });
  if (!verifyResponse.ok) {
    throw new Error(`LINE ID token verification failed: ${await verifyResponse.text()}`);
  }
  const lineProfile = await verifyResponse.json() as LineProfile;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { email } = await getOrCreateUser(admin, lineProfile);
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
  if (linkError) throw linkError;

  const target = new URL(returnTo);
  target.searchParams.set(
    'line_token_hash',
    linkData.properties.hashed_token,
  );
  return redirect(target.toString(), clearCookies);
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/callback')) return await finishLogin(request);
    if (url.pathname.endsWith('/health')) {
      return Response.json({ ok: true, configured: Boolean(
        Deno.env.get('LINE_CHANNEL_ID') && Deno.env.get('LINE_CHANNEL_SECRET'),
      ) });
    }
    return await startLogin(request);
  } catch (error) {
    console.error(error);
    const appUrl = Deno.env.get('APP_URL');
    if (appUrl) {
      const target = new URL(appUrl);
      target.searchParams.set(
        'line_error',
        error instanceof Error ? error.message : 'LINE login failed',
      );
      return redirect(target.toString());
    }
    return Response.json({ error: 'LINE login failed' }, { status: 500 });
  }
});
