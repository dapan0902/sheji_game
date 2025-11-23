import { LootType, SegmentType } from "../types";

export const CANVAS_WIDTH = 450;
export const CANVAS_HEIGHT = 850;

// Player Config
export const PLAYER_WIDTH = 64; 
export const PLAYER_HEIGHT = 64;
export const PLAYER_Y_OFFSET = 180;
export const MAX_PROJECTILES = 7; 
export const BASE_ATTACK = 100;
export const BASE_ATTACK_SPEED = 3.0; 

// Snake Config
export const SEGMENT_SIZE = 52; 
export const SEGMENT_SPACING = 46; 
export const INITIAL_SNAKE_SPEED = 1.0; 
export const KNOCKBACK_AMOUNT = 0.5; 
export const SPEED_INCREMENT_PER_LEVEL = 0.05;

// Map / Gate Config
export const MAP_SCROLL_SPEED = 2.0; 
export const GATE_SPAWN_INTERVAL = 400; 
export const GATE_WIDTH = 180;
export const GATE_HEIGHT = 90;

// Pathing
export const PATH_PADDING = 28; 
export const ROW_HEIGHT = 80; 

// Loot Probabilities
export const LOOT_DROP_CHANCE = {
  [LootType.PROJECTILE_UP]: 0.1, 
  [LootType.ATK_UP_LARGE]: 0.45,
  [LootType.SPD_UP_LARGE]: 0.45,
};

// SCI-FI PALETTE
export const COLORS = {
  [SegmentType.HEAD]: '#FF2A6D', // Cyber Pink
  [SegmentType.BODY]: '#05D9E8', // Cyber Cyan
  [SegmentType.CHEST]: '#FFD700', // Gold
  
  // Holographic Gates
  GATE_BG_ATK: 'rgba(255, 42, 109, 0.15)', 
  GATE_BG_SPD: 'rgba(5, 217, 232, 0.15)', 
  GATE_BORDER_ATK: '#FF2A6D', 
  GATE_BORDER_SPD: '#05D9E8', 
  
  BULLET: '#00FF9C', // Matrix Green/Bright Neon
  BULLET_GLOW: 'rgba(0, 255, 156, 0.8)',
  
  PLAYER: '#FFFFFF', 
  
  TEXT: '#FFFFFF', 
  
  // Deep Space Background
  BG_TOP: '#02000A',
  BG_BOTTOM: '#120428',
  GRID_COLOR: 'rgba(5, 217, 232, 0.2)',
  HORIZON_GLOW: '#7000FF',
  
  // Mecha Turret
  TURRET_BASE: '#1A1A24',
  TURRET_METAL: '#4A4A5E',
  TURRET_CORE: '#00FF9C',
  
  SHADOW: 'rgba(0,0,0,0.5)'
};

export const BUFF_NODE_REWARD_ATK = 200;
export const BUFF_NODE_REWARD_SPD = 0.5;
