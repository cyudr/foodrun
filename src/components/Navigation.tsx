import React from 'react';
import { Camera, UtensilsCrossed, Heart, Sparkles, ChefHat, Layers } from 'lucide-react';
import { AppTab } from '../types';

interface NavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  pantryCount: number;
  recipesCount: number;
  favoritesCount: number;
  hasActiveCookingSession: boolean;
  onResumeCooking: () => void;
}

export const TopBar: React.FC<{
  currentTab: AppTab;
  pantryCount: number;
  onGoToScanner: () => void;
}> = ({ currentTab, pantryCount, onGoToScanner }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div
          onClick={onGoToScanner}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <ChefHat className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-stone-900 text-base tracking-tight block leading-tight font-serif">
              SnapChef
            </span>
            <span className="text-[10px] text-amber-700 font-semibold tracking-wider uppercase block">
              AI Vision &amp; Voice Cook
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pantryCount > 0 && currentTab !== 'pantry' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {pantryCount} items
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export const BottomTabBar: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  pantryCount,
  recipesCount,
  favoritesCount,
  hasActiveCookingSession,
  onResumeCooking,
}) => {
  // If in active fullscreen cooking mode, the assistant has its own footer
  if (currentTab === 'cooking') return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {/* Scan */}
        <button
          onClick={() => onTabChange('scanner')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative ${
            currentTab === 'scanner'
              ? 'text-amber-600 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <Camera className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Scan</span>
        </button>

        {/* Pantry */}
        <button
          onClick={() => onTabChange('pantry')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative ${
            currentTab === 'pantry'
              ? 'text-amber-600 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {pantryCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {pantryCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Pantry</span>
        </button>

        {/* Recipes */}
        <button
          onClick={() => onTabChange('recipes')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative ${
            currentTab === 'recipes'
              ? 'text-amber-600 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <UtensilsCrossed className="w-5 h-5 mb-0.5" />
            {recipesCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {recipesCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Recipes</span>
        </button>

        {/* Favorites */}
        <button
          onClick={() => onTabChange('favorites')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative ${
            currentTab === 'favorites'
              ? 'text-rose-500 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 mb-0.5 ${favoritesCount > 0 && currentTab === 'favorites' ? 'fill-current' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Favorites</span>
        </button>

        {/* Active Cook Floating Tab if in progress */}
        {hasActiveCookingSession && (
          <button
            onClick={onResumeCooking}
            type="button"
            className="flex flex-col items-center py-1 px-3 rounded-2xl text-amber-600 font-extrabold animate-pulse"
          >
            <ChefHat className="w-5 h-5 mb-0.5 text-amber-600" />
            <span className="text-[11px]">Cooking</span>
          </button>
        )}
      </div>
    </div>
  );
};
