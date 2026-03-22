import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFICIENCY_LEVELS,
  PROFICIENCY_HEX_COLORS,
  PROFICIENCY_COLOR_CYCLE,
  PROFICIENCY_BADGE_CLASSES,
  PROFICIENCY_CHART_COLORS,
  getProficiencyLevel,
  getProficiencyName,
  getProficiencyNames,
  getProficiencyHexColor,
  getProficiencyBadgeClasses,
  getColorForIndex,
  ensureLevelsHaveColors,
  getProficiencyChartLabels,
  ProficiencyLevel,
} from './proficiency';

describe('DEFAULT_PROFICIENCY_LEVELS', () => {
  it('has exactly 5 levels', () => {
    expect(DEFAULT_PROFICIENCY_LEVELS).toHaveLength(5);
  });

  it('has levels numbered 1 through 5', () => {
    const levelNumbers = DEFAULT_PROFICIENCY_LEVELS.map(l => l.level);
    expect(levelNumbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('has the correct names in order', () => {
    const names = DEFAULT_PROFICIENCY_LEVELS.map(l => l.name);
    expect(names).toEqual(['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert']);
  });

  it('has Tailwind bg-* color classes on every level', () => {
    for (const level of DEFAULT_PROFICIENCY_LEVELS) {
      expect(level.color).toMatch(/^bg-\w+-\d+$/);
    }
  });

  it('has a non-empty description on every level', () => {
    for (const level of DEFAULT_PROFICIENCY_LEVELS) {
      expect(level.description.length).toBeGreaterThan(0);
    }
  });
});

describe('PROFICIENCY_HEX_COLORS', () => {
  it('has exactly 5 colors', () => {
    expect(PROFICIENCY_HEX_COLORS).toHaveLength(5);
  });

  it('contains valid hex color strings', () => {
    for (const color of PROFICIENCY_HEX_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('PROFICIENCY_COLOR_CYCLE', () => {
  it('has 10 entries', () => {
    expect(PROFICIENCY_COLOR_CYCLE).toHaveLength(10);
  });

  it('contains Tailwind bg-* classes', () => {
    for (const cls of PROFICIENCY_COLOR_CYCLE) {
      expect(cls).toMatch(/^bg-\w+-\d+$/);
    }
  });
});

describe('PROFICIENCY_BADGE_CLASSES', () => {
  it('has entries for levels 1 through 5', () => {
    expect(Object.keys(PROFICIENCY_BADGE_CLASSES).sort()).toEqual(['1', '2', '3', '4', '5']);
  });

  it('each value contains text and bg classes', () => {
    for (const classes of Object.values(PROFICIENCY_BADGE_CLASSES)) {
      expect(classes).toContain('text-');
      expect(classes).toContain('bg-');
    }
  });
});

describe('PROFICIENCY_CHART_COLORS', () => {
  it('has exactly 5 colors', () => {
    expect(PROFICIENCY_CHART_COLORS).toHaveLength(5);
  });
});

describe('getProficiencyLevel', () => {
  it('returns the correct level for valid inputs', () => {
    const level = getProficiencyLevel(3);
    expect(level).toBeDefined();
    expect(level!.name).toBe('Intermediate');
    expect(level!.level).toBe(3);
  });

  it('returns undefined for a non-existent level', () => {
    expect(getProficiencyLevel(0)).toBeUndefined();
    expect(getProficiencyLevel(6)).toBeUndefined();
    expect(getProficiencyLevel(-1)).toBeUndefined();
  });

  it('works with custom levels array', () => {
    const custom: ProficiencyLevel[] = [
      { level: 10, name: 'Custom', description: 'A custom level' },
    ];
    expect(getProficiencyLevel(10, custom)?.name).toBe('Custom');
    expect(getProficiencyLevel(1, custom)).toBeUndefined();
  });
});

describe('getProficiencyName', () => {
  it('returns the name for valid levels', () => {
    expect(getProficiencyName(1)).toBe('Novice');
    expect(getProficiencyName(5)).toBe('Expert');
  });

  it('returns a fallback string for invalid levels', () => {
    expect(getProficiencyName(0)).toBe('Level 0');
    expect(getProficiencyName(99)).toBe('Level 99');
  });
});

describe('getProficiencyNames', () => {
  it('returns all 5 default names in order', () => {
    const names = getProficiencyNames();
    expect(names).toEqual(['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert']);
  });

  it('sorts custom levels by level number', () => {
    const custom: ProficiencyLevel[] = [
      { level: 3, name: 'C', description: '' },
      { level: 1, name: 'A', description: '' },
      { level: 2, name: 'B', description: '' },
    ];
    expect(getProficiencyNames(custom)).toEqual(['A', 'B', 'C']);
  });
});

describe('getProficiencyHexColor', () => {
  it('returns correct hex color for valid levels', () => {
    expect(getProficiencyHexColor(1)).toBe('#ef4444');
    expect(getProficiencyHexColor(5)).toBe('#3b82f6');
  });

  it('returns fallback gray for undefined', () => {
    expect(getProficiencyHexColor(undefined)).toBe('#9ca3af');
  });

  it('returns fallback gray for out-of-range levels', () => {
    expect(getProficiencyHexColor(0)).toBe('#9ca3af');
    expect(getProficiencyHexColor(-1)).toBe('#9ca3af');
    expect(getProficiencyHexColor(6)).toBe('#9ca3af');
  });
});

describe('getProficiencyBadgeClasses', () => {
  it('returns correct classes for valid levels', () => {
    const result = getProficiencyBadgeClasses(1);
    expect(result).toContain('text-gray-600');
    expect(result).toContain('bg-gray-100');
  });

  it('returns fallback classes for unknown levels', () => {
    const result = getProficiencyBadgeClasses(99);
    expect(result).toBe('text-gray-600 bg-gray-100 dark:bg-gray-800');
  });
});

describe('getColorForIndex', () => {
  it('returns the correct color for indices within range', () => {
    expect(getColorForIndex(0)).toBe('bg-gray-500');
    expect(getColorForIndex(9)).toBe('bg-red-500');
  });

  it('wraps around when index exceeds array length', () => {
    expect(getColorForIndex(10)).toBe(getColorForIndex(0));
    expect(getColorForIndex(11)).toBe(getColorForIndex(1));
    expect(getColorForIndex(25)).toBe(getColorForIndex(5));
  });
});

describe('ensureLevelsHaveColors', () => {
  it('preserves existing colors', () => {
    const levels: ProficiencyLevel[] = [
      { level: 1, name: 'A', description: '', color: 'bg-red-500' },
    ];
    const result = ensureLevelsHaveColors(levels);
    expect(result[0].color).toBe('bg-red-500');
  });

  it('adds colors to levels without them', () => {
    const levels: ProficiencyLevel[] = [
      { level: 1, name: 'A', description: '' },
      { level: 2, name: 'B', description: '' },
    ];
    const result = ensureLevelsHaveColors(levels);
    expect(result[0].color).toBe('bg-gray-500');
    expect(result[1].color).toBe('bg-blue-500');
  });

  it('does not mutate the original array', () => {
    const levels: ProficiencyLevel[] = [
      { level: 1, name: 'A', description: '' },
    ];
    ensureLevelsHaveColors(levels);
    expect(levels[0].color).toBeUndefined();
  });
});

describe('getProficiencyChartLabels', () => {
  it('returns labels in "Name (level)" format', () => {
    const labels = getProficiencyChartLabels();
    expect(labels).toEqual([
      'Novice (1)',
      'Developing (2)',
      'Intermediate (3)',
      'Advanced (4)',
      'Expert (5)',
    ]);
  });

  it('sorts by level number', () => {
    const custom: ProficiencyLevel[] = [
      { level: 2, name: 'Second', description: '' },
      { level: 1, name: 'First', description: '' },
    ];
    expect(getProficiencyChartLabels(custom)).toEqual(['First (1)', 'Second (2)']);
  });
});
