import React, { useState, useEffect, useContext } from 'react';
import { Diamond, Bomb, AlertCircle, Coins, DollarSign, ArrowRight } from 'lucide-react';

import api from '../api';
import { AuthContext } from '../context/AuthContext';

const MinesGame = () => {
    const { user, refreshProfile } = useContext(AuthContext);
    const [betAmount, setBetAmount] = useState(10);
    const [minesCount, setMinesCount] = useState(3);
    const [gameId, setGameId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'cashed_out' | 'exploded'>('idle');
    const [revealedCells, setRevealedCells] = useState<number[]>([]);
    const [mineLocations, setMineLocations] = useState<number[]>([]);
    const [profit, setProfit] = useState(0);
    const [potentialWin, setPotentialWin] = useState(0);
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);
    
    // Wallet Modal State
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
    const [transactionAmount, setTransactionAmount] = useState(100);

    // This handles the generic check for active games.
    useEffect(() => {
        checkActiveGame();
    }, []);

    const handleTransaction = (type: 'deposit' | 'withdraw') => {
        setTransactionType(type);
        setTransactionAmount(100); // Reset default amount
        setShowWalletModal(true);
    };

    const confirmTransaction = async () => {
        if (transactionAmount <= 0) return;
        setLoading(true);
        try {
            const endpoint = transactionType === 'deposit' ? '/users/deposit' : '/users/withdraw';
            await api.post(endpoint, { amount: transactionAmount });
            
            // Wait a sec for visual effect then refresh
            setTimeout(async () => {
                await refreshProfile();
                setShowWalletModal(false);
                setLoading(false);
            }, 500);
            
            setError(''); 
        } catch (err: any) {
             setError(err.response?.data?.error || "Transaction failed");
             setLoading(false);
        }
    };

    const checkActiveGame = async () => {
        try {
            const res = await api.get('/games/active');
            if (res.data) {
                setGameId(res.data.gameId);
                setBetAmount(res.data.betAmount);
                setMinesCount(res.data.minesCount);
                setRevealedCells(res.data.revealedCells);
                setProfit(parseFloat(res.data.profit));
                setGameState('playing');
                // Calculate next win? We need backend for that accurately or replicate logic
            }
        } catch (err) {
            console.error("No active game or error", err);
        }
    };

    const startGame = async () => {
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/games/start', { betAmount, minesCount });
            setGameId(res.data.gameId);
            setGameState('playing');
            setRevealedCells([]);
            setMineLocations([]);
            setProfit(0);
            setPotentialWin(0); // Will be updated on reveal
            await refreshProfile();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to start game");
        } finally {
            setLoading(false);
        }
    };

    const revealCell = async (index: number) => {
        if (gameState !== 'playing' || loading || revealedCells.includes(index)) return;
        setLoading(true);
        try {
            const res = await api.post('/games/reveal', { gameId, cellIndex: index });
            
            if (res.data.status === 'exploded') {
                setGameState('exploded');
                setMineLocations(res.data.mineLocations);
                setRevealedCells((prev) => [...prev, index]); // Add the exploded one
            } else {
                setRevealedCells(res.data.revealedCells);
                setProfit(parseFloat(res.data.profit));
                setPotentialWin(parseFloat(res.data.potentialWin));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Error revealing cell");
        } finally {
            setLoading(false);
        }
    };

    const cashout = async () => {
        if (gameState !== 'playing' || loading) return;
        setLoading(true);
        try {
            const res = await api.post('/games/cashout', { gameId });
            setGameState('cashed_out');
            setProfit(parseFloat(res.data.totalWin) - betAmount); // Show net profit
            await refreshProfile();
        } catch (err: any) {
            setError(err.response?.data?.error || "Error cashing out");
        } finally {
            setLoading(false);
        }
    };

    const renderCell = (index: number) => {
        const isRevealed = revealedCells.includes(index);
        const isMine = mineLocations.includes(index);
        const isExploded = gameState === 'exploded' && isMine;
        
        let content = null;
        let bgClass = "bg-gray-700 hover:bg-gray-600";

        if (isRevealed) {
            if (isExploded) {
                content = <Bomb className="w-8 h-8 text-white animate-pulse" />;
                bgClass = "bg-red-600";
            } else if (isMine) {
                 content = <Bomb className="w-6 h-6 text-gray-400" />;
                 bgClass = "bg-gray-800 opacity-50";
            } else {
                content = <Diamond className="w-8 h-8 text-green-400 drop-shadow-lg" />;
                bgClass = "bg-gray-800 border-2 border-green-500/30";
            }
        } else if (gameState === 'exploded' && isMine) {
             content = <Bomb className="w-6 h-6 text-gray-500" />;
             bgClass = "bg-gray-800 opacity-40";
        } else if (gameState === 'cashed_out' && revealedCells.includes(index)) {
             content = <Diamond className="w-8 h-8 text-green-400 opacity-50" />;
             bgClass = "bg-gray-800";
        }

        return (
            <button
                key={index}
                disabled={gameState !== 'playing' || isRevealed}
                onClick={() => revealCell(index)}
                className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-95 duration-200 ${bgClass} ${
                    gameState === 'playing' && !isRevealed ? 'cursor-pointer shadow-lg shadow-black/20' : 'cursor-default'
                }`}
            >
                {content}
            </button>
        );
    };


    return (
        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto p-6 text-white min-h-[600px] relative">
            
            {/* Wallet Modal */}
            {showWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl relative z-50 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowWalletModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"
                        >✕</button>
                        
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                            {transactionType === 'deposit' ? <ArrowRight className="rotate-90 text-green-500" /> : <ArrowRight className="-rotate-90 text-red-500" />}
                            {transactionType === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
                        </h2>

                        <div className="mb-6">
                            <label className="text-xs uppercase font-bold text-gray-400 block mb-2">Amount</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="number"
                                    value={transactionAmount}
                                    onChange={(e) => setTransactionAmount(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none font-mono text-lg"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-between mb-6">
                            {[10, 50, 100, 500, 1000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setTransactionAmount(amt)}
                                    className={`flex-1 py-2 px-1 text-sm rounded border transition-colors ${transactionAmount === amt
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                        }`}
                                >
                                    ${amt}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={confirmTransaction}
                            disabled={loading || transactionAmount <= 0}
                            className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 duration-200 flex items-center justify-center gap-2 ${transactionType === 'deposit'
                                    ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20 text-white'
                                    : 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 text-white'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                `Confirm ${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}`
                            )}
                        </button>
                    </div>
                </div>
            )}
            
            {showWalletModal && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setShowWalletModal(false)}
                />
            )}

            {/* Sidebar Controls */}
            <div className="w-full lg:w-1/3 bg-gray-900 p-6 rounded-2xl shadow-xl shadow-black/40 border border-gray-800 flex flex-col gap-6">
                
                {/* Balance & User */}
                <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">User</span>
                            <span className="font-semibold">{user?.username}</span>
                        </div>
                     </div>
                     <div className="text-right">
                         <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Balance</span>
                         <div className="flex items-center gap-1 text-green-400 font-mono text-lg font-bold">
                             <DollarSign size={16} />
                             {user?.balance}
                         </div>
                     </div>
                </div>

                {/* Wallet Controls */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleTransaction('deposit')}
                        disabled={gameState === 'playing'}
                        className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors border border-gray-700 disabled:opacity-50"
                    >
                        + Deposit
                    </button>
                    <button 
                        onClick={() => handleTransaction('withdraw')}
                        disabled={gameState === 'playing'}
                        className="bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors border border-gray-700 disabled:opacity-50"
                    >
                        - Withdraw
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Bet Amount</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            disabled={gameState === 'playing'}
                            className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-3 px-4 pl-10 font-mono text-lg focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-gray-400 text-sm font-semibold uppercase tracking-wider flex justify-between">
                        <span>Mines</span>
                        <span className="text-white bg-gray-700 px-2 rounded text-xs py-0.5">{minesCount}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="24"
                        value={minesCount}
                        onChange={(e) => setMinesCount(Number(e.target.value))}
                        disabled={gameState === 'playing'}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                        <span>1</span>
                        <span>24</span>
                    </div>
                </div>

                <div className="mt-auto">
                    {gameState === 'playing' ? (
                        <div className="flex flex-col gap-3">
                             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-2">
                                <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Current Profit</div>
                                <div className="text-2xl font-mono text-green-400 font-bold flex items-center gap-1">
                                    <DollarSign size={20}/> {profit.toFixed(2)}
                                </div>
                             </div>
                            <button
                                onClick={cashout}
                                disabled={loading || revealedCells.length === 0}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                            > 
                                Cashout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={startGame}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                        >
                            Start Game
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-start gap-2 text-sm mt-4">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        {error}
                    </div>
                )}
            </div>

            {/* Game Grid Area */}
            <div className="flex-1 bg-gray-900 p-8 rounded-2xl shadow-xl shadow-black/40 border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-900/0 to-gray-900/0 pointer-events-none"></div>
                
                <div className="grid grid-cols-5 gap-3 w-full max-w-[500px] relative z-10">
                    {Array.from({ length: 25 }).map((_, i) => renderCell(i))}
                </div>

                {gameState === 'exploded' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-2xl animate-in fade-in duration-300">
                        <div className="bg-gray-800 p-8 rounded-2xl border border-red-500/30 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
                             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                                <Bomb className="w-8 h-8 text-red-500" />
                             </div>
                             <h2 className="text-3xl font-bold text-white">BUSTED!</h2>
                             <p className="text-gray-400">You hit a mine and lost your bet.</p>
                             <button onClick={() => setGameState('idle')} className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">Try Again</button>
                        </div>
                    </div>
                )}
                 
                 {gameState === 'cashed_out' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-2xl animate-in fade-in duration-300">
                        <div className="bg-gray-800 p-8 rounded-2xl border border-green-500/30 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
                             <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                <Coins className="w-8 h-8 text-green-500" />
                             </div>
                             <h2 className="text-3xl font-bold text-white">YOU WON!</h2>
                             <p className="text-green-400 text-2xl font-mono font-bold">+${profit.toFixed(2)}</p>
                             <button onClick={() => setGameState('idle')} className="mt-4 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors">Play Again</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinesGame;
