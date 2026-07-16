type ProgressBarProps = {
    value: number;
    color: string;
};

export default function ProgressBar({ value, color }: ProgressBarProps) {
    return (
        <div className="mt-3 h-1.5 rounded-full bg-white/10">
            <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
