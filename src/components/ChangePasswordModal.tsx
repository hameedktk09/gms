import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newPass: string) => void;
}

export function ChangePasswordModal({ isOpen, onClose, onConfirm }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Complexity check: should have at least one number and one letter
    const hasNumber = /\d/.test(newPassword);
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    if (!hasNumber || !hasLetter) {
        setError('Password must contain both letters and numbers for better security');
        return;
    }

    onConfirm(newPassword);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-900 font-black uppercase tracking-tight">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Security Preference
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
            Change your password anytime to keep your account secure.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight leading-tight">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">New Secure Password</label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Confirm New Password</label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-bold"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 flex items-start gap-3 border border-blue-100">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Security Guidelines:</p>
                <ul className="text-[8px] font-bold text-blue-700 uppercase tracking-tighter space-y-0.5 opacity-80">
                    <li>• Minimum 8 characters in length</li>
                    <li>• Must contain a mix of letters and numbers</li>
                    <li>• Avoid using your username or common patterns</li>
                </ul>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-all active:scale-[0.98]"
          >
            Update & Secure Account
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
