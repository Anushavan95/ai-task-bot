const navigationItems = [
  { label: "Overview", href: "#overview", icon: "◫", active: true },
  { label: "My tasks", href: "#tasks", icon: "✓", active: false },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white p-6 md:flex md:flex-col">
      <a href="#overview" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white"
        >
          T
        </span>
        <span>
          <span className="block font-bold">TaskFlow</span>
          <span className="block text-xs text-slate-500">Task management</span>
        </span>
      </a>

      <nav aria-label="Main navigation" className="mt-10 space-y-1.5">
        {navigationItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
              item.active
                ? "bg-indigo-50 font-semibold text-indigo-700"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/70 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
          ↗
        </span>
        <p className="mt-3 text-sm font-semibold">Telegram integration</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Create tasks directly from your Telegram bot.
        </p>
        <p className="mt-3 text-xs font-medium text-indigo-700">
          Capture work from text and voice messages.
        </p>
      </div>
    </aside>
  );
}
