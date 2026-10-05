import type { CharacterType, CosmeticItem } from './types';

export const CHARACTER_PROFILES = {
  archer: {
    name: 'Archer',
    icon: '🏹',
    projectile: 'arrow',
    plural: 'Arrows',
    weapon: 'Bow',
    weapons: 'Bow Skins',
    effects: 'Arrow Effects',
    action: 'Shot',
    inventory: "ARCHER'S QUIVER",
    hint: 'Draw an arrow to loose at the target',
  },
  wizard: {
    name: 'Wizard',
    icon: '🔮',
    projectile: 'spell',
    plural: 'Spells',
    weapon: 'Staff',
    weapons: 'Staves & Wands',
    effects: 'Spell Effects',
    action: 'Cast',
    inventory: "WIZARD'S SPELLBOOK",
    hint: 'Channel a spell to cast at the target',
  },
  gunner: {
    name: 'Gunner',
    icon: '🔫',
    projectile: 'bullet',
    plural: 'Shots',
    weapon: 'Shotgun',
    weapons: 'Shotgun Skins',
    effects: 'Bullet Effects',
    action: 'Shot',
    inventory: "GUNNER'S AMMO",
    hint: 'Fire an elemental shotgun blast, then reload',
  },
  warrior: {
    name: 'Warrior',
    icon: '🪓',
    projectile: 'axe',
    plural: 'Axes',
    weapon: 'Axe',
    weapons: 'Axe Skins',
    effects: 'Axe Effects',
    action: 'Throw',
    inventory: "WARRIOR'S AXES",
    hint: 'Throw an elemental axe at the target',
  },
} as const satisfies Record<CharacterType, object>;

export function isCharacterType(value: unknown): value is CharacterType {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHARACTER_PROFILES, value)
  );
}

const WEAPON_THEMES: Record<string, string> = {
  bow_recurve_oak: 'Oak Scout',
  bow_ember_blaze: 'Ember Blaze',
  bow_frost_crystal: 'Frost Crystal',
  bow_zephyr_wind: 'Zephyr Wind',
  bow_regal_gold: 'Royal Gold',
  bow_shadow_composite: 'Shadow Stalker',
  bow_storm_surge: 'Storm Surge',
  bow_dragon_horn: 'Dragon Horn',
  bow_crystalline_prism: 'Crystalline Prism',
  bow_phoenix_wing: 'Phoenix Wing',
  bow_master_elemental: 'Master Elemental',
  bow_celestial_harp: 'Celestial Star',
  bow_mythic_sovereign: 'Mythic Sovereign',
  bow_divine_infinity: 'Divine Infinity',
};

/** Shared unlock IDs preserve existing saves while each hero has their own equipment. */
export function getCharacterCosmetic(
  item: CosmeticItem,
  character: CharacterType
): { name: string; icon: string; description: string } {
  if (item.category === 'bow') {
    if (character === 'wizard')
      return {
        name: item.wizardWeaponName || item.name,
        icon: item.wizardWeaponIcon || '🔮',
        description: item.wizardWeaponDesc || item.description,
      };
    if (character === 'gunner' || character === 'warrior') {
      const theme = WEAPON_THEMES[item.id] || 'Elemental';
      const profile = CHARACTER_PROFILES[character];
      return {
        name: `${theme} ${profile.weapon}`,
        icon: profile.icon,
        description:
          character === 'gunner'
            ? `A ${theme.toLowerCase()} shotgun firing glowing elemental blasts and reloading after every shot.`
            : `A ${theme.toLowerCase()} throwing axe with a gleaming blade and a swirling elemental trail.`,
      };
    }
  }
  if (item.category === 'arrow_effect' && (character === 'gunner' || character === 'warrior')) {
    return {
      name: item.name.replace(/Arrow/g, character === 'gunner' ? 'Bullet' : 'Axe'),
      icon: item.icon,
      description: `${item.description.replace(/arrows?/gi, character === 'gunner' ? 'bullets' : 'axes')} Applies to your ${CHARACTER_PROFILES[character].projectile} trail and impact.`,
    };
  }
  return { name: item.name, icon: item.icon, description: item.description };
}
