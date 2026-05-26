import Dexie, { type Table } from 'dexie';
import type { InventoryManifest, InventoryAuditEntry } from '../../types/inventory';
import type { AuditEntry, Case } from '../../types';
import type { PersistedIncident } from '../incidentPersistence';
import type { VesselRecord } from '../../types/location';

type ManifestRecord = InventoryManifest & { _key: string };
type SessionRecord = { key: string; value: unknown };
type AuditLogRecord = AuditEntry & { caseId: string };
type IncidentDraftRecord = PersistedIncident & { key: string };

class SentinelDB extends Dexie {
  manifests!: Table<ManifestRecord, string>;
  inventoryAudit!: Table<InventoryAuditEntry, string>;
  deploySession!: Table<SessionRecord, string>;
  // v2 — persistent incident data
  cases!: Table<Case, string>;
  auditLog!: Table<AuditLogRecord, string>;
  incidentDraft!: Table<IncidentDraftRecord, string>;
  // v3 — location (vessel) registry
  locations!: Table<VesselRecord, string>;

  constructor() {
    super('sentinel-v2');
    this.version(1).stores({
      manifests: '_key, vesselId, importedAt',
      inventoryAudit: 'id, timestamp, action, source',
      deploySession: 'key',
    });
    this.version(2).stores({
      manifests: '_key, vesselId, importedAt',
      inventoryAudit: 'id, timestamp, action, source',
      deploySession: 'key',
      cases: 'id, startedAt, resolved',
      auditLog: 'id, timestamp, mode, caseId',
      incidentDraft: 'key',
    });
    this.version(3).stores({
      manifests: '_key, vesselId, importedAt',
      inventoryAudit: 'id, timestamp, action, source',
      deploySession: 'key',
      cases: 'id, startedAt, resolved',
      auditLog: 'id, timestamp, mode, caseId',
      incidentDraft: 'key',
      locations: 'id, preset, lastUpdated, createdAt',
    });
  }
}

export const db = new SentinelDB();

const MANIFEST_KEY = 'active';

export async function saveManifest(manifest: InventoryManifest): Promise<void> {
  await db.manifests.put({ ...manifest, _key: MANIFEST_KEY });
}

export async function loadManifest(): Promise<InventoryManifest | null> {
  const rec = await db.manifests.get(MANIFEST_KEY);
  if (!rec) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _key, ...manifest } = rec;
  return manifest as InventoryManifest;
}

export async function clearManifest(): Promise<void> {
  await db.manifests.delete(MANIFEST_KEY);
}

export async function addInventoryAudit(entry: InventoryAuditEntry): Promise<void> {
  await db.inventoryAudit.put(entry);
}

export async function getRecentInventoryAudit(limit = 50): Promise<InventoryAuditEntry[]> {
  return db.inventoryAudit.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function saveSessionValue(key: string, value: unknown): Promise<void> {
  await db.deploySession.put({ key, value });
}

export async function loadSessionValue<T>(key: string): Promise<T | null> {
  const rec = await db.deploySession.get(key);
  return rec ? (rec.value as T) : null;
}

/** Generate a unique audit entry id. */
export function makeAuditId(): string {
  return `inv_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// === Incident case persistence ===

export async function saveCase(kase: Case): Promise<void> {
  await db.cases.put(kase);
}

export async function loadResolvedCases(): Promise<Case[]> {
  return db.cases.where('resolved').equals(1).sortBy('startedAt');
}

export async function loadAllCases(): Promise<Case[]> {
  return db.cases.orderBy('startedAt').toArray();
}

// === Audit log persistence ===

export async function appendAuditEntry(entry: AuditEntry, caseId: string): Promise<void> {
  await db.auditLog.put({ ...entry, caseId });
}

export async function loadAuditLog(caseId: string): Promise<AuditEntry[]> {
  const records = await db.auditLog.where('caseId').equals(caseId).sortBy('timestamp');
  return records.map(({ caseId: _cid, ...entry }) => entry as AuditEntry);
}

// === Active incident draft (replaces localStorage) ===

const DRAFT_KEY = 'active';

export async function saveIncidentDraft(draft: PersistedIncident): Promise<void> {
  await db.incidentDraft.put({ ...draft, key: DRAFT_KEY });
}

export async function loadIncidentDraft(caseId: string): Promise<PersistedIncident | null> {
  const rec = await db.incidentDraft.get(DRAFT_KEY);
  if (!rec || rec.caseId !== caseId) return null;
  const age = Date.now() - new Date(rec.savedAt).getTime();
  if (age > 6 * 3600_000) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key: _key, ...draft } = rec;
  return draft as PersistedIncident;
}

export async function clearIncidentDraft(): Promise<void> {
  await db.incidentDraft.delete(DRAFT_KEY);
}

// === Location (vessel) registry ===

export async function saveLocation(loc: VesselRecord): Promise<void> {
  await db.locations.put(loc);
}

export async function loadLocations(): Promise<VesselRecord[]> {
  return db.locations.orderBy('lastUpdated').reverse().toArray();
}

export async function deleteLocation(id: string): Promise<void> {
  await db.locations.delete(id);
}

export async function getLocation(id: string): Promise<VesselRecord | null> {
  return (await db.locations.get(id)) ?? null;
}
