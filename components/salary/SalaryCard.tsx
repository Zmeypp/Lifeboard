"use client";

type SalaryCardProps = {
    salaryDay: number;
};

export default function SalaryCard({ salaryDay }: SalaryCardProps) {
    const today = new Date();

    let nextSalary = new Date(today.getFullYear(), today.getMonth(), salaryDay);

    if (today.getDate() > salaryDay) {
        nextSalary = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            salaryDay,
        );
    }

    const diff = Math.ceil(
        (nextSalary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return (
        <div className="flex h-full items-center justify-between">
            <div>
                <p className="text-sm text-slate-400">Prochain salaire</p>
                <p className="mt-2 text-4xl font-bold">{diff}</p>
                <p className="text-slate-400">jours</p>
            </div>

            <div className="text-right">
                <p className="text-sm text-slate-400">Date prévue</p>
                <p className="mt-2 text-2xl font-bold text-green-400">
                    {nextSalary.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                    })}
                </p>
            </div>
        </div>
    );
}
