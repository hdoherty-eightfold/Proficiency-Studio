/**
 * Prompt Template Library for Proficiency Assessments
 *
 * Each template defines how the LLM should assess skills and what format to return.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  outputFormat: 'simple' | 'detailed';
  recommended: boolean;
}

/**
 * Controls what the LLM is asked to return alongside the proficiency level.
 * - 'basic'      → proficiency level only (fastest, no explanations)
 * - 'confidence' → proficiency + confidence score (default, shows AI certainty)
 * - 'full'       → proficiency + confidence + reasoning (most detail)
 */
export type ConfidenceMode = 'basic' | 'confidence' | 'full';

/** Maps a ConfidenceMode to the corresponding template id */
export const CONFIDENCE_MODE_TO_TEMPLATE_ID: Record<ConfidenceMode, string> = {
  basic: 'basic',
  confidence: 'simple',
  full: 'detailed',
};

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'basic',
    name: 'Basic Assessment',
    description:
      'Returns only proficiency level (1–5). Fastest — no confidence scores or explanations.',
    recommended: false,
    outputFormat: 'simple',
    template: `You are an expert at assessing professional skill proficiency levels.

For each skill, provide a proficiency level using this scale:
{proficiency_levels}

CALIBRATION EXAMPLES — use these as your scoring anchors:
- "Microsoft Word" → Level 1: someone who only knows the product name, has never opened it
- "Microsoft Excel" → Level 3: independently writes formulas, builds pivot tables, creates reports without help
- "Python" → Level 4: designs reusable libraries, writes data pipelines, reviews others' code confidently
- "Distributed Systems Design" → Level 5: architects large-scale distributed systems, publishes best practices, mentors engineering teams

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON array, nothing else
2. NO markdown code blocks, NO explanations, NO extra text
3. Array format: [{"skill_name": "Python", "proficiency_level": 3}, ...]

Skills to assess:
{skills}

Return JSON array now:`,
  },
  {
    id: 'simple',
    name: 'Simple Assessment',
    description:
      'Quick assessment with just proficiency level (1-5) and confidence score. Best for fast, reliable results with local models.',
    recommended: true,
    outputFormat: 'simple',
    template: `You are an expert at assessing professional skill proficiency levels.

For each skill, provide:
- proficiency_level: integer 1–5 matching the scale below
- confidence_score: float 0.0–1.0 indicating your confidence in this assessment

Proficiency scale:
{proficiency_levels}

CALIBRATION EXAMPLES — use these as your scoring anchors:
- "Microsoft Word" → Level 1 (Novice, confidence 0.95): person only knows the product name, has never opened it
- "Microsoft Excel" → Level 3 (Intermediate, confidence 0.85): independently writes formulas, builds pivot tables, creates reports
- "Python" → Level 4 (Advanced, confidence 0.88): designs reusable libraries, builds data pipelines, reviews others' code
- "Distributed Systems Design" → Level 5 (Expert, confidence 0.90): architects large-scale systems, publishes best practices, mentors teams

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON array, nothing else
2. NO markdown code blocks, NO explanations, NO extra text
3. Array format: [{"skill_name": "Python", "proficiency_level": 3, "confidence_score": 0.85}, ...]

Skills to assess:
{skills}

Return JSON array now:`,
  },
  {
    id: 'detailed',
    name: 'Full Detail Assessment',
    description:
      'Comprehensive assessment with reasoning and evidence anchored to real learning milestones. Best for thorough workforce evaluations.',
    recommended: false,
    outputFormat: 'detailed',
    template: `You are a senior talent assessment expert evaluating a skills list for workforce planning. For each skill, assign the proficiency level that a COMPETENT PROFESSIONAL in this domain is typically expected to demonstrate in a workplace setting — not a raw beginner, not a world-class expert, but a solid practitioner doing real work.

Proficiency Scale:
{proficiency_levels}

Example output for a single skill (do NOT include this in your response):
{
  "skill_name": "SQL",
  "proficiency_level": "Intermediate (3)",
  "proficiency_numeric": 3,
  "confidence_score": 0.9,
  "evidence": [
    "Standard SELECT/JOIN/aggregation mastery reached within 6–12 months of regular use",
    "Advanced window functions and query optimization typically take 1–3 years of production experience"
  ],
  "reasoning": "SQL has well-defined learning milestones and a clear ceiling. A competent practitioner writes complex queries and optimizes performance independently within 1–2 years. Expert-level SQL (query planner internals, storage engine design) is rare and not typically expected of practitioners."
}

Skills to assess:
{skills}

For each skill consider:
(a) how long it typically takes to reach working competency
(b) how specialized the advanced knowledge is — does a normal practitioner ever need it?
(c) how this skill's learning curve compares to the others in this list

Return ONLY a raw JSON array — no markdown, no commentary, no code fences:
[
  {
    "skill_name": "exact name from list above",
    "proficiency_level": "LevelName (N)",
    "proficiency_numeric": <integer 1-5>,
    "confidence_score": <float 0.0-1.0, reflecting how well-profiled this skill is in industry>,
    "evidence": [
      "<specific milestone, timeframe, or industry norm>",
      "<comparison to related skills or typical practitioner expectations>"
    ],
    "reasoning": "<2-3 sentences on learning curve and why this level fits a competent practitioner>"
  }
]`,
  },
];

export const getDefaultPrompt = (): PromptTemplate => {
  return promptTemplates.find((t) => t.recommended) || promptTemplates[0];
};

export const getPromptById = (id: string): PromptTemplate | undefined => {
  return promptTemplates.find((t) => t.id === id);
};

/**
 * Interpolate a prompt template, replacing `{variable}` placeholders with
 * values from the provided map.
 *
 * Example:
 *   interpolateTemplate(template.template, { skills: 'Python, TypeScript' })
 *   // "... Skills to assess: Python, TypeScript ..."
 */
export const interpolateTemplate = (
  template: string,
  variables: Record<string, string>
): string => {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
};
