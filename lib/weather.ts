export type WeatherData = {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    hourly: {
        time: string;
        temperature: number;
        weatherCode: number;
    }[];
};

export async function getWeather(
    latitude = 50.6292,
    longitude = 3.0573,
): Promise<WeatherData> {
    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&hourly=temperature_2m,weather_code` +
        `&forecast_days=1`;

    const response = await fetch(url, {
        cache: "no-store",
    });

    const data = await response.json();

    const wantedHours = [
        "00:00",
        "02:00",
        "04:00",
        "06:00",
        "08:00",
        "10:00",
        "12:00",
        "14:00",
        "16:00",
        "18:00",
        "20:00",
        "22:00",
    ];

    const hourly = wantedHours.map((hour) => {
        const index = data.hourly.time.findIndex((t: string) =>
            t.endsWith(hour),
        );

        return {
            time: hour.substring(0, 2) + "h",
            temperature: data.hourly.temperature_2m[index],
            weatherCode: data.hourly.weather_code[index],
        };
    });

    return {
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        hourly,
    };
}
