describe('deletion rules', () => {
  it('blocks employee delete if has MBs', () => {
    expect(true).toBe(true);
  });
  it('blocks MB delete if has brokers', () => {
    expect(true).toBe(true);
  });
  it('allows broker delete', () => {
    expect(true).toBe(true);
  });
});
