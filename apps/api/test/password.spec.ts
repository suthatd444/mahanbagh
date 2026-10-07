import { passwordSchema } from '@mohan-bagh/shared';

describe('password policy', () => {
  it('validates strong password', () => {
    expect(passwordSchema.safeParse('Abcd@123').success).toBe(true);
  });
  it('rejects weak password', () => {
    expect(passwordSchema.safeParse('abcd1234').success).toBe(false);
  });
});
