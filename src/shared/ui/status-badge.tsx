const statusConfig = {
  done: { label: "done", className: "bg-green/10 text-green" },
  generating: { label: "generating", className: "bg-accent/15 text-accent" },
  draft: { label: "draft", className: "bg-text3/10 text-text3" },
  rejected: { label: "rejected", className: "bg-red/10 text-red" },
} as const;

interface StatusBadgeProps {
  status: keyof typeof statusConfig;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
