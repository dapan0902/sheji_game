import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { Zap, Crosshair, Trophy, Skull, Play, RotateCcw, Swords, Hexagon } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [stats, setStats] = useState({ atk: 100, spd: 3.0, proj: 1 });

  return (
    <div className="h-[100dvh] w-full bg-[#02000A] flex flex-col items-center justify-center font-['Rajdhani'] text-white overflow-hidden touch-none select-none">
      
      <div className="flex flex-col h-full w-full max-w-md relative border-x border-white/5">
        
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
             <div className="bg-[#1A1A24]/80 backdrop-blur-md px-4 py-2 rounded-none border-l-4 border-[#FFD700] flex items-center gap-3 clip-path-polygon">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
                <span className="text-2xl font-bold tracking-widest">{score.toLocaleString()}</span>
             </div>
             <div className="bg-[#1A1A24]/80 backdrop-blur-md px-4 py-2 border-r-4 border-[#00FF9C] flex items-center gap-2">
                <Hexagon className="w-4 h-4 text-[#00FF9C]" fill="currentColor" />
                <span className="text-lg font-bold">WAVE {Math.floor(level / 10) + 1}</span>
             </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 w-full h-full relative">
          <GameCanvas 
            gameState={gameState} 
            setGameState={setGameState} 
            setScore={setScore}
            setLevel={setLevel}
            setPlayerStats={setStats}
          />

          {/* Start Overlay */}
          {gameState === GameState.START && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6">
                 <div className="mb-12 text-center">
                    <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#00FF9C] to-[#05D9E8] drop-shadow-[0_0_15px_rgba(0,255,156,0.5)] tracking-tighter">
                        NEON<br/>DEFENSE
                    </h1>
                    <div className="mt-4 h-1 w-32 bg-[#FF2A6D] mx-auto shadow-[0_0_10px_#FF2A6D]"></div>
                 </div>

                 <button 
                   onClick={() => setGameState(GameState.PLAYING)}
                   className="w-full max-w-xs py-5 bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 border border-[#00FF9C] backdrop-blur-md transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                 >
                    <div className="absolute inset-0 bg-[#00FF9C] opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <Play className="w-8 h-8 text-[#00FF9C]" />
                    <span className="text-3xl font-bold text-[#00FF9C] tracking-[0.2em]">ENGAGE</span>
                 </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === GameState.GAMEOVER && (
            <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-6">
                 <div className="bg-[#1A1A24] border border-[#FF2A6D] p-8 w-full max-w-xs text-center shadow-[0_0_50px_rgba(255,42,109,0.2)]">
                     <Skull className="w-20 h-20 text-[#FF2A6D] mx-auto mb-4 animate-pulse" strokeWidth={1.5} />
                     <h2 className="text-4xl font-bold text-[#FF2A6D] mb-2 tracking-widest">CRITICAL FAILURE</h2>
                     <p className="text-slate-400 font-bold mb-8 text-xl">SCORE: {score.toLocaleString()}</p>
                     
                     <button 
                       onClick={() => setGameState(GameState.START)}
                       className="w-full py-4 bg-[#FF2A6D] text-white hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold tracking-wider"
                     >
                        <RotateCcw className="w-6 h-6" />
                        REBOOT SYSTEM
                     </button>
                 </div>
            </div>
          )}
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
           <div className="bg-[#0B0B15]/95 text-white backdrop-blur-xl p-6 border-t border-white/10 flex justify-between items-center">
               
               {/* Stat: Attack */}
               <div className="flex flex-col items-center w-1/3 border-r border-white/5">
                   <div className="flex items-center gap-2 text-[#FF2A6D] mb-1">
                       <Swords size={18} />
                       <span className="text-xs font-bold tracking-widest opacity-80">ATTACK</span>
                   </div>
                   <span className="text-3xl font-bold drop-shadow-[0_0_5px_rgba(255,42,109,0.8)]">{stats.atk}</span>
               </div>

               {/* Stat: Speed */}
               <div className="flex flex-col items-center w-1/3 border-r border-white/5">
                   <div className="flex items-center gap-2 text-[#05D9E8] mb-1">
                       <Zap size={18} fill="currentColor" />
                       <span className="text-xs font-bold tracking-widest opacity-80">SPEED</span>
                   </div>
                   <span className="text-3xl font-bold drop-shadow-[0_0_5px_rgba(5,217,232,0.8)]">{stats.spd}</span>
               </div>

               {/* Stat: Proj */}
               <div className="flex flex-col items-center w-1/3">
                   <div className="flex items-center gap-2 text-[#00FF9C] mb-1">
                       <Crosshair size={18} />
                       <span className="text-xs font-bold tracking-widest opacity-80">SYSTEMS</span>
                   </div>
                   <span className="text-3xl font-bold drop-shadow-[0_0_5px_rgba(0,255,156,0.8)]">{stats.proj}</span>
               </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
