import {
  LayoutDashboard,
  Wallet,
  ListChecks,
  Target,
  BarChart3,
  Settings,
  Utensils,
  CalendarDays
} from "lucide-react";
import type { Page } from "./DashboardLayout";
import AnimatedButton from "@/components/ui/AnimatedButton";

type SidebarProps = {
  activePage: Page;
  onChangePage: (page: Page) => void;
};

const menu = [
  { id: "overview", label: "Aperçu", icon: LayoutDashboard },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "operations", label: "Opérations", icon: ListChecks },
  { id: "objectives", label: "Objectifs", icon: Target },
  { id: "statistics", label: "Statistiques", icon: BarChart3 },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "today-meal", label: "Repas", icon: Utensils, },
  { id: "week-meals", label: "Semaine", icon: CalendarDays, },
] as const;

export default function Sidebar({ activePage, onChangePage }: SidebarProps) {
  return (
    <aside className="w-32 rounded-2xl border border-white/10 bg-[#0b1623] p-4">
      <div className="mb-8 text-center text-xl font-bold text-purple-400">LB</div>

      <nav className="space-y-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <AnimatedButton
  key={item.id}
  onClick={() => onChangePage(item.id)}
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.94 }}
  transition={{ type: "spring", stiffness: 420, damping: 24 }}
  className={`flex w-full flex-col items-center gap-2 rounded-xl p-3 text-sm transition-colors ${
    isActive
      ? "bg-purple-500/20 text-purple-300"
      : "text-slate-300 hover:bg-white/5"
  }`}
>
  <Icon size={24} />
  <span>{item.label}</span>
</AnimatedButton>
          );
        })}
      </nav>
    </aside>
  );
}