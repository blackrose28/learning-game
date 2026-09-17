import type { ElementType } from '../questions/types';

export type WorldAreaId = 'castle' | 'fire_area' | 'ice_area' | 'wind_area' | 'earth_area';

export interface WorldAreaTheme {
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  accentColor: string;
  skyGradient: string;
  groundGradient: string;
  particleType: 'none' | 'ember' | 'snowflake' | 'leaf_zephyr' | 'dust_rubble';
}

export interface WorldArea {
  id: WorldAreaId;
  name: string;
  shortName: string;
  icon: string;
  element?: ElementType;
  sessionsRequired: number;
  title: string;
  description: string;
  pedagogicalFocus: string;
  theme: WorldAreaTheme;
}

export interface WorldProgressionState {
  playerId: string;
  completedSessionsCount: number;
  unlockedAreaIds: WorldAreaId[];
  activeAreaId: WorldAreaId;
  lastUnlockedAreaId: WorldAreaId | null;
}
