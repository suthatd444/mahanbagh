import { createHmac, timingSafeEqual } from 'crypto';

const REFERRAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createEmployeeReferralToken(employeeId: string) {
  const payload = Buffer.from(
    JSON.stringify({ employeeId, expiresAt: Date.now() + REFERRAL_TTL_MS }),
  ).toString('base64url');
  const signature = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `employee.${payload}.${signature}`;
}

export function verifyEmployeeReferralToken(token: string): string | null {
  const [type, payload, signature] = token.split('.');
  if (type !== 'employee' || !payload || !signature) return null;
  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const { employeeId, expiresAt } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof employeeId === 'string' && typeof expiresAt === 'number' && expiresAt > Date.now()
      ? employeeId
      : null;
  } catch {
    return null;
  }
}

function getSecret() {
  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
  return process.env.SESSION_SECRET;
}
