export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  VICTORY = 'VICTORY'
}

export enum SegmentType {
  HEAD = 'HEAD',
  BODY = 'BODY',
  CHEST = 'CHEST',
}

export enum LootType {
  PROJECTILE_UP = 'PROJECTILE_UP',
  ATK_UP_LARGE = 'ATK_UP_LARGE',
  SPD_UP_LARGE = 'SPD_UP_LARGE',
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Gate extends Entity {
  rowId: string; // Used to link left/right choices
  type: 'ATK' | 'SPD';
  value: number;
  hp: number;
  maxHp: number;
}

export interface SnakeSegment {
  id: string;
  type: SegmentType;
  hp: number;
  maxHp: number;
  value: number;
  // Calculated properties for collision/rendering
  x: number; 
  y: number;
  width: number;
  height: number;
}

export interface Player extends Entity {
  attack: number;
  attackSpeed: number; 
  projectileCount: number;
  lastShotTime: number;
}

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  color: string;
}

export interface Loot extends Entity {
  type: LootType;
  vy: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

