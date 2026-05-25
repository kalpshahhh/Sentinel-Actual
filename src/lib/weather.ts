import type { GeoRegion } from '../types';

export type WeatherReading = {
  source: 'live' | 'demo' | 'unavailable';
  tempC: number | null;
  windKt: number | null;
  windDir: string | null;
  /** plain-English headline e.g. "Heavy seas · gusts 35kt · -3°C" */
  headline: string;
  /** sea state on Beaufort/practical scale 0-9, null when not derivable. */
  seaState: number | null;
  fetchedAt: number;
};

const DEG_TO_COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function degToCompass(deg: number): string {
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return DEG_TO_COMPASS[i];
}

/**
 * Live weather via Open-Meteo (no API key, free for non-commercial). We pull
 * just the surface fields we actually display so the request is sub-1KB. If
 * the network is dead the caller gets 'unavailable' and shows the cached or
 * fake value.
 */
export async function fetchLiveWeather(lat: number, lng: number, signal?: AbortSignal): Promise<WeatherReading> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=kn`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; wind_speed_10m?: number; wind_direction_10m?: number; weather_code?: number };
    };
    const c = data.current ?? {};
    const tempC = typeof c.temperature_2m === 'number' ? c.temperature_2m : null;
    const windKt = typeof c.wind_speed_10m === 'number' ? c.wind_speed_10m : null;
    const windDir = typeof c.wind_direction_10m === 'number' ? degToCompass(c.wind_direction_10m) : null;
    const seaState = windKt !== null ? Math.min(9, Math.round(windKt / 6)) : null;

    const parts: string[] = [];
    if (windKt !== null) parts.push(`${Math.round(windKt)}kt${windDir ? ' ' + windDir : ''}`);
    if (tempC !== null) parts.push(`${Math.round(tempC)}°C`);
    if (seaState !== null && seaState >= 5) parts.push('heavy seas');
    return {
      source: 'live',
      tempC,
      windKt,
      windDir,
      headline: parts.join(' · ') || 'clear',
      seaState,
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      source: 'unavailable',
      tempC: null,
      windKt: null,
      windDir: null,
      headline: 'weather unavailable',
      seaState: null,
      fetchedAt: Date.now(),
    };
  }
}

/**
 * Demo weather — region-flavored fake data so the onboarding screen never
 * looks empty when no network or no GPS is available.
 */
export function fakeWeatherForRegion(region: GeoRegion): WeatherReading {
  const profiles: Record<GeoRegion, Omit<WeatherReading, 'fetchedAt' | 'source'>> = {
    arctic_polar: { tempC: -22, windKt: 28, windDir: 'NW', headline: '28kt NW · -22°C · blowing snow', seaState: 5 },
    north_sea_offshore: { tempC: 4, windKt: 35, windDir: 'NNW', headline: '35kt NNW · 4°C · 6m swell', seaState: 6 },
    tropical: { tempC: 29, windKt: 14, windDir: 'E', headline: '14kt E · 29°C · scattered squalls', seaState: 2 },
    temperate_open_ocean: { tempC: 13, windKt: 20, windDir: 'W', headline: '20kt W · 13°C · 3m swell', seaState: 4 },
    remote_continental: { tempC: -5, windKt: 9, windDir: 'NE', headline: '9kt NE · -5°C · clear', seaState: 1 },
  };
  return { ...profiles[region], source: 'demo', fetchedAt: Date.now() };
}

/**
 * Demo GPS coords — region-anchored so the location card has plausible
 * coordinates when no real GPS is available.
 */
export function fakeCoordsForRegion(region: GeoRegion): { lat: number; lng: number } {
  return ({
    arctic_polar: { lat: 78.9230, lng: 11.9233 },           // Ny-Ålesund, Svalbard
    north_sea_offshore: { lat: 57.5829, lng: 1.4571 },      // Forties field, North Sea
    tropical: { lat: -8.4095, lng: 115.1889 },              // Bali offshore
    temperate_open_ocean: { lat: 36.7783, lng: -29.5435 },  // Mid-Atlantic
    remote_continental: { lat: 64.2008, lng: -149.4937 },   // Interior Alaska
  } as Record<GeoRegion, { lat: number; lng: number }>)[region];
}
