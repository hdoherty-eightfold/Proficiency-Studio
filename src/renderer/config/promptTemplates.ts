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
    name: 'Detailed Assessment',
    description:
      'Comprehensive assessment with evidence, reasoning, and years of experience. Best for thorough evaluations.',
    recommended: false,
    outputFormat: 'detailed',
    template: `You are an expert at assessing professional skill proficiency levels.

For each skill, provide a comprehensive proficiency assessment.

Proficiency Scale:
{proficiency_levels}

CALIBRATION EXAMPLES — use these as your scoring anchors:
- "Microsoft Word" → Level 1 (Novice): knows the product name, has never opened it, zero applied experience
- "Microsoft Excel" → Level 3 (Intermediate): writes VLOOKUP/INDEX-MATCH, builds pivot tables and charts, works independently on reporting tasks
- "Python" → Level 4 (Advanced): designs reusable packages, writes async code and unit tests, reviews PRs, builds production data pipelines
- "Distributed Systems Design" → Level 5 (Expert): architects systems like Kafka/Kubernetes at scale, authors RFCs, mentors senior engineers, resolves production outages others cannot

For each skill, return:
{
  "skill_name": "exact skill name",
  "proficiency_level": "Intermediate (3)",
  "proficiency_numeric": 3,
  "confidence_score": 0.85,
  "evidence": ["point 1", "point 2", "point 3"],
  "reasoning": "detailed explanation"
}

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array
2. NO markdown code blocks (no \`\`\`json)
3. NO explanatory text before or after the JSON
4. Just the raw JSON array: [{"skill_name": "...", ...}, ...]

Skills to assess:
{skills}

JSON array:`,
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
