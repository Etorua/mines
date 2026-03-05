import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
    id: number;
    username: string;
    balance: number;
    is_admin: boolean;
}

interface Stats {
    totalUsers: number;
    totalUserBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalBets: number;
    totalWins: number;
    netProfit: number;
    availableCasinoFunds: number;
    totalCasinoWithdrawn: number;
}

const AdminDashboard: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [editBalance, setEditBalance] = useState<{ id: number, balance: number } | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user?.is_admin) {
            navigate('/');
            return;
        }
        fetchData();
    }, [isAuthenticated, user, navigate]);

    const fetchData = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/stats')
            ]);
            setUsers(usersRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBalance = async (id: number) => {
        if (!editBalance || editBalance.id !== id) return;
        try {
            await api.put(`/admin/users/${id}/balance`, { balance: editBalance.balance });
            setEditBalance(null);
            fetchData();
            alert('Balance actualizado correctamente');
        } catch (err) {
            console.error(err);
            alert('Error al actualizar balance');
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
        
        try {
            await api.post('/admin/withdraw', { amount: parseFloat(withdrawAmount) });
            setWithdrawAmount('');
            setShowWithdrawModal(false);
            fetchData();
            alert('Retiro exitoso');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Error al retirar fondos');
        }
    };

    if (loading) return <div className="p-8 text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 relative">
            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full border border-gray-700 shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-white">Retirar Fondos del Casino</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Saldo Disponible: <span className="text-green-400 font-mono">${Number(stats?.availableCasinoFunds).toFixed(2)}</span>
                        </p>
                        <input
                            type="number"
                            placeholder="Monto a retirar"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-4 focus:border-yellow-500 outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => setShowWithdrawModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleWithdraw}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded transition-colors"
                            >
                                Retirar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-yellow-400">Panel de Administrador</h1>
                <button 
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                >
                    Volver al Casino
                </button>
            </div>
            
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                        <p className="text-gray-400 text-sm">Usuarios Totales</p>
                        <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-green-500">
                        <p className="text-gray-400 text-sm">Balance Global Usuarios</p>
                        <p className="text-2xl font-bold text-green-400">${Number(stats.totalUserBalance).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-purple-500">
                        <p className="text-gray-400 text-sm">Total Apostado</p>
                        <p className="text-2xl font-bold text-purple-400">${Number(stats.totalBets).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-yellow-500 relative overflow-hidden group">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-gray-400 text-sm">Ganancia Casino (Neta)</p>
                                <p className={`text-2xl font-bold ${Number(stats.availableCasinoFunds) >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    ${Number(stats.availableCasinoFunds).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Histórico: ${Number(stats.netProfit).toFixed(2)}</p>
                             </div>
                             <button 
                                onClick={() => setShowWithdrawModal(true)}
                                className="bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black p-2 rounded transition-all"
                                title="Retirar Fondos"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/></svg>
                             </button>
                        </div>
                    </div>
                </div>
            )}

            <h2 className="text-xl font-semibold mb-4 text-gray-300">Gestión de Usuarios</h2>
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                            <th className="p-3">ID</th>
                            <th className="p-3">Usuario</th>
                            <th className="p-3">Balance Actual</th>
                            <th className="p-3">Rol</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-500">#{u.id}</td>
                                <td className="p-3 font-semibold">{u.username}</td>
                                <td className="p-3 text-green-400 font-mono">${u.balance}</td>
                                <td className="p-3">
                                    {u.is_admin ? (
                                        <span className="bg-red-900/50 text-red-200 px-2 py-1 rounded text-xs border border-red-800">Admin</span>
                                    ) : (
                                        <span className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded text-xs border border-blue-800">User</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            placeholder="Nuevo saldo"
                                            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 w-32 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                            onChange={(e) => setEditBalance({ id: u.id, balance: parseFloat(e.target.value) })}
                                        />
                                        <button 
                                            onClick={() => handleUpdateBalance(u.id)}
                                            className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-1.5 px-3.5 rounded transition-all active:scale-95 shadow-lg shadow-yellow-500/20"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
