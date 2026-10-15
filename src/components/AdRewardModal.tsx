import React, { useState, useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, ShieldCheck, Flame, Award, Volume2, VolumeX } from 'lucide-react';
import { SupportedLanguage } from '../utils/i18n';

interface AdRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: () => void;
  currentCount: number;
  maxCount: number;
  currentLanguage?: SupportedLanguage;
}

const CULINARY_SPONSORS = [
  {
    title: 'Gourmet Masterclass: Artisanal Knife Skills',
    tagline: 'Precision Cuts & Japanese Steel',
    brand: 'Miyabi Culinary Studio',
    rating: '4.9 ★★★★★ (12k Chefs)',
    imageUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80',
    description: 'Master French brunoise, julienne, and Japanese sashimi slices in under 15 minutes. Free workshop access for SnapChef creators.',
    cta: 'Learn Chef Secrets',
  },
  {
    title: 'Organic Single-Origin Spice Collection',
    tagline: 'Smoked Paprika, Tellicherry Pepper & Saffron',
    brand: 'The Spice Merchant Co.',
    rating: '4.9 ★★★★★ (28k Reviews)',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
    description: 'Farm-direct heirloom herbs and spices ethically harvested for home chefs who refuse to compromise on flavor.',
    cta: 'Explore Flavor Collection',
  },
  {
    title: 'Farm Fresh Organic Pantry Box',
    tagline: 'Delivered Straight from Local Sustainable Farms',
    brand: 'GreenField Harvest',
    rating: '4.8 ★★★★★ (45k Families)',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    description: 'Handpicked heirloom greens, organic produce, and artisanal pantry provisions delivered fresh to your doorstep every week.',
    cta: 'Get Farm Fresh Box',
  },
];

export const AdRewardModal: React.FC<AdRewardModalProps> = ({
  isOpen,
  onClose,
  onRewardEarned,
  currentCount,
  maxCount,
}) => {
  const [adIndex, setAdIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Pick sponsor and reset timer when opened
  useEffect(() => {
    if (isOpen) {
      setAdIndex(Math.floor(Math.random() * CULINARY_SPONSORS.length));
      setSecondsLeft(5);
      setIsCompleted(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    if (secondsLeft <= 0) {
      setIsCompleted(true);
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, secondsLeft, isCompleted]);

  if (!isOpen) return null;

  const sponsor = CULINARY_SPONSORS[adIndex] || CULINARY_SPONSORS[0];
  const progressPercent = Math.min(100, Math.round(((5 - secondsLeft) / 5) * 100));

  const handleClaimReward = () => {
    onRewardEarned();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-stone-900 border border-stone-800 text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Bar */}
        <div className="px-4 py-3 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
              Sponsor Reward Ad
            </span>
            <span className="text-xs text-stone-400">
              {isCompleted ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to claim
                </span>
              ) : (
                <span>Reward in {secondsLeft}s</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-1 rounded-full text-stone-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {isCompleted ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[10px] text-stone-500 font-mono">
                {secondsLeft}s
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-800 h-1">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Ad Video / Media Preview */}
        <div className="relative h-44 w-full bg-stone-950 overflow-hidden">
          <img
            src={sponsor.imageUrl}
            alt={sponsor.title}
            className="w-full h-full object-cover brightness-90 hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />

          {/* Floating Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] font-bold text-amber-300 border border-white/10">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Verified Sponsor</span>
          </div>

          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="text-[11px] font-bold text-amber-400 tracking-wide uppercase">
              {sponsor.brand}
            </p>
            <h3 className="text-sm font-extrabold text-white leading-snug">
              {sponsor.title}
            </h3>
          </div>
        </div>

        {/* Ad Details & Reward Benefit */}
        <div className="p-4 space-y-3 bg-stone-900/90">
          <div className="p-2.5 rounded-2xl bg-stone-800/60 border border-stone-700/60 text-xs">
            <p className="text-stone-300 text-[11px] leading-relaxed">
              {sponsor.description}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
              <span className="text-amber-400 font-bold">{sponsor.rating}</span>
              <span className="italic">{sponsor.tagline}</span>
            </div>
          </div>

          {/* Reward Status Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-amber-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-stone-950 shrink-0 font-black shadow-md">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Watch Ad Reward
              </p>
              <p className="text-[11px] text-stone-300 font-medium">
                Refills <span className="font-bold text-white">+1 Cooking Generation</span> ({currentCount}/{maxCount} → {Math.min(maxCount, currentCount + 1)}/{maxCount})
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex gap-2">
          {isCompleted ? (
            <button
              type="button"
              onClick={handleClaimReward}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Claim +1 Free Credit Now</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3 px-4 rounded-2xl bg-stone-800 text-stone-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
            >
              <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-amber-400 rounded-full animate-spin" />
              <span>Reward Unlocks in {secondsLeft}s...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
