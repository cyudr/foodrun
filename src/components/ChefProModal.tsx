import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Check,
  X,
  Wand2,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface ChefProModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onTogglePro: () => void;
  onActivateWithCode?: (code: string) => Promise<{ success: boolean; message?: string }>;
  proCode?: string;
  targetFeature?: string;
}

export const ChefProModal: React.FC<ChefProModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onTogglePro,
  onActivateWithCode,
  proCode = '',
  targetFeature = 'reverse-engineer',
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setStatusError('Please enter an invitation code.');
      return;
    }

    setIsVerifying(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      if (onActivateWithCode) {
        const result = await onActivateWithCode(inviteCode.trim());
        if (result.success) {
          setStatusSuccess(result.message || 'Invitation code verified! Chef Pro unlocked.');
          setInviteCode('');
        } else {
          setStatusError(result.message || 'Invalid invitation code. Please check your code and try again.');
        }
      } else {
        // Fallback direct verification against /api/gemini.ts
        const response = await fetch('/api/gemini.ts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify-invite-code',
            code: inviteCode.trim(),
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.valid) {
          setStatusSuccess('Invitation code verified! Chef Pro unlocked.');
          onTogglePro();
          setInviteCode('');
        } else {
          setStatusError(data.error || 'Invalid invitation code. Please check your code and try again.');
        }
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[90vh]">
        {/* Decorative Top Gradient */}
        <div className="h-28 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 flex items-start justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-8 opacity-20 pointer-events-none">
            <Crown className="w-36 h-36 text-white" />
          </div>

          <div className="flex items-center gap-2.5 z-10">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-amber-200">
              <Crown className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 inline" />
                Invitation Only
              </span>
              <h2 className="text-xl font-black text-white leading-tight">
                SnapChef Pro
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Feature Spotlight */}
          {targetFeature === 'reverse-engineer' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Premium Feature</span>
              </div>
              <h3 className="font-extrabold text-sm text-stone-100">
                Reverse-Engineer Food Recipe from Photo
              </h3>
              <p className="text-stone-300 text-xs mt-1 leading-relaxed">
                Snap any plated meal or dish at a restaurant. Gemini deconstructs hidden seasonings, secret sauces, pantry matches, and builds a restaurant-quality recipe.
              </p>
            </div>
          )}

          {/* Invitation Code Entry Box (When Not Pro) */}
          {!isPro ? (
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-amber-500/30 shadow-inner">
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <KeyRound className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Enter Invitation Code
                </span>
              </div>

              <form onSubmit={handleSubmitCode} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setStatusError(null);
                    }}
                    placeholder="Enter invitation code..."
                    disabled={isVerifying}
                    className="w-full py-2.5 pl-3.5 pr-24 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 uppercase tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying || !inviteCode.trim()}
                    className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Verify</span>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {statusError && (
                  <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{statusError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {statusSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{statusSuccess}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* Current Pro Status Badge (When Pro is Active) */
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Chef Pro Active
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    Verified Pass: <span className="font-mono font-bold text-amber-200">{proCode || 'Active'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Perks list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Unlocked with Chef Pro
            </h4>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  AI Dish Recipe Deconstruction
                </p>
                <p className="text-[11px] text-stone-400">
                  Reverse-engineer recipes, sauces &amp; seasonings from any food photo.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Dynamic Dish Photo Adjustment
                </p>
                <p className="text-[11px] text-stone-400">
                  Customize presentation and plating styles tailored to pantry ingredients.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Multilingual Voice Cooking Assistant
                </p>
                <p className="text-[11px] text-stone-400">
                  Hands-free voice cooking guidance in 6 languages with countdown timers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-stone-950/80 border-t border-stone-800 flex flex-col gap-2">
          {isPro ? (
            <button
              onClick={() => {
                onTogglePro();
              }}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-all cursor-pointer"
            >
              Deactivate Pro (Switch / Clear Invitation Code)
            </button>
          ) : null}

          <button
            onClick={onClose}
            type="button"
            className="w-full py-2 text-stone-400 hover:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isPro ? 'Done & Return to App' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
