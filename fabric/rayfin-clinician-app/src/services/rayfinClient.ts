import { RayfinClient } from '@microsoft/rayfin-client';

import type { ClinicianAppSchema } from '../../rayfin/data/schema';

export interface RayfinClientConfig {
  baseUrl: string;
  publishableKey: string;
}

let client: RayfinClient<ClinicianAppSchema> | null = null;

export function initRayfinClient(
  config: RayfinClientConfig
): RayfinClient<ClinicianAppSchema> {
  if (client) {
    throw new Error('Rayfin client is already initialized.');
  }
  client = new RayfinClient<ClinicianAppSchema>({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
    authStorage: true,
  });
  return client;
}

export function getRayfinClient(): RayfinClient<ClinicianAppSchema> {
  if (!client) {
    throw new Error(
      'Rayfin client not initialized. Call bootstrapAuth() first.'
    );
  }
  return client;
}
