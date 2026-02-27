import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import MinesGame from './components/MinesGame';
import AuthPage from './pages/AuthPage';

const AppContent = () => {
    const { isAuthenticated, logout, user } = useContext(AuthContext);

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return (
        <div className="min-h-screen bg-black text-white antialiased">
             {/* Simple Header */}
             <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50 shadow-md shadow-indigo-900/10">
                 <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/30">M</div>
                         <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">MINES</span>
                     </div>
                     <div className="flex items-center gap-4">
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
                <MinesGame />
             </main>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
