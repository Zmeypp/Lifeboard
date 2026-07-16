export type AppSettings = {
    firstName: string;
    weatherCity: string;
    weatherLatitude: number;
    weatherLongitude: number;
    salaryDay: number;
    budgetResetDay: number;
    livretASafetyAmount: number;
    theme: "dark";
};

export const initialSettings: AppSettings = {
    firstName: "Lucas",
    weatherCity: "Lille",
    weatherLatitude: 50.6292,
    weatherLongitude: 3.0573,
    salaryDay: 27,
    budgetResetDay: 28,
    livretASafetyAmount: 8000,
    theme: "dark",
};
