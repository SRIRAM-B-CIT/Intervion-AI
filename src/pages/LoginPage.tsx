import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { LogIn, User as UserIcon, ShieldCheck, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LoginPage() {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [name, setName] = useState('');
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    login(role, name);
    navigate(role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50">
      {/* Left Side: Branding */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
          <div className="grid grid-cols-8 gap-4 p-8">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="h-1 w-1 bg-zinc-700 rounded-full" />
            ))}
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 mb-8 shadow-2xl shadow-emerald-500/20">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">IntervAI</h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
            The ultimate multimodal AI platform to master your interview journey. 
            From resume analysis to live HR simulations.
          </p>
        </motion.div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-zinc-900 mb-2">Welcome back</h2>
            <p className="text-zinc-500">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="flex p-1 bg-zinc-100 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  role === 'student' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                <UserIcon className="w-4 h-4" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  role === 'admin' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                defaultValue="password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/10"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Don't have an account? <span className="text-emerald-600 font-medium cursor-pointer hover:underline">Sign up for free</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
