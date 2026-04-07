/**
 * API Service
 * Main API service for making requests to the backend.
 * Routes through Electron IPC in desktop app.
 *
 * Split into domain modules for maintainability:
 *   api-core.ts       — retry, deduplication, base CRUD
 *   api-skills.ts     — skills, SFTP, data quality, field mapping
 *   api-assessment.ts — proficiency, history, analytics, export
 *   api-config.ts     — environments, roles, LLM, configurations, RAG
 */

import { ApiWithConfig } from './api-config';
export { API_VERSION } from './api-core';
export type { ApiResponse } from './api-core';

class APIService extends ApiWithConfig {}

export const api = new APIService();
