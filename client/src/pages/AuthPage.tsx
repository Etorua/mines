import React, { useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';

const AuthPage = () => {
    const { login } = useContext(AuthContext);
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const endpoint = isLogin ? '/users/login' : '/users/register';
            const res = await api.post(endpoint, { username, password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border border-gray-800">
                <div className="p-8">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-white mb-2">Mines Casino</h1>
                        <p className="text-gray-400">Play safe, win big.</p>
                    </div>

                    <div className="flex bg-gray-800 p-1 rounded-lg mb-8">
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Sign In
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Create Account
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                required
                            />
                        </div>

                        {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Get Started'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-800 p-4 text-center text-xs text-gray-500 border-t border-gray-700">
                    Secure 256-bit encryption. Provably fair.
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
