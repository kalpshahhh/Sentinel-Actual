import { useEffect, useState } from 'react';

export type WeatherData = {
  tempC: number;
  condition: string;
  windKph: number;
  lat: number;
  lng: number;
};

const CACHE_KEY = 'sentinel-weather-v1';
const CACHE_TTL = 20 * 60_000; // 20 min

// WMO weather interpretation codes → short label
function codeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Heavy snow';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function loadCache(): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: WeatherData };
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

function saveCache(data: WeatherData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function useWeather(lat: number | null, lng: number | null): WeatherData | null {
  const [data, setData] = useState<WeatherData | null>(() => loadCache());

  useEffect(() => {
    if (!navigator.onLine || lat === null || lng === null) return;

    // Don't re-fetch if cache is fresh and for same approximate location
    const cached = loadCache();
    if (cached && Math.abs(cached.lat - lat) < 0.1 && Math.abs(cached.lng - lng) < 0.1) {
      setData(cached);
      return;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const c = json?.current;
        if (!c) return;
        const d: WeatherData = {
          tempC: Math.round(c.temperature_2m as number),
          condition: codeToCondition(c.weather_code as number),
          windKph: Math.round(c.wind_speed_10m as number),
          lat,
          lng,
        };
        setData(d);
        saveCache(d);
      })
      .catch(() => {});
  }, [lat, lng]);

  return data;
}
