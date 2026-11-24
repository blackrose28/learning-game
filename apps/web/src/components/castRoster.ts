import type { CharacterType, ElementType, WorldAreaId } from '@math-archer/learning-engine';

export interface CastLink {
  character: CharacterType;
  note: string;
}

export interface CastMember {
  id: CharacterType;
  name: string;
  epithet: string;
  realmId: WorldAreaId;
  element: ElementType;
  weapon: string;
  quote: string;
  summary: string;
  origin: string;
  allegiance: string;
  flaw: string;
  links: readonly CastLink[];
}

/** Authored cast copy for the reference page; gameplay behaviour still comes from CHARACTER_PROFILES. */
export const CAST_MEMBERS: readonly CastMember[] = [
  {
    id: 'archer',
    name: 'Nila',
    epithet: 'Keeper of the Long Draw',
    realmId: 'wind_area',
    element: 'wind',
    weapon: 'Whisperwind, a recurve bow',
    quote: 'Aim first. The numbers catch up.',
    summary:
      'Nila learned to read the wind before she learned to read a clock. She counts in breaths, lets the arrow finish the sentence, and never draws the same way twice.',
    origin:
      'Raised on the leaf-lift currents of the Wind Temple, where every shot is judged by the silence that follows it.',
    allegiance: 'Wind Temple archers, and the royal range at Castle Courtyard.',
    flaw: 'She rushes the first shot of the day whenever someone is watching.',
    links: [
      {
        character: 'warrior',
        note: 'Trained beside him in the Castle Courtyard; still argues about who drew first.',
      },
      {
        character: 'wizard',
        note: 'He taught her to check her work before the arrow leaves the string.',
      },
    ],
  },
  {
    id: 'wizard',
    name: 'Oren',
    epithet: 'Ember Sage of the Fire Village',
    realmId: 'fire_area',
    element: 'fire',
    weapon: 'Cinderwick, an ember staff',
    quote: 'Every hard sum is a spell that has not been named yet.',
    summary:
      'Oren keeps the village forge warm with arithmetic. Hand him a stubborn problem and he will take it apart until the whole thing fits in a pocket.',
    origin:
      'Apprenticed at the Fire Village forge, where a sum is only trusted if it holds up under heat.',
    allegiance: 'The forge schools of Fire Village; occasional guest teacher at the castle.',
    flaw: 'Explains one step too many whenever he is nervous.',
    links: [
      {
        character: 'gunner',
        note: 'Tutors her in quick counting; she pretends she does not need it.',
      },
      {
        character: 'archer',
        note: 'Walked her home through a storm once and has never let her forget it.',
      },
    ],
  },
  {
    id: 'gunner',
    name: 'Petra Voss',
    epithet: 'Frostline Sharpshooter',
    realmId: 'ice_area',
    element: 'ice',
    weapon: 'Glacier Bell, a twin-barrel shotgun',
    quote: 'Steady hands. Colder nerve.',
    summary:
      'Petra counts better under pressure than anyone on the range. Her rule is simple: one clean shot beats five loud ones, and the tally sheet does not care how you feel about it.',
    origin:
      'Grew up hauling supplies across the Glacial Spires, where a missed count means a very cold night.',
    allegiance: 'Ice Kingdom couriers; keeps the practice targets on the range in repair.',
    flaw: 'Refuses help until the very last shell is spent.',
    links: [
      {
        character: 'wizard',
        note: 'His counting lessons saved her a long night on the spires.',
      },
      {
        character: 'warrior',
        note: 'Their broken-target tally has now outlasted three seasons.',
      },
    ],
  },
  {
    id: 'warrior',
    name: 'Batu Ironhand',
    epithet: 'Stonebreaker of Earth Mountain',
    realmId: 'earth_area',
    element: 'earth',
    weapon: 'Quarry, a throwing axe',
    quote: 'Swing once. Swing true.',
    summary:
      'Batu measures twice by habit and throws once by choice. He remembers every target he has ever missed, which is exactly two, and he would rather not discuss either of them.',
    origin:
      'Came down from the canyon peaks of Earth Mountain with one axe and a stubborn dislike of shortcuts.',
    allegiance: 'The stone crews of Earth Mountain; first to volunteer when a wall needs building.',
    flaw: 'Trusts brute strength over the working, and mixed problems make him pay for it.',
    links: [
      {
        character: 'archer',
        note: 'Calls her “new” at every practice, seven years after she arrived.',
      },
      {
        character: 'gunner',
        note: 'Will not admit that she is ahead on the target tally.',
      },
    ],
  },
];
