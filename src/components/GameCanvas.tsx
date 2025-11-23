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
  Gate
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
  GATE_SPAWN_INTERVAL
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  setPlayerStats: (stats: { atk: number; spd: number; proj: number }) => void;
}

interface VisualPlayer extends Player {
    recoilOffset: number;
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
    recoilOffset: 0,
    muzzleFlashLife: 0
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
     };
  }

  const spawnGateRow = () => {
     const spawnY = -200;
     const rowId = `row-${Date.now()}`;
     const progress = snakeRef.current.totalCreated;

     // DYNAMIC REWARD SCALING
     const dynamicAtk = 200 + Math.floor(progress / 15) * 50;
     const dynamicSpd = 0.5 + Math.floor(progress / 50) * 0.1;
     
     const playerDPS = playerRef.current.attack * playerRef.current.attackSpeed;
     const gateHp = Math.floor(Math.max(200, playerDPS * 2.5)); 

     gatesRef.current.push({
         id: `gate-l-${Date.now()}`,
         rowId,
         type: Math.random() > 0.5 ? 'ATK' : 'SPD',
         value: 0, 
         hp: gateHp, maxHp: gateHp,
         x: 20, y: spawnY,
         width: (CANVAS_WIDTH / 2) - 25, height: GATE_HEIGHT
     });
     
     gatesRef.current.push({
         id: `gate-r-${Date.now()}`,
         rowId,
         type: Math.random() > 0.5 ? 'ATK' : 'SPD',
         value: 0,
         hp: gateHp, maxHp: gateHp,
         x: (CANVAS_WIDTH / 2) + 5, y: spawnY,
         width: (CANVAS_WIDTH / 2) - 25, height: GATE_HEIGHT
     });

     const len = gatesRef.current.length;
     const g1 = gatesRef.current[len-2];
     const g2 = gatesRef.current[len-1];
     
     // Assign values based on type
     g1.value = g1.type === 'ATK' ? dynamicAtk : parseFloat(dynamicSpd.toFixed(1));
     g2.value = g2.type === 'ATK' ? dynamicAtk : parseFloat(dynamicSpd.toFixed(1));
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
      recoilOffset: 0,
      muzzleFlashLife: 0
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
    setPlayerStats({ atk: 100, spd: 3.0, proj: 1 });
  }, [setLevel, setScore, setPlayerStats]);

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent | TouchEvent) => {
    if (gameState !== GameState.PLAYING || !containerRef.current) return;
    e.preventDefault(); // 防止移动端滚动
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const clientX = (e as PointerEvent).clientX || (e as TouchEvent).touches?.[0]?.clientX || 0;
    const relativeX = (clientX - rect.left) * scaleX;
    
    let newX = relativeX - PLAYER_WIDTH / 2;
    newX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, newX));
    playerRef.current.x = newX;
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.START) {
      initGame();
      return;
    }
    if (gameState !== GameState.PLAYING) return;

    const loop = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      if (playerRef.current.recoilOffset > 0) playerRef.current.recoilOffset -= 0.5;
      if (playerRef.current.muzzleFlashLife > 0) playerRef.current.muzzleFlashLife--;

      worldDistRef.current += MAP_SCROLL_SPEED;
      if (worldDistRef.current > GATE_SPAWN_INTERVAL) {
          spawnGateRow();
          worldDistRef.current = 0;
      }
      gatesRef.current.forEach(g => g.y += MAP_SCROLL_SPEED);
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
      });

      if (headY + SEGMENT_SIZE > playerRef.current.y + 40) {
          setGameState(GameState.GAMEOVER);
          return;
      }

      // Shooting
      const now = Date.now();
      if (now - playerRef.current.lastShotTime > 1000 / playerRef.current.attackSpeed) {
        playerRef.current.lastShotTime = now;
        playerRef.current.recoilOffset = 6; 
        playerRef.current.muzzleFlashLife = 4;

        const count = playerRef.current.projectileCount;
        const spacing = 16;
        const totalW = (count - 1) * spacing;
        const startX = (playerRef.current.x + PLAYER_WIDTH / 2) - (totalW / 2);

        for (let i = 0; i < count; i++) {
          const bx = startX + (i * spacing);
          bulletsRef.current.push({
            id: Math.random().toString(),
            x: bx,
            y: playerRef.current.y - 10,
            width: 6, height: 28, // Lasers
            vx: 0, vy: -18,
            damage: playerRef.current.attack,
            color: COLORS.BULLET
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
                createImpact(bullet.x, bullet.y, COLORS.GATE_BORDER_ATK);
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
             createImpact(bullet.x, bullet.y, COLORS[SegmentType.HEAD]);
             snake.distanceTraveled = Math.max(0, snake.distanceTraveled - KNOCKBACK_AMOUNT);
        } else {
             for (let sIdx = 1; sIdx < snake.segments.length; sIdx++) {
                const seg = snake.segments[sIdx];
                if (seg.y < -100 || seg.y > CANVAS_HEIGHT) continue; 
                if (checkCollision(bullet, seg)) {
                    hit = true;
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
            proj: playerRef.current.projectileCount
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

  const handleGateDestruction = (destroyedGate: Gate) => {
      gatesRef.current = gatesRef.current.filter(g => g.id !== destroyedGate.id);
      gatesRef.current = gatesRef.current.filter(g => g.rowId !== destroyedGate.rowId);
      const rewardValue = destroyedGate.value;

      createShockwave(destroyedGate.x + destroyedGate.width/2, destroyedGate.y + destroyedGate.height/2, destroyedGate.type === 'ATK' ? COLORS.GATE_BORDER_ATK : COLORS.GATE_BORDER_SPD);
      
      if (destroyedGate.type === 'ATK') playerRef.current.attack += rewardValue;
      else {
          playerRef.current.attackSpeed += rewardValue;
          playerRef.current.attackSpeed = parseFloat(playerRef.current.attackSpeed.toFixed(1));
      }
  };

  const handleSegmentDestruction = (seg: SnakeSegment) => {
     scoreRef.current += 10;
     setScore(scoreRef.current);
     setLevel(prev => prev + 1);
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
      ctx.strokeStyle = COLORS.GRID_COLOR;
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
          const isAtk = gate.type === 'ATK';
          const borderColor = isAtk ? COLORS.GATE_BORDER_ATK : COLORS.GATE_BORDER_SPD;
          const bgFill = isAtk ? COLORS.GATE_BG_ATK : COLORS.GATE_BG_SPD;
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
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;

          // Scanlines
          ctx.fillStyle = borderColor;
          for(let i=0; i<h; i+=5) {
             ctx.globalAlpha = 0.1; ctx.fillRect(x, y+i, w, 1);
          }
          ctx.globalAlpha = 1;

          // Text
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 16px "Rajdhani", sans-serif';
          ctx.textAlign = 'center'; ctx.fillText(isAtk ? 'ATTACK' : 'SPEED', x+w/2, y+20);

          ctx.font = '700 32px "Rajdhani", sans-serif';
          ctx.fillText(`+${gate.value}`, x+w/2, y+h/2 + 10);

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
          if (l.type === LootType.PROJECTILE_UP) { color = '#00FF9C'; txt = 'GUNS'; } 
          if (l.type === LootType.ATK_UP_LARGE) { color = '#FF2A6D'; txt = 'ATK'; } 
          if (l.type === LootType.SPD_UP_LARGE) { color = '#05D9E8'; txt = 'SPD'; } 
          
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
        ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.rect(0, 0, b.width, b.height); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // 6. Particles
      particlesRef.current.forEach(p => {
          if (p.color === 'shockwave') {
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

          // Glow
          ctx.shadowBlur = 10; ctx.shadowColor = COLORS[seg.type] || '#fff';
          
          if (seg.type === SegmentType.HEAD) {
            ctx.fillStyle = COLORS[SegmentType.HEAD];
            ctx.beginPath(); 
            ctx.moveTo(x+w/2, y); ctx.lineTo(x+w, y+h/2); ctx.lineTo(x+w/2, y+h); ctx.lineTo(x, y+h/2); 
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#FFF'; 
            ctx.beginPath(); ctx.arc(x+w*0.35, y+h*0.4, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x+w*0.65, y+h*0.4, 4, 0, Math.PI*2); ctx.fill();
            
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
      const recoil = playerRef.current.recoilOffset;
      const px = playerRef.current.x + PLAYER_WIDTH/2;
      const py = playerRef.current.y + PLAYER_HEIGHT/2 + recoil;
      
      // Base
      ctx.fillStyle = COLORS.TURRET_BASE; 
      ctx.beginPath(); ctx.moveTo(px-30, py+20); ctx.lineTo(px+30, py+20); ctx.lineTo(px+20, py-10); ctx.lineTo(px-20, py-10); ctx.fill();
      
      // Core Glow
      ctx.shadowBlur = 15; ctx.shadowColor = COLORS.TURRET_CORE;
      ctx.fillStyle = COLORS.TURRET_CORE; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI*2); ctx.fill();
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
          ctx.fillStyle = COLORS.BULLET;
          ctx.shadowBlur = 20; ctx.shadowColor = COLORS.BULLET;
          for(let b=0; b<barrelCount; b++) {
             const bx = px - (totalBarrelW/2) + (b * barrelSpacing);
             ctx.beginPath(); ctx.arc(bx, py - 40, 4 + Math.random()*6, 0, Math.PI*2); ctx.fill();
          }
          ctx.shadowBlur = 0;
      }
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent | TouchEvent) => {
      handlePointerMove(e as PointerEvent);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerdown', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchstart', handleMove, { passive: false });
    
    return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerdown', handleMove);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchstart', handleMove);
    };
  }, [gameState, handlePointerMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full mx-auto bg-black overflow-hidden cursor-none touch-none select-none"
      style={{ 
        maxWidth: '100%', 
        maxHeight: '100%',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="w-full h-full block object-contain"
        style={{
          touchAction: 'none',
          display: 'block'
        }}
      />
    </div>
  );
};

export default GameCanvas;
