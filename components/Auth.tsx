
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { Building, User as UserIcon, Home, Wrench, Lock, AlertCircle, Loader2, Mail } from 'lucide-react';
import { supabase, signInWithGoogle } from '../supabaseClient';
import { db } from '../services/db';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('BROKER');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);

  const roleDashboards: Record<UserRole, string> = {
    BROKER: 'Broker Dashboard',
    OWNER: 'Owner Dashboard',
    RENTER: 'Renter Dashboard',
    CONTRACTOR: 'Contractor Dashboard'
  };

  const handleAdminPrefill = () => {
    setMode('signup');
    setError(null);
    setName('Admin');
    setEmail('admin@eburon.ai');
    setPassword('');
    setRole('BROKER');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // OAuth redirects, so we don't need to handle success here
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        // 1. Sign Up
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            email: email,
            name: name,
            role: role,
            avatar: `https://ui-avatars.com/api/?name=${name}&background=random`
          };
          
          // 2. Save Profile
          await db.createUserProfile(newUser);
          onLogin(newUser);
        }
      } else {
        // 1. Sign In
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          // 2. Fetch Profile
          let userProfile = await db.getUserProfile(data.user.id);

          if (!userProfile) {
              const fallbackProfile: User = {
                  id: data.user.id,
                  email: data.user.email || '',
                  name: data.user.email?.split('@')[0] || 'User',
                  role: role,
                  avatar: `https://ui-avatars.com/api/?name=${data.user.email}&background=random`
              };
              await db.createUserProfile(fallbackProfile);
              userProfile = await db.getUserProfile(data.user.id);
          }

          if (!userProfile) {
              throw new Error('Profile not found. Please contact support.');
          }

          onLogin(userProfile);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (r: UserRole) => {
    switch (r) {
      case 'BROKER': return <Building className="w-5 h-5" />;
      case 'OWNER': return <UserIcon className="w-5 h-5" />;
      case 'RENTER': return <Home className="w-5 h-5" />;
      case 'CONTRACTOR': return <Wrench className="w-5 h-5" />;
    }
  };

  const getRoleDescription = (r: UserRole) => {
    switch (r) {
      case 'BROKER': return 'Property Manager / Agency';
      case 'OWNER': return 'Landlord / Property Owner';
      case 'RENTER': return 'Tenant / Resident';
      case 'CONTRACTOR': return 'Service Provider / Technician';
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col py-12 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-6">
             <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200">E</div>
             <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Eburon</h2>
        </div>
        <h2 className="mt-2 text-center text-2xl font-bold text-slate-900">
          {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Or{' '}
          <button 
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="font-medium text-black hover:text-slate-700 transition-colors"
          >
            {mode === 'signin' ? 'start your 14-day free trial' : 'sign in to existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm transition-all pr-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                {mode === 'signup' ? 'I am a...' : 'Login as (if first time)'}
              </label>
              <div className="grid grid-cols-1 gap-3">
                {(['BROKER', 'OWNER', 'RENTER', 'CONTRACTOR'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    onMouseEnter={() => setHoveredRole(r)}
                    onMouseLeave={() => setHoveredRole(null)}
                    className={`group relative rounded-xl border p-4 flex cursor-pointer focus:outline-none transition-all ${
                      role === r 
                        ? "bg-slate-900 text-white border-slate-900 ring-1 ring-slate-900" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center">
                        <div className={`flex items-center justify-center h-5 w-5 rounded-full border ${role === r ? "bg-white border-white" : "bg-white border-slate-300"}`}>
                            {role === r && <div className="w-2 h-2 bg-slate-900 rounded-full" />}
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                            <span className={`block text-sm font-medium ${role === r ? "text-white" : "text-slate-900"}`}>
                                {r.charAt(0) + r.slice(1).toLowerCase()}
                            </span>
                             <span className={`text-xs ${role === r ? "text-slate-100" : "text-slate-500"}`}>
                                - {getRoleDescription(r)}
                            </span>
                        </div>
                    </div>
                    <div className={`ml-auto flex items-center gap-3 ${role === r ? "text-white" : "text-slate-400"}`}>
                        <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${role === r ? "bg-white/15" : "bg-slate-100"}`}>
                            {getRoleIcon(r)}
                        </div>
                        <span className={`text-xs font-semibold transition-opacity ${
                            hoveredRole === r ? 'opacity-100' : 'opacity-0'
                        } ${role === r ? 'text-slate-100' : 'text-slate-600'}`}>
                            {roleDashboards[r]}
                        </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {roleDashboards[hoveredRole || role]}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleAdminPrefill}
                className="w-full flex justify-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all"
              >
                Use admin@eburon.ai
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'signin' ? 'Sign in' : 'Create account')}
              </button>
            </div>
          </form>

          {/* Google OAuth Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600">
              <Mail className="w-3.5 h-3.5" />
              <span>Enables Gmail automation for follow-up emails</span>
            </div>
          </div>

          {mode === 'signin' && (
             <div className="mt-6 text-xs text-slate-500 text-center">
                Use your account credentials to sign in.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
