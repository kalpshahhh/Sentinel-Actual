import type { BodyRegion } from '../types';
import type { Answer } from '../data/protocols';
import { saveIncidentDraft, loadIncidentDraft as loadDraftFromDb, clearIncidentDraft } from './inventory/db';

export type PersistedIncident = {
  caseId: string;
  stage: string;
  regions: BodyRegion[];
  answers: Record<string, Answer>;
  answeredOrder: string[];
  extraInfo: string;
  medicNotified: boolean;
  upfrontEtaHours: number;
  evacConfirmed: boolean;
  helpInHours: number | null;
  startedAt: string;
  savedAt: string;
};

/** Persist active incident state to IndexedDB (fire-and-forget). */
export function saveIncidentState(state: Omit<PersistedIncident, 'savedAt'>): void {
  void saveIncidentDraft({ ...state, savedAt: new Date().toISOString() });
}

/**
 * Load the persisted draft for a given caseId (async).
 * Returns null if no matching draft or if it is older than 6 hours.
 */
export async function loadIncidentStateAsync(caseId: string): Promise<PersistedIncident | null> {
  return loadDraftFromDb(caseId);
}

/** Clear the active draft from IndexedDB. */
export function clearIncidentState(): void {
  void clearIncidentDraft();
}
