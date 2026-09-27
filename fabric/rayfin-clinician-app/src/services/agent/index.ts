import type { AgentService } from './types';

export type {
  AgentAnswer,
  AgentCitation,
  AgentMode,
  AgentService,
  AgentStatus,
  AgentTable,
  AskOptions,
} from './types';

let service: AgentService | null = null;

/** Install the agent backend. Called once by `bootstrapApp()`. */
export function setAgentService(next: AgentService): void {
  service = next;
}

export function getAgentService(): AgentService {
  if (!service) {
    throw new Error('Agent service not initialised. Call bootstrapApp() first.');
  }
  return service;
}
