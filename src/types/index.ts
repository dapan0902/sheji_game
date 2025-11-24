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

export interface TradeConfig {
  costType: 'ATK' | 'SPD' | 'PROJ';
  costVal: number;
  rewardType: 'ATK' | 'SPD' | 'PROJ';
  rewardVal: number;
}

export interface Gate extends Entity {
  rowId: string; // Used to link left/right choices
  type: 'ATK' | 'SPD' | 'MYSTERY' | 'TRADE';
  value: number;
  hp: number;
  maxHp: number;
  hitFlash?: number;
  tradeConfig?: TradeConfig;
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
  hitFlash?: number;
}

export interface Player extends Entity {
  attack: number;
  attackSpeed: number; 
  projectileCount: number;
  lastShotTime: number;
  fever?: number;
  isFeverActive?: boolean;
  feverTimer?: number;
}

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  color: string;
  isFever?: boolean;
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
  text?: string;
}

