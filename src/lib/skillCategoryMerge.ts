import { Skill, SkillCategory } from "../types";

export interface MergedSkillCategory {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  /** Not in skillCategories — exists only because a skill still references it. */
  isOrphan: boolean;
}

/**
 * Sections (categories) are explicit entities (`skillCategories`), so a
 * section can exist before it has any skills. Legacy/imported skills whose
 * category isn't in that list yet still show up as an "orphan" section, so
 * nothing already saved disappears — anywhere this data is displayed.
 */
export function mergeSkillCategories(skills: Skill[], skillCategories: SkillCategory[]): MergedSkillCategory[] {
  return [
    ...skillCategories.map((c): MergedSkillCategory => ({ ...c, isOrphan: false })),
    ...Array.from(new Set(skills.map((s) => s.category)))
      .filter((name) => !skillCategories.some((c) => c.name === name))
      .map(
        (name): MergedSkillCategory => ({
          id: `orphan-${name}`,
          name,
          nameEn: skills.find((s) => s.category === name && s.categoryEn)?.categoryEn,
          isOrphan: true,
        })
      ),
  ];
}
