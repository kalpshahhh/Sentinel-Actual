import type { CapabilityProfile, Equipment, InventoryPreset, Scenario, Vessel } from '../types';
import { callClaude } from './anthropic';
import { PROTOCOL_COMPILATION_PROMPT } from './prompts';
import { VALID_CITATION_IDS } from '../data/citations';
import { getFallbackScenarios } from '../data/protocols';

export type CompileResult = {
  scenarios: Scenario[];
  source: 'llm' | 'fallback';
  error?: string;
};

/**
 * Runs the LLM protocol compilation for a vessel profile.
 * Falls back to static scenarios if the API is unavailable.
 * Safe to call in a background (fire-and-forget) context.
 */
export async function compileProtocols(
  vessel: Vessel,
  inventory: Equipment[],
  capabilityProfile: CapabilityProfile | null,
  preset: InventoryPreset,
  signal?: AbortSignal
): Promise<CompileResult> {
  const payload = {
    vessel,
    capabilityProfile: capabilityProfile ?? undefined,
    inventory: inventory.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      dose: e.dose,
      unit: e.unit,
      capabilities: e.capabilities,
      quantityOnboard: e.quantityOnboard,
    })),
    validCitationIds: VALID_CITATION_IDS,
    maxScenarios: 15,
  };

  try {
    if (signal?.aborted) throw new Error('Aborted');
    const result = await callClaude<{ scenarios: Scenario[] }>(PROTOCOL_COMPILATION_PROMPT, payload, 6144);
    if (!result?.scenarios || !Array.isArray(result.scenarios) || result.scenarios.length === 0) {
      throw new Error('LLM returned no scenarios');
    }
    const cleaned = result.scenarios.map((s) => ({
      ...s,
      citationIds: (s.citationIds ?? []).filter((id) => VALID_CITATION_IDS.includes(id)),
      treatment: s.treatment.map((t) => ({
        ...t,
        citationIds: (t.citationIds ?? []).filter((id) => VALID_CITATION_IDS.includes(id)),
      })),
    }));
    return { scenarios: cleaned, source: 'llm' };
  } catch (err) {
    const fallback = getFallbackScenarios(preset);
    return { scenarios: fallback, source: 'fallback', error: (err as Error).message };
  }
}
