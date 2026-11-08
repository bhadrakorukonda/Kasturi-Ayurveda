import crypto from 'crypto';

// Patient access tokens are random and high-entropy, so a fast one-way
// hash (SHA-256) is sufficient here — bcrypt's slow hashing exists to
// resist brute-forcing low-entropy secrets like passwords, which doesn't
// apply to a 256-bit random token.
export const generatePatientAccessToken = (): { token: string; hash: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

// Constant-time compare so a mistyped/guessed token can't be distinguished
// from a correct-length-wrong-value one by response timing.
export const verifyPatientAccessToken = (token: string, storedHash: string): boolean => {
  const candidateHash = crypto.createHash('sha256').update(token).digest();
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (candidateHash.length !== storedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateHash, storedHashBuffer);
};

// Check a token against the original hash and every extra one minted for
// later emails. Every hash is compared (no early exit) to keep timing flat.
export const verifyAnyPatientAccessToken = (token: string, hashes: string[]): boolean =>
  hashes.reduce((matched, hash) => verifyPatientAccessToken(token, hash) || matched, false);

// Only the last N extra tokens stay valid; enough for a confirmation,
// a reminder, and a few retries/Meet-link emails.
export const MAX_ADDITIONAL_TOKENS = 10;
