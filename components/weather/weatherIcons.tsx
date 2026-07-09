import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from "lucide-react";

export function getWeatherIcon(code: number, size = 42) {
  if (code === 0) return <Sun size={size} className="text-yellow-400" />;

  if ([1, 2].includes(code))
    return <CloudSun size={size} className="text-yellow-400" />;

  if (code === 3)
    return <Cloud size={size} className="text-slate-300" />;

  if ([45, 48].includes(code))
    return <CloudFog size={size} className="text-slate-400" />;

  if (
    [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)
  )
    return <CloudRain size={size} className="text-blue-400" />;

  if ([71, 73, 75, 77, 85, 86].includes(code))
    return <CloudSnow size={size} className="text-cyan-300" />;

  if ([95, 96, 99].includes(code))
    return <CloudLightning size={size} className="text-yellow-300" />;

  return <Cloud size={size} />;
}