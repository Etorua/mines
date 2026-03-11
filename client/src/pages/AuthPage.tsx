import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Phone } from 'lucide-react';

const AuthPage = () => {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastNamePaternal, setLastNamePaternal] = useState('');
    const [lastNameMaternal, setLastNameMaternal] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        username?: string;
        firstName?: string;
        lastNamePaternal?: string;
        lastNameMaternal?: string;
        phoneNumber?: string;
        password?: string;
        confirmPassword?: string;
        terms?: string;
    }>({});

    const passwordChecks = {
        minLength: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
    };

    const passwordScore = Object.values(passwordChecks).filter(Boolean).length;

    const passwordLabelByScore: Record<number, string> = {
        0: 'Muy debil',
        1: 'Debil',
        2: 'Regular',
        3: 'Buena',
        4: 'Fuerte',
    };

    const validateRegister = () => {
        const nextErrors: {
            username?: string;
            firstName?: string;
            lastNamePaternal?: string;
            lastNameMaternal?: string;
            phoneNumber?: string;
            password?: string;
            confirmPassword?: string;
            terms?: string;
        } = {};

        const cleanUsername = username.trim();
        const cleanFirstName = firstName.trim();
        const cleanLastNamePaternal = lastNamePaternal.trim();
        const cleanLastNameMaternal = lastNameMaternal.trim();
        const cleanPhone = phoneNumber.replace(/\s+/g, '');

        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
            nextErrors.username = 'El usuario debe tener entre 3 y 20 caracteres.';
        } else if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            nextErrors.username = 'Solo se permiten letras, numeros y guion bajo.';
        }

        if (cleanFirstName.length < 2) {
            nextErrors.firstName = 'Ingresa tu nombre real.';
        }

        if (cleanLastNamePaternal.length < 2) {
            nextErrors.lastNamePaternal = 'Ingresa tu apellido paterno.';
        }

        if (cleanLastNameMaternal.length < 2) {
            nextErrors.lastNameMaternal = 'Ingresa tu apellido materno.';
        }

        if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
            nextErrors.phoneNumber = 'Ingresa un celular valido (10 a 15 digitos).';
        }

        if (passwordScore < 4) {
            nextErrors.password = 'La contrasena debe cumplir todos los requisitos de seguridad.';
        }

        if (confirmPassword !== password) {
            nextErrors.confirmPassword = 'Las contrasenas no coinciden.';
        }

        if (!acceptTerms) {
            nextErrors.terms = 'Debes aceptar los terminos para crear tu cuenta.';
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const switchMode = (nextIsLogin: boolean) => {
        setIsLogin(nextIsLogin);
        setError('');
        setFieldErrors({});
        if (nextIsLogin) {
            setFirstName('');
            setLastNamePaternal('');
            setLastNameMaternal('');
            setPhoneNumber('');
            setConfirmPassword('');
            setAcceptTerms(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFieldErrors({});

        if (!isLogin && !validateRegister()) {
            return;
        }

        setLoading(true);

        try {
            const endpoint = isLogin ? '/users/login' : '/users/register';
            const payload = isLogin
                ? { username: username.trim(), password }
                : {
                    username: username.trim(),
                    password,
                    firstName: firstName.trim(),
                    lastNamePaternal: lastNamePaternal.trim(),
                    lastNameMaternal: lastNameMaternal.trim(),
                    phoneNumber: phoneNumber.replace(/\s+/g, ''),
                };

            const res = await api.post(endpoint, payload);
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.message || err.response?.data?.error || "Authentication failed");
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
                            type="button"
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => switchMode(true)}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => switchMode(false)}
                        >
                            Create Account
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                required
                            />
                            {fieldErrors.username && <p className="mt-2 text-xs text-red-400">{fieldErrors.username}</p>}
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Contrasena"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-12 text-white outline-none transition-colors"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {fieldErrors.password && <p className="mt-2 text-xs text-red-400">{fieldErrors.password}</p>}
                        </div>

                        {!isLogin && (
                            <>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Nombre(s)"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                            required
                                        />
                                        {fieldErrors.firstName && <p className="mt-2 text-xs text-red-400">{fieldErrors.firstName}</p>}
                                    </div>

                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Apellido paterno"
                                            value={lastNamePaternal}
                                            onChange={(e) => setLastNamePaternal(e.target.value)}
                                            className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                            required
                                        />
                                        {fieldErrors.lastNamePaternal && <p className="mt-2 text-xs text-red-400">{fieldErrors.lastNamePaternal}</p>}
                                    </div>

                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Apellido materno"
                                            value={lastNameMaternal}
                                            onChange={(e) => setLastNameMaternal(e.target.value)}
                                            className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                            required
                                        />
                                        {fieldErrors.lastNameMaternal && <p className="mt-2 text-xs text-red-400">{fieldErrors.lastNameMaternal}</p>}
                                    </div>

                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                        <input
                                            type="tel"
                                            placeholder="Celular (+521234567890)"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                                            className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white outline-none transition-colors"
                                            required
                                        />
                                        {fieldErrors.phoneNumber && <p className="mt-2 text-xs text-red-400">{fieldErrors.phoneNumber}</p>}
                                    </div>
                                </div>

                                <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-gray-300 text-sm font-semibold">Seguridad de contrasena</p>
                                        <span className="text-xs text-gray-400">{passwordLabelByScore[passwordScore]}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden mb-3">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-300"
                                            style={{ width: `${(passwordScore / 4) * 100}%` }}
                                        />
                                    </div>
                                    <ul className="text-xs text-gray-300 space-y-1">
                                        <li className={passwordChecks.minLength ? 'text-green-400' : ''}>Minimo 8 caracteres</li>
                                        <li className={passwordChecks.uppercase ? 'text-green-400' : ''}>Al menos 1 mayuscula</li>
                                        <li className={passwordChecks.lowercase ? 'text-green-400' : ''}>Al menos 1 minuscula</li>
                                        <li className={passwordChecks.number ? 'text-green-400' : ''}>Al menos 1 numero</li>
                                    </ul>
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirmar contrasena"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-gray-800 border-2 border-transparent focus:border-indigo-500 rounded-xl py-3 pl-10 pr-12 text-white outline-none transition-colors"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        aria-label={showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    {fieldErrors.confirmPassword && <p className="mt-2 text-xs text-red-400">{fieldErrors.confirmPassword}</p>}
                                </div>

                                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-300">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={acceptTerms}
                                            onChange={(e) => setAcceptTerms(e.target.checked)}
                                            className="mt-0.5 accent-indigo-500"
                                        />
                                        <span>
                                            Acepto los terminos y condiciones y la politica de privacidad.
                                        </span>
                                    </label>
                                    {fieldErrors.terms && <p className="mt-2 text-xs text-red-400">{fieldErrors.terms}</p>}
                                </div>
                            </>
                        )}

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
                    <div className="inline-flex items-center gap-2">
                        <ShieldCheck size={14} />
                        <span>Conexion cifrada y proteccion de cuenta activa.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
