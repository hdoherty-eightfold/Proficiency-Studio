/**
 * Centralized Proficiency Level Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all proficiency level definitions,
 * colors, and helper functions. All components should import from here.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ProficiencyLevel {
  level: number;
  name: string;
  description: string;
  color?: string;
}

// =============================================================================
// DEFAULT PROFICIENCY LEVELS
// =============================================================================

/**
 * Standard 5-level proficiency scale used throughout the application.
 * Colors use Tailwind CSS `bg-*` classes for badge/pill rendering.
 */
export const DEFAULT_PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  {
    level: 1,
    name: 'Novice',
    description:
      'Awareness only — knows what the skill is but cannot apply it independently. Needs step-by-step guidance for every task.',
    color: 'bg-gray-500',
  },
  {
    level: 2,
    name: 'Developing',
    description:
      'Can complete basic, well-defined tasks with supervision. Makes common mistakes on unfamiliar inputs. Still building fundamentals.',
    color: 'bg-blue-500',
  },
  {
    level: 3,
    name: 'Intermediate',
    description:
      'Works independently on standard tasks. Solves routine problems without help; needs support only on complex or novel situations.',
    color: 'bg-yellow-500',
  },
  {
    level: 4,
    name: 'Advanced',
    description:
      'Solves complex problems independently. Improves existing processes, contributes best practices, and mentors others. Handles edge cases confidently.',
    color: 'bg-green-500',
  },
  {
    level: 5,
    name: 'Expert',
    description:
      'Recognized authority. Designs systems and standards that others adopt. Teaches widely, drives innovation, and resolves issues no one else can.',
    color: 'bg-purple-500',
  },
];

/**
 * Hex colors for proficiency levels, used in components that need raw color values
 * (e.g., SkillsTableEditor select borders, chart rendering).
 * Indices correspond to level numbers (index 0 = level 1).
 */
export const PROFICIENCY_HEX_COLORS: string[] = [
  '#ef4444', // Level 1 - Novice (red)
  '#f97316', // Level 2 - Developing (orange)
  '#eab308', // Level 3 - Intermediate (yellow)
  '#22c55e', // Level 4 - Advanced (green)
  '#3b82f6', // Level 5 - Expert (blue)
];

/**
 * Tailwind color classes cycle for dynamically added levels beyond the defaults.
 * Used when users add custom proficiency levels.
 */
export const PROFICIENCY_COLOR_CYCLE: string[] = [
  'bg-gray-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-red-500',
];

/**
 * Tailwind classes for proficiency badge display (text + background for light/dark mode).
 * Used in RunAssessment results display and similar contexts.
 */
export const PROFICIENCY_BADGE_CLASSES: Record<number, string> = {
  1: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300',
  2: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300',
  3: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300',
  4: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300',
  5: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300',
};

/**
 * Bar chart colors for analytics distribution charts.
 */
export const PROFICIENCY_CHART_COLORS: string[] = [
  'bg-red-400',
  'bg-orange-400',
  'bg-yellow-400',
  'bg-green-400',
  'bg-purple-500',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get proficiency level info by level number.
 */
export function getProficiencyLevel(
  level: number,
  levels: ProficiencyLevel[] = DEFAULT_PROFICIENCY_LEVELS
): ProficiencyLevel | undefined {
  return levels.find((p) => p.level === level);
}

/**
 * Get the display name for a proficiency level number.
 */
export function getProficiencyName(
  level: number,
  levels: ProficiencyLevel[] = DEFAULT_PROFICIENCY_LEVELS
): string {
  return getProficiencyLevel(level, levels)?.name || `Level ${level}`;
}

/**
 * Get all proficiency level names as an ordered array (index 0 = level 1).
 */
export function getProficiencyNames(
  levels: ProficiencyLevel[] = DEFAULT_PROFICIENCY_LEVELS
): string[] {
  return levels.sort((a, b) => a.level - b.level).map((l) => l.name);
}

/**
 * Get hex color for a proficiency level (for inline styles).
 * Falls back to gray if level is out of range.
 */
export function getProficiencyHexColor(level: number | undefined): string {
  if (level === undefined || level < 1 || level > PROFICIENCY_HEX_COLORS.length) {
    return '#9ca3af';
  }
  return PROFICIENCY_HEX_COLORS[level - 1];
}

/**
 * Get Tailwind badge classes for a proficiency level (for className usage).
 * Used in assessment results display.
 */
export function getProficiencyBadgeClasses(level: number): string {
  return PROFICIENCY_BADGE_CLASSES[level] || 'text-gray-600 bg-gray-100 dark:bg-gray-800';
}

/**
 * Get a color from the cycle for dynamically added proficiency levels.
 */
export function getColorForIndex(index: number): string {
  return PROFICIENCY_COLOR_CYCLE[index % PROFICIENCY_COLOR_CYCLE.length];
}

/**
 * Ensure all proficiency levels have a color assigned.
 * Useful when loading configurations that may be missing color data.
 */
export function ensureLevelsHaveColors(levels: ProficiencyLevel[]): ProficiencyLevel[] {
  return levels.map((level, idx) => ({
    ...level,
    color: level.color || getColorForIndex(idx),
  }));
}

/**
 * Get chart labels for proficiency distribution (e.g., "Novice (1)").
 */
export function getProficiencyChartLabels(
  levels: ProficiencyLevel[] = DEFAULT_PROFICIENCY_LEVELS
): string[] {
  return levels.sort((a, b) => a.level - b.level).map((l) => `${l.name} (${l.level})`);
}
