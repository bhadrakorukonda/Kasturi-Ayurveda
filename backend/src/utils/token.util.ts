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
