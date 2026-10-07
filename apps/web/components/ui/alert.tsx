export function Alert({ children, className = '' }: any) {
  return <div className={`rounded border p-3 ${className}`}>{children}</div>;
}
