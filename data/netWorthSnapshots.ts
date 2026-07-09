export type NetWorthSnapshot = {
  month: string; // ex: "2026-07"
  label: string; // ex: "Juil. 2026"
  value: number;
};

export const initialNetWorthSnapshots: NetWorthSnapshot[] = [
  {
    month: "2026-07",
    label: "Juil. 2026",
    value: 8526,
  },
];