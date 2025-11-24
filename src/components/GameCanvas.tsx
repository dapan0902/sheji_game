import React, { useRef, useEffect, useCallback } from 'react';

import { 

  GameState, 

  Player, 

  SnakeSegment, 

  Bullet, 

  Loot, 

  SegmentType, 

  LootType, 

  Particle,

  Gate,

  TradeConfig

} from '../types';

import { 

  CANVAS_WIDTH, 

  CANVAS_HEIGHT, 

  PLAYER_WIDTH, 

  PLAYER_HEIGHT, 

  PLAYER_Y_OFFSET, 

  SEGMENT_SIZE, 

  SEGMENT_SPACING,

  GATE_WIDTH,

  GATE_HEIGHT,

  INITIAL_SNAKE_SPEED, 

  COLORS, 

  MAX_PROJECTILES,

  PATH_PADDING,

  ROW_HEIGHT,

  KNOCKBACK_AMOUNT,

  LOOT_DROP_CHANCE,

  MAP_SCROLL_SPEED,

  GATE_SPAWN_INTERVAL,

  FEVER_MAX,

  FEVER_DURATION,

  FEVER_CHARGE_KILL,

  FEVER_CHARGE_LOOT

} from '../constants';



interface GameCanvasProps {

  gameState: GameState;

  setGameState: (state: GameState) => void;

  setScore: React.Dispatch<React.SetStateAction<number>>;

  setLevel: React.Dispatch<React.SetStateAction<number>>;

  setPlayerStats: (stats: { atk: number; spd: number; proj: number; fever: number; feverActive: boolean }) => void;

}



interface VisualPlayer extends Player {

    muzzleFlashLife: number;

}



const GameCanvas: React.FC<GameCanvasProps> = ({ 

  gameState, 

  setGameState, 

  setScore, 

  setLevel, 

  setPlayerStats 

}) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);



  const playerRef = useRef<VisualPlayer>({

    id: 'player',

    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,

    y: CANVAS_HEIGHT - PLAYER_Y_OFFSET,

    width: PLAYER_WIDTH,

    height: PLAYER_HEIGHT,

    attack: 100,

    attackSpeed: 3.0,

    projectileCount: 1,

    lastShotTime: 0,

    muzzleFlashLife: 0,

    fever: 0,

    isFeverActive: false,

    feverTimer: 0

  });



  const snakeRef = useRef<{

    segments: SnakeSegment[];

    distanceTraveled: number;

    speed: number;

    totalCreated: number; 

  }>({

    segments: [],

    distanceTraveled: 0,

    speed: INITIAL_SNAKE_SPEED,

    totalCreated: 0,

  });



  const gatesRef = useRef<Gate[]>([]);

  const worldDistRef = useRef<number>(0); 

  const bulletsRef = useRef<Bullet[]>([]);

  const lootRef = useRef<Loot[]>([]);

  const particlesRef = useRef<Particle[]>([]);

  const frameRef = useRef<number>(0);

  const scoreRef = useRef<number>(0);



  // Use a starfield for the background

  const starsRef = useRef<{x: number, y: number, s: number, a: number}[]>([]);



  const initStars = () => {

    starsRef.current = [];

    for(let i=0; i<80; i++) {

        starsRef.current.push({

            x: Math.random() * CANVAS_WIDTH,

            y: Math.random() * (CANVAS_HEIGHT * 0.4), // Top 40% only

            s: Math.random() * 2,

            a: Math.random()

        });

    }

  };



  const getPositionAtDistance = (dist: number) => {

    const startX = PATH_PADDING;

    const startY = PATH_PADDING + 80;

    const playWidth = CANVAS_WIDTH - (PATH_PADDING * 2);

    
    
    if (dist < 0) {

      return { 

        x: startX - SEGMENT_SIZE / 2, 

        y: startY + dist - SEGMENT_SIZE / 2 

      };

    }



    const rowCycle = playWidth + ROW_HEIGHT;

    const rowIndex = Math.floor(dist / rowCycle);

    const distInRow = dist % rowCycle;

    
    
    const rowY = startY + (rowIndex * ROW_HEIGHT);

    let x = 0;

    let y = 0;



    if (rowIndex % 2 === 0) {

      if (distInRow < playWidth) {

        x = startX + distInRow;

        y = rowY;

      } else {

        x = startX + playWidth;

        y = rowY + (distInRow - playWidth);

      }

    } else {

      if (distInRow < playWidth) {

        x = (startX + playWidth) - distInRow;

        y = rowY;

      } else {

        x = startX;

        y = rowY + (distInRow - playWidth);

      }

    }



    return { 

      x: x - SEGMENT_SIZE / 2, 

      y: y - SEGMENT_SIZE / 2 

    };

  };



  const createSegment = (): SnakeSegment => {

     snakeRef.current.totalCreated++;

     const count = snakeRef.current.totalCreated;

     let type = SegmentType.BODY;

     if (Math.random() > 0.95) type = SegmentType.CHEST; 



     const progressDiff = 1 + (count / 60); 

     const playerDPS = playerRef.current.attack * playerRef.current.attackSpeed;

     
     
     let finalHp = 0;

     if (type === SegmentType.CHEST) {

         finalHp = playerDPS * 1.5;

     } else {

         finalHp = (80 + (playerDPS * 0.2)) * progressDiff;

     }

     finalHp = Math.max(finalHp, 20);

     finalHp = Math.floor(finalHp);



     return {

        id: `seg-${Date.now()}-${Math.random()}`,

        type,

        x: -200, y: -200, 

        width: SEGMENT_SIZE, 

        height: SEGMENT_SIZE,

        hp: finalHp,

        maxHp: finalHp,

        value: finalHp,

        hitFlash: 0

     };

  }



  const spawnGateRow = () => {

     const spawnY = -200;

     const rowId = `row-${Date.now()}`;

     const progress = snakeRef.current.totalCreated;

     const playerDPS = playerRef.current.attack * playerRef.current.attackSpeed;

     const gateHp = Math.floor(Math.max(200, playerDPS * 2.5)); 



     // Dynamic Stats

     const dynamicAtk = 200 + Math.floor(progress / 15) * 50;

     const dynamicSpd = 0.5 + Math.floor(progress / 50) * 0.1;
     


     // 1. Determine Gate Configuration

     // Adjusted Probabilities:

     // Mystery: 20%

     // Trade: 15%

     // Normal: 65%

     const rand = Math.random();

     let specialGateType: 'MYSTERY' | 'TRADE' | null = null;

     

     if (rand < 0.20) specialGateType = 'MYSTERY';

     else if (rand < 0.35) specialGateType = 'TRADE'; // 0.20 + 0.15 = 0.35



     let leftType: Gate['type'] = 'ATK';

     let rightType: Gate['type'] = 'SPD';



     if (specialGateType) {

         // If special, one side is special, other is normal (ATK or SPD)

         if (Math.random() > 0.5) {

             leftType = specialGateType;

             rightType = Math.random() > 0.5 ? 'ATK' : 'SPD';

         } else {

             rightType = specialGateType;

             leftType = Math.random() > 0.5 ? 'ATK' : 'SPD';

         }

     } else {

         // Normal Row: Always force a choice (ATK vs SPD)

         if (Math.random() > 0.5) {

             leftType = 'SPD';

             rightType = 'ATK';

         } else {

             leftType = 'ATK';

             rightType = 'SPD';

         }

     }



     const createGate = (side: 'left' | 'right', type: Gate['type']): Gate => {

        let val = type === 'ATK' ? dynamicAtk : parseFloat(dynamicSpd.toFixed(1));

        let tradeCfg: TradeConfig | undefined = undefined;



        if (type === 'MYSTERY') {

            val = 0; // Value decided on break

        } else if (type === 'TRADE') {

            // Generate Trade: Cost -> Reward

            // Use side as a seed for variety

            const seed = side === 'left' ? 0 : 1;

            

            if ((Math.random() + seed) % 2 > 0.8 && playerRef.current.projectileCount > 1) {

                // Cost Projectile, Get Huge Stats

                tradeCfg = { 

                    costType: 'PROJ', costVal: 1, 

                    rewardType: 'ATK', rewardVal: dynamicAtk * 4 

                };

            } else {

                // Cost Stats, Get Projectile or Stats

                const cost = Math.floor(playerRef.current.attack * 0.3);

                tradeCfg = {

                    costType: 'ATK', costVal: cost,

                    rewardType: 'SPD', rewardVal: 2.0

                };

            }

        }



        return {

            id: `gate-${side}-${Date.now()}`,

         rowId,

            type,

            value: val,

            tradeConfig: tradeCfg,

         hp: gateHp, maxHp: gateHp,

            x: side === 'left' ? 20 : (CANVAS_WIDTH/2) + 5,

            y: spawnY,

            width: (CANVAS_WIDTH / 2) - 25, height: GATE_HEIGHT,

            hitFlash: 0

        };

     };



     gatesRef.current.push(createGate('left', leftType));

     gatesRef.current.push(createGate('right', rightType));

  };



  const initGame = useCallback(() => {

    playerRef.current = {

      id: 'player',

      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,

      y: CANVAS_HEIGHT - PLAYER_Y_OFFSET,

      width: PLAYER_WIDTH,

      height: PLAYER_HEIGHT,

      attack: 100,

      attackSpeed: 3.0,

      projectileCount: 1,

      lastShotTime: 0,

      muzzleFlashLife: 0,

      fever: 0,

      isFeverActive: false,

      feverTimer: 0

    };

    scoreRef.current = 0;

    bulletsRef.current = [];

    lootRef.current = [];

    particlesRef.current = [];

    gatesRef.current = [];

    worldDistRef.current = 0;

    initStars();

    
    
    const segments: SnakeSegment[] = [];

    segments.push({

      id: `head`,

      type: SegmentType.HEAD,

      x: 0, y: 0, width: SEGMENT_SIZE, height: SEGMENT_SIZE,

      hp: 999999999, maxHp: 999999999, value: 0,

      hitFlash: 0

    });



    snakeRef.current = {

        segments,

        distanceTraveled: 0,

        speed: INITIAL_SNAKE_SPEED,

        totalCreated: 0,

    };



    for(let i=0; i<30; i++) snakeRef.current.segments.push(createSegment());

    spawnGateRow();

    setLevel(1);

    setScore(0);

    setPlayerStats({ atk: 100, spd: 3.0, proj: 1, fever: 0, feverActive: false });

  }, [setLevel, setScore, setPlayerStats]);



  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {

    if (gameState !== GameState.PLAYING || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const scaleX = CANVAS_WIDTH / rect.width;

    const clientX = e.clientX;

    const relativeX = (clientX - rect.left) * scaleX;

    
    
    let newX = relativeX - PLAYER_WIDTH / 2;

    newX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, newX));

    playerRef.current.x = newX;

  };



  useEffect(() => {

    if (gameState === GameState.START) {

      initGame();

      return;

    }

    if (gameState !== GameState.PLAYING) return;



    const loop = () => {

      const ctx = canvasRef.current?.getContext('2d');

      if (!ctx) return;



      const player = playerRef.current;



      // === FEVER LOGIC ===

      if (player.isFeverActive) {

          player.feverTimer--;

          if (player.feverTimer <= 0) {

              player.isFeverActive = false;

              player.fever = 0;

          }

      } else {

          if (player.fever >= FEVER_MAX) {

              player.isFeverActive = true;

              player.feverTimer = FEVER_DURATION;

              createShockwave(player.x + PLAYER_WIDTH/2, player.y, '#FFD700');

          }

      }



      if (player.muzzleFlashLife > 0) player.muzzleFlashLife--;



      // Wave Progression

      if (frameRef.current % 900 === 0) { // Every 15 seconds

          setLevel(l => l + 1);

          snakeRef.current.speed += 0.1;

      }



      worldDistRef.current += MAP_SCROLL_SPEED;

      if (worldDistRef.current > GATE_SPAWN_INTERVAL) {

          spawnGateRow();

          worldDistRef.current = 0;

      }

      gatesRef.current.forEach(g => {

          g.y += MAP_SCROLL_SPEED;

          if (g.hitFlash && g.hitFlash > 0) g.hitFlash--;

      });

      gatesRef.current = gatesRef.current.filter(g => g.y < CANVAS_HEIGHT + 100);



      const snake = snakeRef.current;

      snake.distanceTraveled += snake.speed;

      if (frameRef.current % 600 === 0) snake.speed += 0.05;



      const lastSegIndex = snake.segments.length - 1;

      const lastSegDist = snake.distanceTraveled - (lastSegIndex * SEGMENT_SPACING);

      if (lastSegDist > -300) snake.segments.push(createSegment());



      let headY = 0;

      snake.segments.forEach((seg, i) => {

          const segDist = snake.distanceTraveled - (i * SEGMENT_SPACING);

          const pos = getPositionAtDistance(segDist);

          seg.x = pos.x;

          seg.y = pos.y;

          if (i === 0) headY = seg.y;

          if (seg.hitFlash && seg.hitFlash > 0) seg.hitFlash--;

      });



      if (headY + SEGMENT_SIZE > playerRef.current.y + 40) {

          setGameState(GameState.GAMEOVER);

          return;

      }



      // Shooting

      const now = Date.now();

      const shotDelay = player.isFeverActive ? 40 : (1000 / player.attackSpeed);

      

      if (now - player.lastShotTime > shotDelay) {

        player.lastShotTime = now;

        player.muzzleFlashLife = 4;



        const count = player.projectileCount;

        const spacing = 16;

        const totalW = (count - 1) * spacing;

        const startX = (player.x + PLAYER_WIDTH / 2) - (totalW / 2);



        for (let i = 0; i < count; i++) {

          const bx = startX + (i * spacing);

          bulletsRef.current.push({

            id: Math.random().toString(),

            x: bx,

            y: player.y - 10,

            width: player.isFeverActive ? 8 : 6, 

            height: 28, 

            vx: 0, vy: -18,

            damage: player.isFeverActive ? player.attack * 2 : player.attack,

            color: player.isFeverActive ? COLORS.BULLET_FEVER : COLORS.BULLET,

            isFever: player.isFeverActive

          });

        }

      }



      bulletsRef.current.forEach(b => { b.x += b.vx; b.y += b.vy; });

      bulletsRef.current = bulletsRef.current.filter(b => b.y > -100);



      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {

        const bullet = bulletsRef.current[i];

        let hit = false;

        
        
        // Gates

        for (let gIdx = 0; gIdx < gatesRef.current.length; gIdx++) {

            const gate = gatesRef.current[gIdx];

            if (checkCollision(bullet, gate)) {

                hit = true;

                gate.hp -= bullet.damage;

                gate.hitFlash = 3; 

                createImpact(bullet.x, bullet.y, gate.type === 'MYSTERY' ? COLORS.GATE_BORDER_MYSTERY : (gate.type === 'TRADE' ? COLORS.GATE_BORDER_TRADE : COLORS.GATE_BORDER_ATK));

                if (gate.hp <= 0) handleGateDestruction(gate);

                break;

            }

        }



        if (hit) {

            bulletsRef.current.splice(i, 1);

            continue;

        }



        const head = snake.segments[0];

        if (checkCollision(bullet, head)) {

             hit = true;

             head.hitFlash = 3;

             createImpact(bullet.x, bullet.y, COLORS[SegmentType.HEAD]);

             snake.distanceTraveled = Math.max(0, snake.distanceTraveled - KNOCKBACK_AMOUNT);

        } else {

             for (let sIdx = 1; sIdx < snake.segments.length; sIdx++) {

                const seg = snake.segments[sIdx];

                if (seg.y < -100 || seg.y > CANVAS_HEIGHT) continue; 

                if (checkCollision(bullet, seg)) {

                    hit = true;

                    seg.hitFlash = 3;

                    createImpact(bullet.x, bullet.y, COLORS[SegmentType.BODY]);

                    seg.hp -= bullet.damage;

                    if (seg.hp <= 0) {

                        handleSegmentDestruction(seg);

                        snake.segments.splice(sIdx, 1);

                        snake.distanceTraveled = Math.max(0, snake.distanceTraveled - SEGMENT_SPACING);

                    }

                    break;

                }

             }

        }

        if (hit) bulletsRef.current.splice(i, 1);

      }



      updateLoot();

      updateParticles();



      if (frameRef.current % 10 === 0) {

        setPlayerStats({

            atk: Math.floor(playerRef.current.attack),

            spd: parseFloat(playerRef.current.attackSpeed.toFixed(1)),

            proj: playerRef.current.projectileCount,

            fever: Math.floor(playerRef.current.fever),

            feverActive: playerRef.current.isFeverActive

        });

      }



      render(ctx);

      frameRef.current = requestAnimationFrame(loop);

    };



    frameRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameRef.current);

  }, [gameState, initGame]);



  const checkCollision = (r1: any, r2: any) => {

    const p = 5; 

    return (

        r1.x < r2.x + r2.width - p &&

        r1.x + r1.width > r2.x + p &&

        r1.y < r2.y + r2.height - p &&

        r1.y + r1.height > r2.y + p

    );

  };



  const createFloatingText = (x: number, y: number, text: string, color: string) => {

      particlesRef.current.push({

          id: `txt-${Math.random()}`,

          x, y, vx: 0, vy: -1.5, life: 1.5, color, text

      });

  };



  const handleGateDestruction = (destroyedGate: Gate) => {

      // Clean up pair

      gatesRef.current = gatesRef.current.filter(g => g.id !== destroyedGate.id);

      gatesRef.current = gatesRef.current.filter(g => g.rowId !== destroyedGate.rowId);

      

      const cx = destroyedGate.x + destroyedGate.width/2;

      const cy = destroyedGate.y + destroyedGate.height/2;



      createShockwave(cx, cy, COLORS.GATE_BORDER_ATK);

      

      if (destroyedGate.type === 'MYSTERY') {

          const r = Math.random();

          // Dynamic Probability Pool

          // 0.00 - 0.05: Proj +1 (Jackpot)

          // 0.05 - 0.15: ATK x 1.5 (Jackpot)

          // 0.15 - 0.30: Full Fever (Utility)

          // 0.30 - 0.50: ATK + 20% (Good)

          // 0.50 - 0.70: SPD + 1.0 (Good)

          // 0.70 - 0.85: ATK - 20% (Bad)

          // 0.85 - 1.00: SPD - 1.0 (Bad)



          if (r < 0.05) {

              playerRef.current.projectileCount = Math.min(MAX_PROJECTILES, playerRef.current.projectileCount + 1);

              createFloatingText(cx, cy, "弹道 +1!", '#FFD700');

          } else if (r < 0.15) {

              playerRef.current.attack = Math.floor(playerRef.current.attack * 1.5);

              createFloatingText(cx, cy, "攻击力 x1.5!", '#FFD700');

          } else if (r < 0.30) {

              playerRef.current.fever = FEVER_MAX;

              createFloatingText(cx, cy, "能量充满!", '#FFD700');

          } else if (r < 0.50) {

              const gain = Math.max(50, Math.floor(playerRef.current.attack * 0.2));

              playerRef.current.attack += gain;

              createFloatingText(cx, cy, `攻击力 +${gain}`, '#00FF9C');

          } else if (r < 0.70) {

              playerRef.current.attackSpeed += 1.0;

              createFloatingText(cx, cy, `攻速 +1.0`, '#00FF9C');

          } else if (r < 0.85) {

              const loss = Math.floor(playerRef.current.attack * 0.2);

              playerRef.current.attack = Math.max(10, playerRef.current.attack - loss);

              createFloatingText(cx, cy, `诅咒: 攻击-${loss}`, '#FF2A6D');

          } else {

              playerRef.current.attackSpeed = Math.max(1.0, playerRef.current.attackSpeed - 1.0);

              createFloatingText(cx, cy, `诅咒: 攻速-1.0`, '#FF2A6D');

          }

          return;

      }



      if (destroyedGate.type === 'TRADE' && destroyedGate.tradeConfig) {

          const { costType, costVal, rewardType, rewardVal } = destroyedGate.tradeConfig;

          let canAfford = false;

          if (costType === 'ATK' && playerRef.current.attack > costVal) canAfford = true;

          if (costType === 'PROJ' && playerRef.current.projectileCount > costVal) canAfford = true;

          

          if (canAfford) {

              // Pay Cost

              if (costType === 'ATK') playerRef.current.attack -= costVal;

              if (costType === 'PROJ') playerRef.current.projectileCount -= costVal;

              

              // Get Reward

              if (rewardType === 'ATK') playerRef.current.attack += rewardVal;

              if (rewardType === 'SPD') playerRef.current.attackSpeed += rewardVal;

              if (rewardType === 'PROJ') playerRef.current.projectileCount += rewardVal;



              createFloatingText(cx, cy, "交易成功!", '#FFD700');

          } else {

              createFloatingText(cx, cy, "穷鬼!", '#FF2A6D');

          }

          return;

      }



      // Normal Gate Logic

      if (destroyedGate.type === 'ATK') {

          playerRef.current.attack += destroyedGate.value;

          createFloatingText(cx, cy, `攻击 +${destroyedGate.value}`, '#FF2A6D');

      } else {

          playerRef.current.attackSpeed += destroyedGate.value;

          playerRef.current.attackSpeed = parseFloat(playerRef.current.attackSpeed.toFixed(1));

          createFloatingText(cx, cy, `攻速 +${destroyedGate.value}`, '#05D9E8');

      }

  };



  const handleSegmentDestruction = (seg: SnakeSegment) => {

     scoreRef.current += 10;

     setScore(scoreRef.current);

     

     // Charge Fever

     if (!playerRef.current.isFeverActive) {

         playerRef.current.fever = Math.min(FEVER_MAX, playerRef.current.fever + FEVER_CHARGE_KILL);

     }



     createImpact(seg.x + seg.width/2, seg.y + seg.height/2, COLORS[seg.type] || '#fff');

     if (seg.type === SegmentType.CHEST) spawnLoot(seg.x + seg.width/2, seg.y + seg.height/2);

  };



  const spawnLoot = (x: number, y: number) => {

      const r = Math.random();

      let lType = LootType.ATK_UP_LARGE;

      if (r < LOOT_DROP_CHANCE[LootType.PROJECTILE_UP]) lType = LootType.PROJECTILE_UP;

      else if (r < 0.5) lType = LootType.SPD_UP_LARGE;



      lootRef.current.push({

          id: Math.random().toString(),

          x: x - 20, y: y - 20, width: 40, height: 40,

          type: lType, vy: -5.0 

      });

  };



  const updateLoot = () => {

    const p = playerRef.current;

    for (let i = lootRef.current.length - 1; i >= 0; i--) {

        const l = lootRef.current[i];

        l.vy += 0.2; l.y += l.vy;

        const dist = Math.hypot((l.x) - (p.x), (l.y) - (p.y));

        if (dist < 180) {

            l.x += (p.x + p.width/2 - l.x - l.width/2) * 0.15;

            l.y += (p.y + p.height/2 - l.y - l.height/2) * 0.15;

        }



        if (checkCollision(l, p)) {

             if (l.type === LootType.PROJECTILE_UP) p.projectileCount = Math.min(MAX_PROJECTILES, p.projectileCount + 1);

             else if (l.type === LootType.ATK_UP_LARGE) p.attack += 300;

             else if (l.type === LootType.SPD_UP_LARGE) p.attackSpeed = Math.min(25, p.attackSpeed * 1.5);

             

             if (!p.isFeverActive) {

                 p.fever = Math.min(FEVER_MAX, p.fever + FEVER_CHARGE_LOOT);

             }



             lootRef.current.splice(i, 1);

        } else if (l.y > CANVAS_HEIGHT + 50) {

             lootRef.current.splice(i, 1);

        }

    }

  };



  const updateParticles = () => {

    particlesRef.current.forEach(pt => {

        pt.x += pt.vx; pt.y += pt.vy;

        if (pt.color.includes('shockwave')) {

            pt.life -= 0.05; 

            (pt as any).radius += 3;

        } else if (pt.text) {

             pt.life -= 0.02; // Floating text lingers longer

        } else {

            pt.vy += 0.1; pt.life -= 0.05;

        }

    });

    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

  };



  const createImpact = (x: number, y: number, color: string) => {

    for (let i = 0; i < 4; i++) {

      particlesRef.current.push({

        id: Math.random().toString(),

        x, y,

        vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,

        life: 1.0, color

      });

    }

  };



  const createShockwave = (x: number, y: number, color: string) => {

      particlesRef.current.push({

          id: `shock-${Math.random()}`,

          x, y, vx: 0, vy: 0, life: 1.0, color: 'shockwave',

          // @ts-ignore

          radius: 10, realColor: color

      });

  };



  const formatNumber = (num: number) => {

      if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';

      if (num >= 1000) return (num/1000).toFixed(1) + 'k';

      return Math.floor(num).toString();

  };



  const render = (ctx: CanvasRenderingContext2D) => {

      const isFever = playerRef.current.isFeverActive;



      // 1. SCI-FI BACKGROUND

      // Top (Space)

      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.5);

      grad.addColorStop(0, COLORS.BG_TOP);

      grad.addColorStop(1, COLORS.BG_BOTTOM);

      ctx.fillStyle = grad;

      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);



      // Stars

      ctx.fillStyle = '#FFF';

      starsRef.current.forEach(star => {

          ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005 + star.a) * 0.5;

          ctx.beginPath(); ctx.arc(star.x, star.y, star.s, 0, Math.PI*2); ctx.fill();

      });

      ctx.globalAlpha = 1;



      // Horizon & Grid

      const horizonY = CANVAS_HEIGHT * 0.45;

      
      
      // Bottom (Ground) - Dark

      ctx.fillStyle = COLORS.BG_BOTTOM;

      ctx.fillRect(0, horizonY, CANVAS_WIDTH, CANVAS_HEIGHT - horizonY);



      // Perspective Grid (STATIC)

      ctx.strokeStyle = isFever ? '#FFD700' : COLORS.GRID_COLOR; 

      ctx.lineWidth = 1;

      ctx.beginPath();

      // Vertical converging lines

      const centerX = CANVAS_WIDTH / 2;

      for (let i = -10; i <= 10; i++) {

          const x = centerX + (i * 100); 

          ctx.moveTo(x, CANVAS_HEIGHT);

          ctx.lineTo(centerX, horizonY);

      }

      // Horizontal lines (getting closer to horizon)

      for (let i = 0; i < 20; i++) {

          const y = CANVAS_HEIGHT - Math.pow(i, 2.2); 

          if (y < horizonY) break;

          ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y);

      }

      ctx.stroke();



      // Horizon Glow

      ctx.shadowBlur = 20; ctx.shadowColor = COLORS.HORIZON_GLOW;

      ctx.strokeStyle = COLORS.HORIZON_GLOW; ctx.lineWidth = 2;

      ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(CANVAS_WIDTH, horizonY); ctx.stroke();

      ctx.shadowBlur = 0;



      // 3. Holographic Gates

      gatesRef.current.forEach(gate => {

          let borderColor = COLORS.GATE_BORDER_ATK;

          let bgFill = COLORS.GATE_BG_ATK;



          if (gate.type === 'SPD') {

               borderColor = COLORS.GATE_BORDER_SPD;

               bgFill = COLORS.GATE_BG_SPD;

          } else if (gate.type === 'MYSTERY') {

               borderColor = COLORS.GATE_BORDER_MYSTERY;

               bgFill = COLORS.GATE_BG_MYSTERY;

          } else if (gate.type === 'TRADE') {

               borderColor = COLORS.GATE_BORDER_TRADE;

               bgFill = COLORS.GATE_BG_TRADE;

          }



          const x = gate.x, y = gate.y, w = gate.width, h = gate.height;

          

          ctx.shadowBlur = 10; ctx.shadowColor = borderColor;

          ctx.fillStyle = bgFill;

          ctx.strokeStyle = borderColor;

          ctx.lineWidth = 2;

          
          
          ctx.beginPath(); 

          ctx.moveTo(x, y); ctx.lineTo(x+w, y); 

          ctx.lineTo(x+w, y+h-10); ctx.lineTo(x+w-20, y+h); 

          ctx.lineTo(x+20, y+h); ctx.lineTo(x, y+h-10); 

          ctx.closePath();

          ctx.fill(); 



          ctx.stroke();

          ctx.shadowBlur = 0;



          // Scanlines

          ctx.fillStyle = borderColor;

          for(let i=0; i<h; i+=5) {

             ctx.globalAlpha = 0.1; ctx.fillRect(x, y+i, w, 1);

          }

          ctx.globalAlpha = 1;



          // Text Content

          ctx.fillStyle = '#FFFFFF';

          ctx.textAlign = 'center'; 

          

          if (gate.type === 'MYSTERY') {

              ctx.font = '700 48px "Rajdhani"';

              ctx.fillText('?', x+w/2, y+h/2 + 15);

              ctx.font = '600 14px "Rajdhani"';

              ctx.fillText('命运', x+w/2, y+20);

          } 

          else if (gate.type === 'TRADE' && gate.tradeConfig) {

              const {costType, costVal, rewardType, rewardVal} = gate.tradeConfig;

              const costTxt = costType === 'PROJ' ? `弹道` : (costType === 'ATK' ? '攻击' : '攻速');

              const rewardTxt = rewardType === 'PROJ' ? `弹道` : (rewardType === 'ATK' ? '攻击' : '攻速');

              

              ctx.font = '700 16px "Rajdhani"';

              ctx.fillStyle = '#FF4444'; // Red Cost

              ctx.fillText(`${costTxt} -${costVal}`, x+w/2, y+h/3);

              

              ctx.fillStyle = '#00FF9C'; // Green Reward

              ctx.fillText(`${rewardTxt} +${rewardVal}`, x+w/2, y+h/1.5 + 5);

          }

          else {

              ctx.font = '600 16px "Rajdhani"';

              ctx.fillText(gate.type === 'ATK' ? '攻击力' : '攻速', x+w/2, y+20);

              ctx.font = '700 32px "Rajdhani"';

          ctx.fillText(`+${gate.value}`, x+w/2, y+h/2 + 10);

          }



          // HP Bar

          const hpPct = Math.max(0, gate.hp / gate.maxHp);

          ctx.fillStyle = '#333'; ctx.fillRect(x+10, y+h-8, w-20, 4);

          ctx.fillStyle = borderColor; ctx.fillRect(x+10, y+h-8, (w-20)*hpPct, 4);

      });



      // 4. Loot

      lootRef.current.forEach(l => {

          ctx.save(); ctx.translate(l.x+l.width/2, l.y+l.height/2);

          const s = 1 + Math.sin(Date.now()/150) * 0.1;

          ctx.scale(s, s);



          let color = '#fff'; let txt = '';

          if (l.type === LootType.PROJECTILE_UP) { color = '#00FF9C'; txt = '弹道'; } 

          if (l.type === LootType.ATK_UP_LARGE) { color = '#FF2A6D'; txt = '攻击'; } 

          if (l.type === LootType.SPD_UP_LARGE) { color = '#05D9E8'; txt = '攻速'; } 

          
          
          ctx.shadowBlur = 15; ctx.shadowColor = color;

          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0,0,0,0.5)';

          ctx.beginPath(); ctx.rect(-18, -18, 36, 36); ctx.fill(); ctx.stroke();

          ctx.shadowBlur = 0;

          
          
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Rajdhani", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, 0, 4);

          ctx.restore();

      });



      // 5. Bullets

      bulletsRef.current.forEach(b => {

        ctx.save(); ctx.translate(b.x, b.y);

        ctx.shadowBlur = isFever ? 15 : 10; ctx.shadowColor = b.color;

        ctx.fillStyle = b.color;

        ctx.beginPath(); ctx.rect(0, 0, b.width, b.height); ctx.fill();

        ctx.shadowBlur = 0;

        ctx.restore();

      });



      // 6. Particles (Including Floating Text)

      particlesRef.current.forEach(p => {

          if (p.text) {

              ctx.font = '700 20px "Rajdhani"';

              ctx.fillStyle = p.color;

              ctx.strokeStyle = '#000'; ctx.lineWidth = 2;

              ctx.strokeText(p.text, p.x, p.y);

              ctx.fillText(p.text, p.x, p.y);

          } else if (p.color === 'shockwave') {

              // @ts-ignore

              const r = p.radius; const c = p.realColor;

              ctx.strokeStyle = c; ctx.lineWidth = 2 * p.life; ctx.globalAlpha = p.life;

              ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();

              ctx.globalAlpha = 1;

          } else {

              ctx.fillStyle = p.color; ctx.globalAlpha = p.life;

              ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();

              ctx.globalAlpha = 1;

          }

      });



      // 7. Snake (CYBER WORM)

      const snake = snakeRef.current;

      for(let i = snake.segments.length-1; i>=0; i--) {

          const seg = snake.segments[i];

          if (seg.y < -100 || seg.y > CANVAS_HEIGHT + 100) continue;

          const x = seg.x, y = seg.y, w = seg.width, h = seg.height;

          

          ctx.shadowBlur = 10; ctx.shadowColor = COLORS[seg.type] || '#fff';

            
          
          if (seg.type === SegmentType.HEAD) {

            ctx.fillStyle = COLORS[SegmentType.HEAD];

            ctx.beginPath(); 

            ctx.moveTo(x+w/2, y); ctx.lineTo(x+w, y+h/2); ctx.lineTo(x+w/2, y+h); ctx.lineTo(x, y+h/2); 

            ctx.fill();



                // Eyes (Blink)

                const blink = Math.sin(Date.now()/200) > 0.9;

            ctx.fillStyle = '#FFF'; 

                if (!blink) {

            ctx.beginPath(); ctx.arc(x+w*0.35, y+h*0.4, 4, 0, Math.PI*2); ctx.fill();

            ctx.beginPath(); ctx.arc(x+w*0.65, y+h*0.4, 4, 0, Math.PI*2); ctx.fill();
            
                } else {

                    ctx.fillRect(x+w*0.3, y+h*0.4, 6, 2);

                    ctx.fillRect(x+w*0.6, y+h*0.4, 6, 2);

                }

                

            ctx.fillStyle = '#fff'; ctx.font = '20px "Rajdhani"'; ctx.textAlign = 'center'; ctx.fillText('BOSS', x+w/2, y+h+20);



          } else if (seg.type === SegmentType.CHEST) {

            ctx.fillStyle = COLORS.CHEST;

            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;

            ctx.beginPath(); ctx.rect(x+4, y+4, w-8, h-8); ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#000'; ctx.font = '700 24px "Rajdhani"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.fillText('?', x+w/2, y+h/2);

            ctx.font = '12px "Rajdhani"'; ctx.fillStyle = '#fff'; ctx.fillText(formatNumber(seg.hp), x+w/2, y-10);



          } else {

            ctx.strokeStyle = COLORS[SegmentType.BODY]; ctx.lineWidth = 2;

            ctx.fillStyle = 'rgba(5, 217, 232, 0.1)';

            ctx.beginPath(); ctx.rect(x+4, y+4, w-8, h-8); ctx.fill(); ctx.stroke();

                
            
            ctx.fillStyle = '#FFF';

            ctx.font = '600 16px "Rajdhani"';

            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            ctx.fillText(formatNumber(seg.hp), x+w/2, y+h/2);

          }

          ctx.shadowBlur = 0;

      }



      // 8. Player (MECHA TURRET)

      const px = playerRef.current.x + PLAYER_WIDTH/2;

      const py = playerRef.current.y + PLAYER_HEIGHT/2;

      
      
      // Base

      ctx.fillStyle = COLORS.TURRET_BASE; 

      ctx.beginPath(); ctx.moveTo(px-30, py+20); ctx.lineTo(px+30, py+20); ctx.lineTo(px+20, py-10); ctx.lineTo(px-20, py-10); ctx.fill();

      
      
      // Core Glow

      const coreColor = isFever ? COLORS.TURRET_CORE_FEVER : COLORS.TURRET_CORE;

      ctx.shadowBlur = 15; ctx.shadowColor = coreColor;

      ctx.fillStyle = coreColor; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2); ctx.fill();

      ctx.shadowBlur = 0;



      // Armor Shell

      ctx.fillStyle = COLORS.TURRET_METAL;

      ctx.beginPath(); ctx.moveTo(px-25, py+10); ctx.lineTo(px-10, py-15); ctx.lineTo(px+10, py-15); ctx.lineTo(px+25, py+10); ctx.fill();



      // Barrels

      const barrelCount = playerRef.current.projectileCount;

      const barrelSpacing = 8;

      const totalBarrelW = (barrelCount - 1) * barrelSpacing;

      
      
      ctx.fillStyle = '#888';

      for(let b=0; b<barrelCount; b++) {

          const bx = px - (totalBarrelW/2) + (b * barrelSpacing);

          ctx.beginPath(); ctx.rect(bx - 2, py - 35, 4, 25); ctx.fill();

      }



      // Muzzle Flash

      if (playerRef.current.muzzleFlashLife > 0) {

          ctx.fillStyle = isFever ? COLORS.BULLET_FEVER : COLORS.BULLET;

          ctx.shadowBlur = 20; ctx.shadowColor = ctx.fillStyle;

          for(let b=0; b<barrelCount; b++) {

             const bx = px - (totalBarrelW/2) + (b * barrelSpacing);

             ctx.beginPath(); ctx.arc(bx, py - 40, 4 + Math.random()*6, 0, Math.PI*2); ctx.fill();

          }

          ctx.shadowBlur = 0;

      }

      

      // Fever Overlay

      if (isFever) {

          ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';

          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      }

  };



  useEffect(() => {

    window.addEventListener('pointermove', handlePointerMove);

    window.addEventListener('pointerdown', handlePointerMove);
    
    return () => {

        window.removeEventListener('pointermove', handlePointerMove);

        window.removeEventListener('pointerdown', handlePointerMove);

    };

  }, [gameState]);



  return (

    <div 

      ref={containerRef}

      className="relative w-full h-full mx-auto bg-black overflow-hidden cursor-none touch-none select-none"

      style={{ maxWidth: '100%', maxHeight: '100%' }}

    >

      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full block object-contain" />

    </div>

  );

};



export default GameCanvas;
