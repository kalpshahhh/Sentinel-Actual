import type { Vessel, InventoryPreset } from '../types';

export const OFFSHORE_VESSEL: Vessel = {
  name: 'MV NORTHERN STAR',
  type: 'Offshore Supply Vessel',
  flag: 'UK',
  crew: 12,
  lat: 57.1,
  lng: 2.0,
  etaToShoreHours: 14,
  weatherCondition: 'Sea state 4, swell 2.5m',
};

export const POLAR_STATION: Vessel = {
  name: 'HALLEY VI',
  type: 'Antarctic Research Station',
  flag: 'British Antarctic Survey',
  crew: 16,
  lat: -75.6,
  lng: -26.5,
  etaToShoreHours: 168,
  weatherCondition: '-38°C, wind 45kt',
};

export function getVesselForPreset(preset: InventoryPreset): Vessel {
  return preset === 'polar' ? POLAR_STATION : OFFSHORE_VESSEL;
}
