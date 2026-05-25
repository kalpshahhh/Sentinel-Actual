import Dexie, { type Table } from 'dexie';
import type { InventoryManifest, InventoryAuditEntry } from '../../types/inventory';

type ManifestRecord = InventoryManifest & { _key: string };
type SessionRecord = { key: string; value: unknown };

class SentinelDB extends Dexie {
  manifests!: Table<ManifestRecord, string>;
  inventoryAudit!: Table<InventoryAuditEntry, string>;
  deploySession!: Table<SessionRecord, string>;

  constructor() {
    super('sentinel-v2');
    this.version(1).stores({
      manifests: '_key, vesselId, importedAt',
      inventoryAudit: 'id, timestamp, action, source',
      deploySession: 'key',
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
