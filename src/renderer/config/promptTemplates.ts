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

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'simple',
    name: 'Simple Assessment',
    description: 'Quick assessment with just proficiency level (1-5) and confidence score. Best for fast, reliable results with local models.',
    recommended: true,
    outputFormat: 'simple',
    template: `You are an expert at assessing professional skill proficiency levels.

For each skill, provide a proficiency assessment with:
- proficiency_level: integer from 1-5 where:
  1 = Novice (0-6 months experience, needs supervision)
  2 = Developing (6mo-2yrs, works with guidance)
  3 = Intermediate (2-4yrs, works independently)
  4 = Advanced (4-7yrs, expert level, mentors others)
  5 = Expert (7+yrs, industry authority, thought leader)

- confidence_score: float 0.0-1.0 indicating your confidence in this assessment

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON array, nothing else
2. NO markdown code blocks, NO explanations, NO extra text
3. Array format: [{"skill_name": "Python", "proficiency_level": 3, "confidence_score": 0.85}, ...]

Skills to assess: {skills}

Return JSON array now:`
  },
  {
    id: 'detailed',
    name: 'Detailed Assessment',
    description: 'Comprehensive assessment with evidence, reasoning, and years of experience. Best for thorough evaluations.',
    recommended: false,
    outputFormat: 'detailed',
    template: `You are an expert at assessing professional skill proficiency levels.

For each skill, provide a comprehensive proficiency assessment.

Proficiency Scale:
1 = Novice: Entry-level, 0-6 months experience, requires close supervision
2 = Developing: Growing competence, 6mo-2yrs, works with general supervision
3 = Intermediate: Solid competence, 2-4yrs, works independently
4 = Advanced: Expert-level mastery, 4-7yrs, mentors others, strategic thinking
5 = Expert: Thought leader, 7+ years, industry authority, published works

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

Skills to assess: {skills}

JSON array:`
  }
];

export const getDefaultPrompt = (): PromptTemplate => {
  return promptTemplates.find(t => t.recommended) || promptTemplates[0];
};

export const getPromptById = (id: string): PromptTemplate | undefined => {
  return promptTemplates.find(t => t.id === id);
};
