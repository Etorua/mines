import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MinesGame from './components/MinesGame';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard'; // Ensure this path is correct

const AppContent = () => {
    const { isAuthenticated, logout, user } = useAuth();
    console.log("App User:", user);

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return (
        <div className="min-h-screen bg-black text-white antialiased">
             {/* Simple Header */}
             <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50 shadow-md shadow-indigo-900/10">
                 <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                     <Link to="/" className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">M</div>
                         <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">MINES</span>
                     </Link>
                     <div className="flex items-center gap-4">
                         {user?.is_admin && (
                             <div className="flex items-center gap-4">
                                <span className="text-xs font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded border border-yellow-500/30">ADMIN</span>
                                <Link to="/admin" className="text-yellow-400 font-bold hover:text-yellow-300 transition-colors">
                                    Admin Panel
                                </Link>
                             </div>
                         )}
                         <div className="hidden md:flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-700/50">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></span>
                             <span className="text-sm font-medium text-gray-300">Live</span>
                         </div>
                         <button 
                            onClick={logout} 
                            className="bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 hover:text-white px-5 py-2 rounded-lg transition-all border border-gray-700 active:scale-95"
                         >
                            Logout
                         </button>
                     </div>
                 </div>
             </header>

             <main className="container mx-auto px-4 py-8 max-w-7xl">
                <Routes>
                    <Route path="/" element={<MinesGame />} />
                    <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/" />} />
                </Routes>
             </main>
        </div>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
