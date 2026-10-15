import React from 'react';
import { X, Zap, Clock, Tv, Crown, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UsageState, formatMinutes, getRemainingRefreshMinutes } from '../utils/usageCookies';
import { SupportedLanguage } from '../utils/i18n';

interface UsageStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageState: UsageState;
  isPro?: boolean;
  onWatchAd: () => void;
  onOpenProModal: () => void;
  currentLanguage?: SupportedLanguage;
}

export const UsageStatusModal: React.FC<UsageStatusModalProps> = ({
  isOpen,
  onClose,
  usageState,
  isPro = false,
  onWatchAd,
  onOpenProModal,
}) => {
  if (!isOpen) return null;

  const remainingMinutes = getRemainingRefreshMinutes(usageState);
  const formattedTime = formatMinutes(remainingMinutes);
  const isDepleted = usageState.count === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-3xl bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-stone-950 font-black shadow-md shadow-orange-500/20">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Cooking Credits</h3>
              <p className="text-[10px] text-stone-400">Stored in browser cookies</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Counter Visual Box */}
        <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((slot) => {
              const isActive = slot <= usageState.count;
              return (
                <div
                  key={slot}
                  className={`w-12 h-14 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    isPro
                      ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-stone-950 shadow-md shadow-amber-500/20'
                      : isActive
                      ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-stone-950 shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-stone-900 border border-stone-800 text-stone-600'
                  }`}
                >
                  <Zap className={`w-5 h-5 ${isPro || isActive ? 'fill-current' : 'opacity-40'}`} />
                  <span className="text-[10px] font-black mt-0.5">#{slot}</span>
                </div>
              );
            })}
          </div>

          <div>
            <div className="text-xl font-black text-white flex items-center justify-center gap-1.5">
              {isPro ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Crown className="w-5 h-5 fill-current" /> Chef Pro Unlimited
                </span>
              ) : (
                <span>
                  <span className={isDepleted ? 'text-rose-400' : 'text-amber-400'}>
                    {usageState.count}
                  </span>
                  <span className="text-stone-500"> / {usageState.maxCount} Credits</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {isPro
                ? 'VIP Unlimited AI Vision, Recipes & Cooking Modes'
                : isDepleted
                ? 'All free cooking generations used'
                : `${usageState.count} free generation${usageState.count > 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>

        {/* 2-Hour Refresh Info & Live Timer on Minute */}
        {!isPro && (
          <div className="p-3.5 rounded-2xl bg-stone-800/60 border border-stone-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                2-Hour Auto Refresh:
              </span>
              <span className="font-mono font-bold text-amber-400 text-xs">
                {usageState.count >= usageState.maxCount
                  ? 'Full (3/3)'
                  : `${formattedTime} (${remainingMinutes} min)`}
              </span>
            </div>

            <p className="text-[11px] text-stone-400 leading-relaxed">
              When all counts finish, 1 count refreshes every 2 hours (120 minutes) automatically.
            </p>

            {remainingMinutes > 0 && usageState.count < usageState.maxCount && (
              <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(5, Math.min(100, Math.round(((120 - remainingMinutes) / 120) * 100)))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Options: Watch Ad OR Chef Pro */}
        <div className="space-y-2 pt-1">
          {/* Watch Ad Button */}
          {usageState.count < usageState.maxCount && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onWatchAd();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Watch Short Ad to Reset +1 Counter</span>
            </button>
          )}

          {/* Chef Pro Unlock Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProModal();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-stone-700"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{isPro ? 'Manage Chef Pro Pass' : 'Enter VIP Invitation Code for Unlimited'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
