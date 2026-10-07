import { formatCode } from '../src/common/utils/code.util';
import { sha256 } from '../src/common/utils/crypto.util';

describe('utils', () => {
  it('generates codes', () => {
    expect(formatCode('EMP', 1)).toBe('EMP-000001');
    expect(formatCode('MB', 1)).toBe('MB-000001');
    expect(formatCode('BRK', 1)).toBe('BRK-000001');
  });

  it('sha256', () => {
    expect(sha256('test')).toBeTruthy();
  });
});
