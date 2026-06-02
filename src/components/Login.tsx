import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';
import { ClfsLogo } from './ClfsLogo';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  allUsers?: { [key: string]: any };
  onRequestRegister?: (fullName: string, email: string, subject: 'English' | 'Mathematics' | 'Information Technology') => { success: boolean; message: string; queueNumber?: number };
}

export function Login({ onLogin, allUsers, onRequestRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  // States for registration requests
  const [showRequestBox, setShowRequestBox] = useState(false);
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqSubject, setReqSubject] = useState<'English' | 'Mathematics' | 'Information Technology'>('English');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await onLogin(username, password);
    if (!result.success) {
      const isUserMissing = allUsers && !allUsers[username];
      if (isUserMissing) {
        setError("You are not registered as an instructor. Submit a registration request below.");
        setShowRequestBox(true);
      } else {
        setError(result.error || 'Login failed');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!username) {
      toast.error("Please enter your username first", {
        description: "We need your username to retrieve your password."
      });
      return;
    }

    if (allUsers && allUsers[username]) {
      setRecoveredPassword(allUsers[username].password);
      toast.success("Security query successful");
    } else {
      toast.error("Please contact Admin to add your credentials", {
        description: "The username entered does not match our records."
      });
    }
  };

  const handleRequestRegister = () => {
    if (!reqFullName || !reqEmail) {
      toast.error("Please specify both raw name and email.");
      return;
    }

    if (!reqEmail.includes('@') || reqEmail.length < 5) {
      toast.error("Please specify a valid official email address.");
      return;
    }

    if (onRequestRegister) {
      const response = onRequestRegister(reqFullName, reqEmail, reqSubject);
      if (response.success) {
        toast.success(response.message);
        setRegistrationSuccess(response.message);
        setReqFullName('');
        setReqEmail('');
        setShowRequestBox(false);
      } else {
        toast.error(response.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-2">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[340px] bg-white shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-teal-950 p-6 text-center text-white">
          <div className="w-[200px] h-12 bg-white flex items-center justify-center mx-auto mb-3 border border-teal-900/10 shadow-sm p-1.5">
            <ClfsLogo className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base font-bold tracking-tight leading-none uppercase">CLFS Portal</h1>
          <p className="text-teal-100 text-[10px] mt-1.5 uppercase tracking-wider font-semibold leading-none">Grade Management System</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {registrationSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-3 border border-emerald-200 rounded-md flex flex-col gap-1 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                <span className="uppercase tracking-widest text-[9px] font-black text-emerald-600">Request Sent</span>
              </div>
              <p className="normal-case leading-relaxed font-semibold">{registrationSuccess}</p>
              <button 
                type="button" 
                onClick={() => setRegistrationSuccess(null)}
                className="text-left text-[9px] text-emerald-700 hover:text-emerald-950 underline font-extrabold uppercase tracking-wide mt-1.5 outline-none"
              >
                Dismiss Message
              </button>
            </motion.div>
          )}

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] font-bold text-red-600 bg-red-50 p-2.5 border border-red-100"
            >
              {error}
            </motion.p>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 px-4 border border-slate-200 focus:border-teal-950 focus:ring-2 focus:ring-teal-100 outline-none transition-all bg-slate-50/50 text-[12px] font-medium"
                placeholder="Username"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-4 pr-10 border border-slate-200 focus:border-teal-950 focus:ring-2 focus:ring-teal-100 outline-none transition-all bg-slate-50/50 text-[12px] font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button 
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-white hover:bg-[#FFEE82] text-teal-950 border-2 border-slate-300 hover:border-[#FFEE82] font-black uppercase text-[11px] tracking-widest shadow-sm transition-all active:scale-[0.98]"
          >
            <LogIn className="w-3.5 h-3.5 mr-2 text-[#00786f]" />
            {loading ? 'Wait...' : 'Sign In'}
          </Button>

          <div className="text-center pt-1 border-t border-slate-50 flex flex-col gap-1">
            {recoveredPassword ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pb-2 space-y-1"
              >
                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Recovered Password:</p>
                <div className="bg-teal-50 border border-teal-100 p-2 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-teal-900">{recoveredPassword}</span>
                    <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <button 
                  type="button"
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                  onClick={() => setRecoveredPassword('')}
                >
                  Clear Info
                </button>
              </motion.div>
            ) : (
              <button 
                type="button"
                className="text-[10px] font-black text-teal-950 hover:text-black uppercase tracking-widest"
                onClick={handleForgotPassword}
              >
                Forgot Credentials?
              </button>
            )}

            <button 
              type="button"
              className="mt-1 text-[10px] font-black text-teal-700 hover:text-white hover:bg-teal-700 p-1 rounded-sm uppercase tracking-widest transition-all"
              onClick={() => setShowRequestBox(!showRequestBox)}
            >
              {showRequestBox ? "Hide Registration" : "Not Registered? Request Access"}
            </button>
          </div>

          {showRequestBox && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-50/95 p-4 border border-teal-200 space-y-3 mt-4 text-left rounded-sm"
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-teal-600 rounded-full inline-block"></span>
                Official Request Box
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text"
                    value={reqFullName}
                    onChange={(e) => setReqFullName(e.target.value)}
                    className="w-full h-8 px-3 border border-slate-200 outline-none transition-all bg-white text-[11px] font-medium"
                    placeholder="Dr. Hameed Ur Rehman"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email</label>
                  <input 
                    type="email"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className="w-full h-8 px-3 border border-slate-200 outline-none transition-all bg-white text-[11px] font-medium"
                    placeholder="instructor@asu.edu.om"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Particular Course</label>
                  <select 
                    value={reqSubject}
                    onChange={(e: any) => setReqSubject(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-200 outline-none transition-all bg-white text-[11px] font-bold"
                  >
                    <option value="English">English Language</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Information Technology">Information Technology (IT)</option>
                  </select>
                </div>
              </div>

              <Button 
                type="button"
                onClick={handleRequestRegister}
                className="w-full h-8.5 bg-[#00786f] hover:bg-teal-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xs transition-all active:scale-[0.98]"
              >
                Submit Request
                <ArrowRight className="w-3 h-3 ml-2 shrink-0" />
              </Button>
            </motion.div>
          )}

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              © {new Date().getFullYear()} A'Sharqiyah University
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
