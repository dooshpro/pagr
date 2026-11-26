const ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGO = { name: 'ECDSA', hash: 'SHA-256' };
const enc = new TextEncoder();

function toB64u(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
} 

async function makeKeys() {
  const pair = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { secret: jwk.d, pub: `${jwk.x}.${jwk.y}` };
}

async function sign(secret, pub, message) {
  const [x, y] = pub.split('.');
  const key = await crypto.subtle.importKey(
    'jwk', { kty: 'EC', crv: 'P-256', x, y, d: secret, ext: true }, ALGO, false, ['sign']
  );
  const sig = await crypto.subtle.sign(SIGN_ALGO, key, enc.encode(message));
  return toB64u(sig); //raw r+s (64 bytes), not der
}

async function verify(pub, message, sig) {
  const [x, y] = pub.split('.');
  const key = await crypto.subtle.importKey(
    'jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, ALGO, false, ['verify']
  );
  return crypto.subtle.verify(SIGN_ALGO, key, fromB64u(sig), enc.encode(message));
}

function rememberSecret(slug, secret) {
  try {
    const all = JSON.parse(localStorage.getItem('pagr-keys') || '{}');
    all[slug] = secret;
    localStorage.setItem('pagr-keys', JSON.stringify(all));
  } catch (err) {
    console.error(err); //private mode etc.
  }
}

function getSecret(slug) {
  try {
    return JSON.parse(localStorage.getItem('pagr-keys') || '{}')[slug] || null;
  } catch (err) {
    return null;
  }
}