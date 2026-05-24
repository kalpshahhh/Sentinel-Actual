import { useEffect, useState } from 'react';

export type GeoState = {
  status: 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported' | 'error';
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  lastUpdated: number | null;
  error?: string;
};

const initial: GeoState = {
  status: 'idle',
  lat: null,
  lng: null,
  accuracyMeters: null,
  lastUpdated: null,
};

/**
 * Reads the real device GPS via the Geolocation API. Works on iOS Safari,
 * Android Chrome, and all desktop browsers. Requires HTTPS (or localhost).
 * No network needed — the OS handles the GPS lookup.
 */
export function useGeolocation(): GeoState & { refresh: () => void } {
  const [state, setState] = useState<GeoState>(initial);

  const refresh = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({ ...initial, status: 'unsupported' });
      return;
    }
    setState((s) => ({ ...s, status: 'pending' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          lastUpdated: Date.now(),
        });
      },
      (err) => {
        setState({
          ...initial,
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error',
          error: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  useEffect(() => {
    refresh();
    // re-poll every 5 min
    const id = setInterval(refresh, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return { ...state, refresh };
}
