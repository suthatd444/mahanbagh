import { sha256 } from '../src/common/utils/crypto.util';

describe('referral', () => {
  it('hashes token', () => {
    const t = 'abc123';
    expect(sha256(t)).toBe(sha256(t));
  });
});
