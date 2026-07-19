import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to the page they came from, or home
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      login(username);
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden bg-insight-black">
      {/* Background Orbs */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-insight-blue/10 rounded-full blur-[100px] pointer-events-none animate-float" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-insight-purple/10 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="glass-card p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-insight-blue/10 rounded-full blur-[50px] pointer-events-none" />
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-insight-black border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <User size={32} className="text-insight-blue" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400 text-sm">Sign in to access your personalized watchlist.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="off"
                className="w-full bg-insight-black border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-insight-blue focus:ring-1 focus:ring-insight-blue transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full py-3 bg-insight-blue hover:bg-insight-blue-soft text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            No password required. Your watchlist will be tied to this username.
          </div>
        </div>
      </div>
    </div>
  );
}
