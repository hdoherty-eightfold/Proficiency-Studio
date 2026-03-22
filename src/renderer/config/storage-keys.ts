/**
 * Centralized localStorage Key Constants
 *
 * Single source of truth for all localStorage key names used in the application.
 * Import from here instead of hardcoding key strings in components.
 *
 * NOTE: Not all usage sites have been updated yet. When touching a component
 * that uses localStorage, prefer importing from this file.
 */
export const STORAGE_KEYS = {
  // Integration / CSV upload
  INTEGRATION_TYPE: 'profstudio_integration_type',
  CSV_FILENAME: 'profstudio_csv_filename',
  CSV_FILE_ID: 'profstudio_csv_file_id',
  CSV_CONTENT: 'profstudio_csv_content',

  // Skills
  EXTRACTED_SKILLS: 'extractedSkills',
  SKILLS_EXTRACTION_DATA: 'skillsExtractionData',
  PROFSTUDIO_EXTRACTED_SKILLS: 'profstudio_extracted_skills',

  // Proficiency
  PROFICIENCY_CONFIG: 'profstudio_proficiency_config',

  // Assessment
  ASSESSMENT_RESULTS: 'assessmentResults',

  // Environment
  ENV_ID: 'profstudio_env_id',
  ENV_NAME: 'profstudio_env_name',

  // Auth
  AUTH_TOKEN: 'profstudio_auth_token',

  // API Keys
  LLM_API_KEYS: 'llm_api_keys',
  LLM_LAST_SELECTED_KEY: 'llm_last_selected_key',

  // Settings
  APP_SETTINGS_GENERAL: 'app_settings_general',

  // RAG
  RAG_ENABLED: 'profstudio_rag_enabled',
  RAG_DOCUMENTS: 'profstudio_rag_documents',

  // Debug
  DEBUG: 'debug',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
