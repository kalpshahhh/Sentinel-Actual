/**
 * Hardware service layer — single import point for all physical device integrations.
 *
 * Architecture note:
 *   Browser tier  → hooks wrapped here, limited by Web API constraints
 *   Edge tier     → future local agent that extends these with OS-level access
 *   Cloud tier    → Handoff Mode SBAR note generation only (never Incident Mode)
 */
export * from './bluetooth';
export * from './nfc';
export * from './network';
