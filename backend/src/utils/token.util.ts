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
