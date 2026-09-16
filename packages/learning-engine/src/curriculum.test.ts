import { describe, it, expect } from 'vitest';
import {
  CURRICULUM_LEVELS,
  SKILL_DEFINITIONS,
  getAllCurriculumLevels,
  getAllSkills,
  getCurriculumLevel,
  getCurriculumLevelByNumber,
  getSkillDefinition,
  getSkillsForLevel,
  type Skill,
} from './curriculum';

describe('Curriculum Data and Models', () => {
  it('defines exactly seven curriculum levels', () => {
    expect(CURRICULUM_LEVELS).toHaveLength(7);
    expect(getAllCurriculumLevels()).toHaveLength(7);

    CURRICULUM_LEVELS.forEach((level, index) => {
      expect(level.levelNumber).toBe(index + 1);
      expect(level.id).toBe(`level_${index + 1}`);
      expect(level.name.trim().length).toBeGreaterThan(0);
      expect(level.goal.trim().length).toBeGreaterThan(0);
      expect(level.skills.length).toBeGreaterThan(0);
      expect(level.examples.length).toBeGreaterThan(0);
    });
  });

  it('provides examples for each skill definition', () => {
    const allSkills = getAllSkills();
    expect(allSkills.length).toBeGreaterThanOrEqual(7);

    for (const skill of allSkills) {
      expect(skill.id).toBeDefined();
      expect(skill.name.trim().length).toBeGreaterThan(0);
      expect(skill.description.trim().length).toBeGreaterThan(0);
      expect(skill.operations.length).toBeGreaterThan(0);
      expect(skill.examples.length).toBeGreaterThan(0);
      expect(skill.examples.every((ex) => ex.trim().length > 0)).toBe(true);
    }
  });

  it('ensures every skill referenced by curriculum levels exists in skill definitions', () => {
    for (const level of CURRICULUM_LEVELS) {
      for (const skillId of level.skills) {
        const skill = getSkillDefinition(skillId);
        expect(skill).toBeDefined();
        expect(skill?.id).toBe(skillId);
      }
    }
  });

  it('allows looking up levels by ID and level number', () => {
    const level1 = getCurriculumLevel('level_1');
    expect(level1).toBeDefined();
    expect(level1?.name).toBe('Basic addition');
    expect(level1?.levelNumber).toBe(1);

    const level4 = getCurriculumLevelByNumber(4);
    expect(level4).toBeDefined();
    expect(level4?.id).toBe('level_4');
    expect(level4?.name).toBe('Addition crossing 10');

    expect(getCurriculumLevel('non_existent')).toBeUndefined();
    expect(getCurriculumLevelByNumber(99)).toBeUndefined();
  });

  it('allows looking up skills for a given level', () => {
    const level1Skills = getSkillsForLevel('level_1');
    expect(level1Skills).toHaveLength(1);
    expect(level1Skills[0].id).toBe('basic_addition');
    expect(level1Skills[0].name).toBe('Basic addition');

    const level7Skills = getSkillsForLevel('level_7');
    expect(level7Skills).toHaveLength(1);
    expect(level7Skills[0].id).toBe('mixed_operations');

    expect(getSkillsForLevel('invalid_level')).toEqual([]);
  });

  it('allows question-generation code to reference skills by ID', () => {
    const skillIds: Skill[] = [
      'basic_addition',
      'addition_within_10',
      'make_10',
      'cross_10_addition',
      'basic_subtraction',
      'cross_10_subtraction',
      'mixed_operations',
    ];

    for (const skillId of skillIds) {
      const def = getSkillDefinition(skillId);
      expect(def).toBeDefined();
      expect(def?.id).toBe(skillId);
      expect(SKILL_DEFINITIONS[skillId]).toBe(def);
    }
  });
});
