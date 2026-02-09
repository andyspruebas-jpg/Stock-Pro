import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface LoginProps {
    onLogin: (token: string, user: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/login', { username, password });
            if (response.data.status === 'success') {
                const { token, user } = response.data;
                if (rememberMe) {
                    localStorage.setItem('stock_token', token);
                    localStorage.setItem('stock_user', user);
                } else {
                    sessionStorage.setItem('stock_token', token);
                    sessionStorage.setItem('stock_user', user);
                }
                onLogin(token, user);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    {/* Top Decorative bar */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-60" />

                    <div className="flex flex-col items-center mb-10">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6"
                        >
                            <LayoutDashboard size={40} className="text-white" />
                        </motion.div>

                        <h1 className="text-3xl font-black text-white tracking-tight text-center">
                            Stock Pro <span className="text-indigo-400">Odoo</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.2em] mt-2">
                            Gestión de Inventario
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">
                                Usuario
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Introduce tu usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-6 rounded-full transition-all duration-300 ${rememberMe ? 'bg-indigo-600' : 'bg-slate-800'}`} />
                                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${rememberMe ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                    Recordarme
                                </span>
                            </label>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl"
                            >
                                <AlertCircle size={18} className="text-red-500 shrink-0" />
                                <p className="text-sm font-bold text-red-400">{error}</p>
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <span className="uppercase tracking-widest">Entrar al Sistema</span>
                                </>
                            )}
                            {/* Shine effect */}
                            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-white/20 skew-x-[-25deg] group-hover:left-[120%] transition-all duration-700 ease-in-out" />
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                            &copy; 2025 ATI - Gestión Inteligente
                        </p>
                    </div>
                </div>

                {/* Subtle decorative shadows */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-indigo-500/20 blur-2xl rounded-full" />
            </motion.div>
        </div>
    );
};

export default Login;
