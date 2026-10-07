export function Badge({ children, className = '' }: any) {
  return <span className={`inline-block rounded bg-gold px-2 py-1 text-xs text-white ${className}`}>{children}</span>;
}
