import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, Loader2, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-in">
        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-100 overflow-hidden border border-indigo-50">
          <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-indigo-200" />
                <span className="text-indigo-100 font-medium tracking-wider uppercase text-xs">Welcome Back</span>
              </div>
              <h1 className="text-3xl font-bold">Sign in to SmartMS</h1>
              <p className="text-indigo-100 mt-2 opacity-80">Access your dashboard and manage complaints.</p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl"></div>
          </div>

          <div className="p-8 md:p-10">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label-text">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    placeholder="name@company.com"
                    className="input-field pl-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label-text">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="input-field pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <label className="flex items-center gap-2 cursor-pointer group text-slate-600">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="group-hover:text-slate-900 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-indigo-600 font-semibold hover:text-indigo-700">Forgot password?</a>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-4 h-14"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In to Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-600">
                Access is provisioned by your platform super admin or organization admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
