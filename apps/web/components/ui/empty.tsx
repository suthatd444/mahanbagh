export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
