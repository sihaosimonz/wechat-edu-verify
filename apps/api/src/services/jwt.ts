import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { generateKeyPairSync, createPublicKey } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * A simple key management system for signing and verifying JSON Web Tokens (JWTs).
 * We use RS256 with a rotating set of keys. Each key has a unique `kid` (key id)
 * which is included in the JWT header. The active key is used for signing new
 * tokens while previously generated keys remain available for verification until
 * retired. In production, keys should be persisted (e.g. in a database or KMS)
 * and loaded on startup. Here we keep them in memory for demonstration.
 */

export interface VerificationTokenPayload extends JwtPayload {
  sub: string; // user identifier
  email: string;
  openid: string;
  iss: string;
  aud: string;
  nbf: number;
  exp: number;
  jti: string;
}

interface SigningKey {
  kid: string;
  privateKey: string;
  publicKey: string;
  createdAt: number;
  retiring: boolean;
}

// In‑memory list of signing keys. Index 0 is the active key.
const signingKeys: SigningKey[] = [];

// In‑memory set of revoked token identifiers (jti). In production this should be a persistent store.
const revokedJtis = new Set<string>();

// Persist keys to a JSON file on disk. Keys are written synchronously to
// ensure durability across restarts. The file path resides in the api data
// directory; in production this could be a database or secret store.
const dataDir = path.join(__dirname, '../../data');
const keyFile = path.join(dataDir, 'jwks.json');

function persistKeysToFile() {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  // Write only minimal properties to file
  const serialisable = signingKeys.map(({ kid, privateKey, publicKey, createdAt, retiring }) => ({
    kid,
    privateKey,
    publicKey,
    createdAt,
    retiring
  }));
  fs.writeFileSync(keyFile, JSON.stringify(serialisable, null, 2), 'utf8');
}

function loadKeysFromFile() {
  try {
    if (fs.existsSync(keyFile)) {
      const content = fs.readFileSync(keyFile, 'utf8');
      const arr = JSON.parse(content);
      if (Array.isArray(arr) && arr.length > 0) {
        signingKeys.splice(0, signingKeys.length);
        for (const k of arr) {
          // Validate keys have the necessary properties
          if (k.kid && k.privateKey && k.publicKey) {
            signingKeys.push({ kid: k.kid, privateKey: k.privateKey, publicKey: k.publicKey, createdAt: k.createdAt, retiring: !!k.retiring });
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors reading keys; will generate new key on startup.
    console.error('Failed to load signing keys from file', e);
  }
}

// Initialise the key store with persisted keys or a fresh RSA key pair if
// none exist. This runs when the module is first imported. In production you
// should load keys from persistent storage instead of generating them on the fly.
function ensureKey() {
  if (signingKeys.length === 0) {
    // Attempt to load keys from file first
    loadKeysFromFile();
  }
  if (signingKeys.length === 0) {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    signingKeys.unshift({ kid: uuidv4(), privateKey, publicKey, createdAt: Date.now(), retiring: false });
    persistKeysToFile();
  }
}

ensureKey();

/**
 * Generate a new signing key and mark the current key as retiring. The new key
 * becomes active for signing new tokens. Old keys remain available for
 * verification but should be removed after a grace period. This function can
 * be called by a scheduled job (e.g. once a week) to rotate keys.
 */
export function rotateSigningKey() {
  // Mark current key as retiring
  if (signingKeys.length > 0) {
    signingKeys[0].retiring = true;
  }
  // Generate a new key pair
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  signingKeys.unshift({ kid: uuidv4(), privateKey, publicKey, createdAt: Date.now(), retiring: false });
  // Persist updated keys to file
  persistKeysToFile();
}

/**
 * Sign a verification token. Accepts user id, email and openid and returns
 * a JWT with a unique jti and the given expiry. Audience and issuer are fixed.
 */
export function issueVerificationToken(userId: string, email: string, openid: string, lifetimeSeconds: number): string {
  ensureKey();
  const now = Math.floor(Date.now() / 1000);
  const jti = uuidv4();
  const payload: VerificationTokenPayload = {
    sub: userId,
    email,
    openid,
    iss: 'verification.service',
    aud: 'miniapp:groups',
    nbf: now,
    exp: now + lifetimeSeconds,
    jti
  };
  // Use the active key (first element) for signing
  const activeKey = signingKeys[0];
  return jwt.sign(payload, activeKey.privateKey, {
    algorithm: 'RS256',
    keyid: activeKey.kid,
  });
}

/**
 * Verify a token, ensuring the expected audience and issuer match. Throws on failure.
 */
export function verifyToken(token: string, expectedAudience: string): VerificationTokenPayload {
  // Decode the header to determine which key to use
  const [encodedHeader] = token.split('.');
  if (!encodedHeader) {
    throw new Error('Invalid token');
  }
  const headerJson = Buffer.from(encodedHeader, 'base64').toString('utf8');
  let kid: string | undefined;
  try {
    const header = JSON.parse(headerJson);
    kid = header.kid;
  } catch (e) {
    throw new Error('Invalid token header');
  }
  // Find the signing key with the matching kid
  ensureKey();
  const key = signingKeys.find((k) => k.kid === kid);
  if (!key) {
    throw new Error('Unknown key id');
  }
  const payload = jwt.verify(token, key.publicKey, {
    algorithms: ['RS256'],
    audience: expectedAudience
  }) as VerificationTokenPayload;
  if (payload.iss !== 'verification.service') {
    throw new Error('Invalid issuer');
  }
  if (revokedJtis.has(payload.jti)) {
    throw new Error('Token revoked');
  }
  return payload;
}

/**
 * Revoke a token by its jti. Adds the jti to the revoked list.
 */
export function revokeToken(jti: string) {
  revokedJtis.add(jti);
}

/**
 * Return the current JSON Web Key Set (JWKS) for public verification. Includes
 * all active and retiring keys. This can be served at an endpoint such as
 * `/.well-known/jwks.json`. Each key includes the kid, kty, n, e and alg.
 */
export function getPublicJwks(): { keys: any[] } {
  ensureKey();
  const keys = signingKeys.map((k) => {
    const jwk = createPublicKey(k.publicKey).export({ format: 'jwk' }) as any;
    return {
      kid: k.kid,
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: 'RS256',
      use: 'sig'
    };
  });
  return { keys };
}