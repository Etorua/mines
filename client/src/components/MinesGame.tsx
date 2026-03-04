import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Bomb, 
  Diamond, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  History, 
  ShieldCheck, 
  Play, 
  LogOut,
  Grid3X3,
  LayoutGrid,
  Wallet,
  X
} from 'lucide-react';

// Sound effects URLs
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  gem: 'https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3',
  explode: 'https://assets.mixkit.co/active_storage/sfx/1701/1701-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/1120/1120-preview.mp3',
  hover: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
};

const GRID_SIZES = [3, 4, 5, 6, 7];

const MinesGame: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  
  // Game Configuration State
  const [betAmount, setBetAmount] = useState<number>(10);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gridSize, setGridSize] = useState<number>(5);
  
  // Game Play State
  const [gameId, setGameId] = useState<number | null>(null);
  const [activeer, setActiveer] = useState<boolean>(false); // Is a game currently running?
  const [revealedCells, setRevealedCells] = useState<number[]>([]);
  const [mineLocations, setMineLocations] = useState<number[]>([]); // Only known after loss
  const [currentProfit, setCurrentProfit] = useState<number>(0);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [isCashout, setIsCashout] = useState<boolean>(false);
  
  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [inLobby, setInLobby] = useState<boolean>(true);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  // Data State
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [jackpot, setJackpot] = useState<number>(12450.32);

  // Refs for Audio
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Initialize Audio
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      audioRefs.current[key] = new Audio(url);
      audioRefs.current[key].volume = 0.4;
    });
    
    // Auto-update jackpot simulation
    const interval = setInterval(() => {
      setJackpot(prev => prev + Math.random() * 0.05);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Fetch initial game state and history
  useEffect(() => {
    fetchActiveGame();
    fetchRecentGames();
    const feedInterval = setInterval(fetchRecentGames, 5000);
    return () => clearInterval(feedInterval);
  }, []);

  const playSound = (name: string) => {
    if (soundEnabled && audioRefs.current[name]) {
      audioRefs.current[name].currentTime = 0;
      audioRefs.current[name].play().catch(() => {});
    }
  };

  const fetchActiveGame = async () => {
    try {
      const { data } = await api.get('/games/active');
      if (data) {
        setGameId(data.gameId);
        setBetAmount(parseFloat(data.betAmount));
        setMinesCount(data.minesCount);
        setRevealedCells(data.revealedCells || []);
        setCurrentProfit(parseFloat(data.profit || 0));
        setGridSize(data.gridSize || 5); // Restore grid size
        setActiveer(true);
        setInLobby(false);
      }
    } catch (error) {
      console.error("Error fetching active game", error);
    }
  };

  const fetchRecentGames = async () => {
    try {
      const { data } = await api.get('/games/recent');
      setRecentGames(data);
    } catch (error) {
      console.error("Recent games error:", error);
    }
  };

  const startGame = async () => {
    if (betAmount > user!.balance) {
      alert("Fondos insuficientes");
      return;
    }
    
    playSound('click');
    setIsLoading(true);
    setMineLocations([]);
    setIsExploded(false);
    setIsCashout(false);
    setRevealedCells([]);
    setCurrentProfit(0);
    
    try {
      const { data } = await api.post('/games/start', { 
        betAmount, 
        minesCount,
        gridSize 
      });
      
      setGameId(data.gameId);
      setActiveer(true);
      await refreshUser();
    } catch (error) {
      alert("Error al iniciar juego");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = async (index: number) => {
    if (!gameId || isExploded || isCashout || revealedCells.includes(index) || isLoading) return;

    setIsLoading(true);
    try {
      const { data } = await api.post('/games/reveal', { gameId, cellIndex: index });
      
      if (data.status === 'exploded') {
        setIsExploded(true);
        setMineLocations(data.mineLocations);
        playSound('explode');
        setActiveer(false);
        fetchRecentGames(); // Update feed immediately
      } else {
        setRevealedCells(data.revealedCells);
        setCurrentProfit(parseFloat(data.profit));
        playSound('gem');
      }
    } catch (error) {
      console.error("Reveal error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const cashout = async () => {
    if (!gameId || isExploded || isCashout) return;
    
    setIsLoading(true);
    try {
      await api.post('/games/cashout', { gameId });
      setIsCashout(true);
      setActiveer(false);
      playSound('win');
      await refreshUser();
      fetchRecentGames(); // Update feed immediately
    } catch (error) {
      console.error("Cashout error", error);
    } finally {
      setIsLoading(false);
    }
  };
      // Simulación de validación de tarjeta
      if (paymentMethod === 'card') {
          if (cardNumber.length < 16 || expiry.length < 5 || cvc.length < 3) {
              alert("Por favor complete los datos de la tarjeta correctamente");
              return;
          }
      }

      setIsLoading(true);
      try {
          // Simular tiempo de procesamiento de pago
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          await api.post('/users/deposit', { amount: depositAmount });
          await refreshUser();
          setShowDepositModal(false);
          playSound('win'); // Feedback sound
          
          // Reset fields
          setCardNumber('');
          setExpiry('');
          setCvc('');
          await api.post('/users/deposit', { amount: depositAmount });
          await refreshUser();
          setShowDepositModal(false);
          playSound('win'); // Feedback sound
      } catch (error) {
          console.error("Deposit error", error);
          alert("Error al depositar fondos");
      } finally {
          setIsLoading(false);
      }
  };

  // Helper to calculate potential next multiplier locally for UI preview
  const getNextMultiplier = () => {
    // Simplified probability logic for UI display only
    const totalCells = gridSize * gridSize;
    const remainingSafe = (totalCells - minesCount) - revealedCells.length;
    const remainingTotal = totalCells - revealedCells.length;
    if (remainingTotal === 0) return 0;
    
    const prob = remainingSafe / remainingTotal;
    const multi = (1 / prob) * 0.97;
    
    // Approximate current multiplier
    let currentMult = 1;
    for(let i=0; i<revealedCells.length; i++) {
        const rS = (totalCells - minesCount) - i;
        const rT = totalCells - i;
        currentMult *= (1 / (rS/rT));
    }
    currentMult *= 0.97; // House edge
    
    return (currentMult * multi).toFixed(2);
  };

  // Dynamic grid styling
  const getGridStyle = () => {
    return {
      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    };
  };

  const renderLobby = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#0f212e] text-white p-8 animate-fade-in">
        <div className="text-center mb-12">
            <h1 className="text-6xl font-black text-[#00E701] mb-4 tracking-tighter drop-shadow-lg">MINES</h1>
            <p className="text-gray-400 text-xl font-light">El juego de casino #1 del mundo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12">
            <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-700 hover:border-[#00E701] transition-all cursor-pointer group" onClick={() => setInLobby(false)}>
                <div className="h-16 w-16 bg-[#00E701]/20 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                    <Play size={32} className="text-[#00E701]" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Jugar Ahora</h3>
                <p className="text-gray-400 text-center text-sm">Empieza tu racha ganadora</p>
            </div>

            <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-700">
                <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <TrendingUp size={32} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Jackpot Global</h3>
                <p className="text-green-400 text-center text-xl font-mono">${jackpot.toFixed(2)}</p>
            </div>

            <div className="bg-[#1a2c38] p-6 rounded-xl border border-gray-700">
                <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <History size={32} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Recientes</h3>
                <p className="text-gray-400 text-center text-sm">{recentGames.length} juegos jugados hoy</p>
            </div>
        </div>

        <div className="w-full max-w-5xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={18}/> Últimos Juegos</h3>
            <div className="bg-[#1a2c38] rounded-xl overflow-hidden shadow-lg">
                <div className="grid grid-cols-4 bg-[#233542] p-3 text-sm font-semibold text-gray-300">
                    <div>Jugador</div>
                    <div>Apuesta</div>
                    <div>Resultado</div>
                    <div>Hora</div>
                </div>
                {recentGames.slice(0, 5).map((game: any, i) => (
                    <div key={i} className="grid grid-cols-4 p-3 border-b border-gray-700 text-sm hover:bg-[#233542] transition-colors">
                        <div className="text-gray-300 truncate">Usuario #{game.user_id}</div>
                        <div className="text-gray-400">${parseFloat(game.bet_amount).toFixed(2)}</div>
                        <div className={game.profit > 0 ? "text-[#00E701]" : "text-red-500"}>
                            {game.profit > 0 ? `+$${parseFloat(game.profit).toFixed(2)}` : "BOOM"}
                        </div>
                        <div className="text-gray-500">{new Date(game.created_at).toLocaleTimeString()}</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  if (inLobby) return renderLobby();

  // Calculate max mines based on grid size
  const totalCells = gridSize * gridSize;
  const maxMines = totalCells - 1;

  return (
    <div className="min-h-screen bg-[#0f212e] text-gray-200 font-sans p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 bg-[#1a2c38] p-4 rounded-xl shadow-lg border-b border-[#2f4553]">
        <div className="flex items-center gap-4">
             <button onClick={() => setInLobby(true)} className="p-2 hover:bg-[#2f4553] rounded-lg transition-colors">
                <Grid3X3 className="text-gray-400 hover:text-white" />
             </button>
            <h1 className="text-2xl font-bold text-white tracking-wide">MINES CASINO</h1>
            <span className="bg-[#00E701]/10 text-[#00E701] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Live
            </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end mr-2">
             <span className="text-xs text-gray-500 uppercase font-bold">Saldo</span>
             <div className="flex items-center gap-2">
                <span className="text-[#00E701] font-mono text-xl font-bold">${typeof user?.balance === 'number' ? user.balance.toFixed(2) : parseFloat(user?.balance || '0').toFixed(2)}</span>
                <button 
                  onClick={() => setShowDepositModal(true)}
                  className="bg-[#2f4553] hover:bg-[#00E701] hover:text-black text-[#00E701] p-1 rounded transition-colors"
                  title="Agregar Fondos"
                >
                    <Wallet size={14} />
                </button>
             </div>
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-[#2f4553] rounded-full hover:bg-[#3d5565] transition-colors"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={logout} className="ml-2 text-gray-500 hover:text-red-400">
             <LogOut size={20}/>
          </button>
        </div>
      </div>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-[#1a2c38] p-6 rounded-2xl max-w-md w-full border border-[#2f4553] shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wallet className="text-[#00E701]" /> Agregar Fondos
                    </h2>
                    <button onClick={() => setShowDepositModal(false)} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button> mb-6">
                        {[100, 500, 1000, 5000].map(amt => (
                            <button
                                key={amt}
                                onClick={() => setDepositAmount(amt)}
                                className="flex-1 bg-[#2f4553] hover:bg-[#3d5565] text-sm font-medium py-2 rounded-lg transition-colors text-gray-300 hover:text-white border border-transparent hover:border-gray-600"
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-3 block tracking-wider">
                            Método de Pago
                        </label>
                        <div className="flex gap-2 mb-4">
                            <button 
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${paymentMethod === 'card' ? 'border-[#00E701] bg-[#00E701]/10 text-white' : 'border-gray-700 bg-[#0f212e] text-gray-400'}`}
                            >
                                Tarjeta de Crédito
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('crypto')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${paymentMethod === 'crypto' ? 'border-[#00E701] bg-[#00E701]/10 text-white' : 'border-gray-700 bg-[#0f212e] text-gray-400'}`}
                            >
                                Criptomonedas
                            </button>
                        </div>

                        {paymentMethod === 'card' ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Número de Tarjeta</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="0000 0000 0000 0000"
                                            maxLength={19}
                                            value={cardNumber}
                                            onChange={(e) => {
                                                const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                                setCardNumber(v.substring(0, 19));
                                            }}
                                            className="w-full bg-[#0f212e] border border-[#2f4553] rounded-lg py-2 px-3 text-white focus:border-[#00E701] focus:outline-none transition-all placeholder-gray-600 font-mono"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                            <div className="w-8 h-5 bg-gray-600 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Expiración</label>
                                        <input 
                                            type="text" 
                                            placeholder="MM/YY"
                                            maxLength={5}
                                            value={expiry}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '');
                                                if(v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
                                                setExpiry(v);
                                            }}
                                            className="w-full bg-[#0f212e] border border-[#2f4553] rounded-lg py-2 px-3 text-white focus:border-[#00E701] focus:outline-none transition-all placeholder-gray-600 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">CVC</label>
                                        <input 
                                            type="text" 
                                            placeholder="123"
                                            maxLength={3}
                                            value={cvc}
                                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0,3))}
                                            className="w-full bg-[#0f212e] border border-[#2f4553] rounded-lg py-2 px-3 text-white focus:border-[#00E701] focus:outline-none transition-all placeholder-gray-600 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#0f212e] p-4 rounded-lg text-center border border-[#2f4553] animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-gray-400 text-sm mb-2">Envía USDT (TRC20) a:</p>
                                <div className="bg-black/30 p-2 rounded text-xs font-mono text-[#00E701] break-all border border-dashed border-gray-700">
                                    T9yD14Nj9...jkl329dh
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Los fondos se acreditarán automáticamente después de 1 confirmación.</p>
                            </div>
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleDeposit}
                    disabled={isLoading || depositAmount <= 0}
                    className="w-full bg-[#00E701] hover:bg-[#00c501] text-black font-black uppercase tracking-wider py-4 rounded-lg shadow-[0_0_20px_rgba(0,231,1,0.3)] hover:shadow-[0_0_30px_rgba(0,231,1,0.5)] transition-all disabled:opacity-50 disabled:shadow-none translate-y-0 active:translate-y-1 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                            Procesando Pago...
                        </>
                    ) : (
                        `Pagar $${depositAmount}`
                    )
                            <button
                                key={amt}
                                onClick={() => setDepositAmount(amt)}
                                className="flex-1 bg-[#2f4553] hover:bg-[#3d5565] text-sm font-medium py-2 rounded-lg transition-colors text-gray-300 hover:text-white border border-transparent hover:border-gray-600"
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleDeposit}
                    disabled={isLoading || depositAmount <= 0}
                    className="w-full bg-[#00E701] hover:bg-[#00c501] text-black font-black uppercase tracking-wider py-4 rounded-lg shadow-[0_0_20px_rgba(0,231,1,0.3)] hover:shadow-[0_0_30px_rgba(0,231,1,0.5)] transition-all disabled:opacity-50 disabled:shadow-none translate-y-0 active:translate-y-1"
                >
                    {isLoading ? "Procesando..." : "Depositar Ahora"}
                </button>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#1a2c38] p-6 rounded-xl shadow-lg border border-[#2f4553]">
            {/* Bet Input */}
            <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">
                Importe de Apuesta
              </label>
              <div className="relative group">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                  disabled={activeer}
                  className="w-full bg-[#0f212e] border-2 border-[#2f4553] rounded-lg py-3 px-4 text-white font-mono focus:border-[#00E701] focus:outline-none transition-all disabled:opacity-50"
                  placeholder="0.00"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                   <button 
                     onClick={() => setBetAmount(prev => prev / 2)}
                     disabled={activeer}
                     className="px-2 py-1 text-xs bg-[#2f4553] rounded hover:bg-[#3d5565] disabled:opacity-50"
                   >½</button>
                   <button 
                     onClick={() => setBetAmount(prev => prev * 2)}
                     disabled={activeer}
                     className="px-2 py-1 text-xs bg-[#2f4553] rounded hover:bg-[#3d5565] disabled:opacity-50"
                   >2x</button>
                </div>
              </div>
            </div>

            {/* Grid Size Selector */}
             <div className="mb-6">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider flex justify-between">
                     <span>Tamaño de Cuadrícula</span>
                     <span className="text-white">{gridSize}x{gridSize}</span>
                 </label>
                 <div className="flex gap-2">
                     {GRID_SIZES.map(size => (
                         <button
                            key={size}
                            onClick={() => {
                                setGridSize(size);
                                // Adjust mines if they exceed new max
                                if (minesCount >= (size*size)) {
                                    setMinesCount(1);
                                }
                            }}
                            disabled={activeer}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                                gridSize === size 
                                ? 'bg-[#00E701]/20 border-[#00E701] text-[#00E701]' 
                                : 'bg-[#0f212e] border-transparent hover:bg-[#2f4553] text-gray-400'
                            } disabled:opacity-50`}
                         >
                             {size}x
                         </button>
                     ))}
                 </div>
             </div>

            {/* Mines Slider */}
            <div className="mb-8">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider flex justify-between">
                <span>Minas</span>
                <span className="text-white bg-[#0f212e] px-2 py-1 rounded">{minesCount}</span>
              </label>
              <input 
                type="range"
                min="1"
                max={maxMines}
                value={minesCount}
                onChange={(e) => setMinesCount(Number(e.target.value))}
                disabled={activeer}
                className="w-full h-2 bg-[#0f212e] rounded-lg appearance-none cursor-pointer accent-[#00E701] hover:accent-[#00ff00] transition-all disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                 <span>1</span>
                 <span>{maxMines}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={activeer ? cashout : startGame}
              disabled={isLoading}
              className={`w-full py-4 rounded-lg font-black text-lg uppercase tracking-widest shadow-lg transform transition-all active:scale-95 ${
                activeer 
                  ? 'bg-[#00E701] hover:bg-[#00c700] text-[#0f212e] shadow-[#00E701]/20' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {isLoading ? 'Procesando...' : (
                activeer ? (
                  <div className="flex flex-col items-center leading-tight">
                    <span>Retirar</span>
                    <span className="text-sm opacity-80">${(betAmount + currentProfit).toFixed(2)}</span>
                  </div>
                ) : 'Apostar'
              )}
            </button>
          </div>
          
          {/* Game Info Panel */}
          {activeer && (
             <div className="bg-[#1a2c38] p-4 rounded-xl border border-[#2f4553] animate-fade-in">
                 <div className="flex justify-between mb-2">
                     <span className="text-gray-400 text-sm">Próximo Mult.</span>
                     <span className="text-[#00E701] font-mono">{getNextMultiplier()}x</span>
                 </div>
                 <div className="flex justify-between">
                     <span className="text-gray-400 text-sm">Ganancia Actual</span>
                     <span className="text-[#00E701] font-mono">+${currentProfit.toFixed(2)}</span>
                 </div>
             </div>
          )}
        </div>

        {/* Main Game Grid */}
        <div className="lg:col-span-9">
          <div className="bg-[#0f212e] rounded-2xl p-4 md:p-8 h-full min-h-[500px] flex items-center justify-center relative border border-[#2f4553] shadow-2xl">
            {/* Overlay for Cashout/Loss */}
            {(isExploded || isCashout) && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl animate-fade-in">
                <div className="bg-[#1a2c38] p-8 rounded-2xl border-2 border-[#2f4553] shadow-2xl text-center transform scale-110">
                  {isExploded ? (
                    <>
                       <Bomb size={64} className="text-red-500 mx-auto mb-4 animate-bounce" />
                       <h2 className="text-4xl font-black text-red-500 mb-2">¡BOOM!</h2>
                       <p className="text-gray-400">Has perdido ${(betAmount).toFixed(2)}</p>
                    </>
                  ) : (
                    <>
                       <div className="h-16 w-16 bg-[#00E701]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Diamond size={32} className="text-[#00E701]" />
                       </div>
                       <h2 className="text-4xl font-black text-white mb-2">¡VICTORIA!</h2>
                       <p className="text-[#00E701] text-2xl font-mono text-shadow-glow">+${currentProfit.toFixed(2)}</p>
                    </>
                  )}
                  <button 
                    onClick={() => {
                        setIsExploded(false);
                        setIsCashout(false);
                        setActiveer(false);
                        setRevealedCells([]);
                        setCurrentProfit(0);
                    }}
                    className="mt-6 px-8 py-3 bg-[#2f4553] hover:bg-[#3d5565] text-white rounded-lg font-bold transition-all"
                  >
                    Jugar de Nuevo
                  </button>
                </div>
              </div>
            )}

            {/* Grid */}
            <div 
                className="grid gap-2 md:gap-3 w-full max-w-2xl mx-auto transition-all duration-300"
                style={getGridStyle()}
            >
              {Array.from({ length: totalCells }).map((_, index) => {
                const isRevealed = revealedCells.includes(index);
                const isMine = mineLocations.includes(index);
                const isInteractable = activeer && !isRevealed && !isExploded && !isCashout;

                return (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={!isInteractable}
                    onMouseEnter={() => isInteractable && playSound('hover')}
                    className={`
                      aspect-square rounded-lg md:rounded-xl relative overflow-hidden transition-all duration-300 transform
                      ${isInteractable ? 'hover:-translate-y-1 hover:shadow-lg hover:shadow-[#00E701]/20 cursor-pointer bg-[#2f4553]' : ''}
                      ${isRevealed ? 'bg-[#071824]' : 'bg-[#2f4553]'}
                      ${isMine && isExploded ? 'bg-red-500/20 border-2 border-red-500' : ''}
                      ${!isRevealed && !isInteractable && !isMine ? 'opacity-50' : ''}
                    `}
                  >
                    {isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center animate-pop-in">
                        <Diamond size={gridSize > 5 ? 24 : 32} className="text-[#00E701] drop-shadow-[0_0_10px_rgba(0,231,1,0.5)]" />
                      </div>
                    )}
                    {isMine && (isExploded || isCashout) && (
                      <div className="absolute inset-0 flex items-center justify-center animate-shake">
                        <Bomb size={gridSize > 5 ? 24 : 32} className={`${isExploded ? 'text-red-500' : 'text-gray-500 opacity-50'}`} />
                      </div>
                    )}
                    {!isRevealed && !isExploded && !isCashout && (
                        <div className="absolute inset-0 bg-[#2f4553] hover:bg-[#3d5565] transition-colors rounded-lg md:rounded-xl border-b-4 border-[#1a2c38]"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinesGame;
