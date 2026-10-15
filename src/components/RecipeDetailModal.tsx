import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Play,
  Clock,
  ChefHat,
  Youtube,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  CookingPot,
  Utensils,
  Minus,
  Plus,
  Users,
} from 'lucide-react';
import { Recipe } from '../types';
import { SupportedLanguage, t } from '../utils/i18n';
import { StepCartoonIllustration } from './StepCartoonIllustration';
import { scaleMeasure } from '../utils/measureScaler';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onAdjustPhoto?: (recipe: Recipe) => void;
  currentLanguage?: SupportedLanguage;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onStartCooking,
  onAdjustPhoto,
  currentLanguage = 'en',
}) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const baseServings = Math.max(1, recipe?.servings || 2);
  const [servings, setServings] = useState<number>(baseServings);

  useEffect(() => {
    if (recipe) {
      setServings(Math.max(1, recipe.servings || 2));
      setCheckedIngredients({});
    }
  }, [recipe?.id, recipe?.servings]);

  if (!isOpen || !recipe) return null;

  const toggleCheck = (name: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-stone-50 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl relative">
        {/* Top Header Image */}
        <div className="relative aspect-16/10 w-full bg-stone-900 shrink-0">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/30 to-black/40" />

          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 left-4 p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Favorite button */}
          <button
            onClick={() => onToggleFavorite(recipe)}
            type="button"
            className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Title & Metadata over image bottom */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500 text-stone-950">
                {recipe.area}
              </span>
              <span className="text-[10px] font-semibold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md">
                {recipe.category}
              </span>
              <span className="text-[10px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {recipe.matchPercentage}% match
              </span>
            </div>
            <h1 className="text-xl font-extrabold leading-tight text-white">
              {recipe.title}
            </h1>

            {onAdjustPhoto && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-stone-200 bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20 truncate">
                  Style: {recipe.platingStyle || 'Culinary Standard'}
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustPhoto(recipe)}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                  <span>Adjust Dish Photo</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white border border-stone-200 text-center shadow-xs">
            <div>
              <p className="text-[10px] font-bold text-stone-600 uppercase">Estimated Time</p>
              <p className="text-sm font-extrabold text-stone-900 mt-0.5 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {recipe.estimatedTimeMinutes} min
              </p>
            </div>
            <div className="border-x border-stone-100">
              <p className="text-[10px] font-bold text-stone-600 uppercase">Difficulty</p>
              <p className="text-sm font-extrabold text-stone-900 mt-0.5">
                {recipe.difficulty}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold text-stone-600 uppercase flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-amber-600" />
                <span>Servings</span>
              </p>
              <div className="mt-0.5 inline-flex items-center gap-1 bg-stone-100 rounded-xl px-1.5 py-0.5 border border-stone-200">
                <button
                  type="button"
                  onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                  className="w-5 h-5 rounded-lg bg-white hover:bg-stone-200 text-stone-800 flex items-center justify-center text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-90"
                  title="Decrease serving size"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                </button>
                <span className="text-xs font-black text-stone-900 min-w-7 text-center">
                  {servings}p
                </span>
                <button
                  type="button"
                  onClick={() => setServings((prev) => Math.min(12, prev + 1))}
                  className="w-5 h-5 rounded-lg bg-white hover:bg-stone-200 text-stone-800 flex items-center justify-center text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-90"
                  title="Increase serving size"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Cooking Wares Needed */}
          {recipe.cookingWares && recipe.cookingWares.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 shadow-xs">
              <div className="flex items-center gap-1.5 mb-2 text-stone-900">
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700">
                  <CookingPot className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">
                  {t('cookingWaresNeeded', currentLanguage)} ({recipe.cookingWares.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.cookingWares.map((ware, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-stone-800 border border-amber-200/80 text-xs font-semibold shadow-2xs"
                  >
                    <Utensils className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{ware}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4 text-amber-600" />
                  Ingredients ({recipe.ingredients.length})
                </h2>
                {servings !== baseServings && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                    Scaled to {servings}p
                  </span>
                )}
              </div>
              <span className="text-[11px] text-stone-600">
                Tap to check off
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = !!checkedIngredients[ing.name];
                const scaledAmount = scaleMeasure(ing.measure, baseServings, servings);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(ing.name)}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isChecked ? 'bg-stone-50/80 line-through text-stone-400' : 'hover:bg-amber-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold text-stone-800">
                        {ing.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${servings !== baseServings ? 'text-amber-800' : 'text-stone-700'}`}>
                        {scaledAmount}
                      </span>
                      {ing.hasIngredient ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium border border-emerald-200">
                          In Pantry
                        </span>
                      ) : ing.isStaple ? (
                        <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md font-medium">
                          Basic Staple
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium border border-amber-200">
                          Need
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* YouTube Video Link if present */}
          {recipe.youtubeUrl && (
            <a
              href={recipe.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <Youtube className="w-4 h-4 text-rose-600" />
                Watch Video Preparation Guide
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
            </a>
          )}

          {/* Step Sequence Overview with Cartoonized Illustrations */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-extrabold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Cooking Steps ({recipe.steps.length})
              </h2>
              <span className="text-[11px] text-stone-500 font-medium">
                Illustrated Actions
              </span>
            </div>
            <div className="space-y-2.5">
              {recipe.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-xs flex items-center gap-3.5 shadow-2xs hover:border-amber-300 transition-colors"
                >
                  <StepCartoonIllustration
                    instruction={step.instruction}
                    actionType={step.actionType}
                    stepNumber={step.stepNumber}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-800 font-medium leading-relaxed">
                      {step.instruction}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {step.estimatedMinutes && (
                        <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          ⏱ ~{step.estimatedMinutes} minutes
                        </span>
                      )}
                      {step.tip && (
                        <span className="inline-block text-[10px] text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md italic">
                          💡 {step.tip}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-white border-t border-stone-200 shrink-0 flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              const scaledRecipe: Recipe = {
                ...recipe,
                servings,
                ingredients: recipe.ingredients.map((ing) => ({
                  ...ing,
                  measure: scaleMeasure(ing.measure, baseServings, servings),
                })),
              };
              onStartCooking(scaledRecipe);
            }}
            type="button"
            className="flex-1 py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Voice Cooking Mode</span>
            {servings !== baseServings && (
              <span className="text-xs bg-amber-800/80 px-2 py-0.5 rounded-lg">
                ({servings} servings)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
