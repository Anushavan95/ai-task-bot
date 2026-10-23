type StatsCardsProps = {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
};

const statCards = [
  {
    key: "total",
    label: "Total tasks",
    valueColor: "text-slate-900",
    accent: "bg-indigo-500",
    icon: "◫",
  },
  {
    key: "pending",
    label: "Pending",
    valueColor: "text-amber-600",
    accent: "bg-amber-400",
    icon: "◷",
  },
  {
    key: "inProgress",
    label: "In progress",
    valueColor: "text-blue-600",
    accent: "bg-blue-500",
    icon: "↗",
  },
  {
    key: "completed",
    label: "Completed",
    valueColor: "text-emerald-600",
    accent: "bg-emerald-500",
    icon: "✓",
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <section
      aria-label="Task statistics"
      className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4"
    >
      {statCards.map((card) => (
        <article
          key={card.key}
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-1 ${card.accent}`}
          />
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-medium text-slate-500">{card.label}</h2>
              <p className={`mt-3 text-3xl font-bold tracking-tight ${card.valueColor}`}>
                {stats[card.key]}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg text-slate-500"
            >
              {card.icon}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
