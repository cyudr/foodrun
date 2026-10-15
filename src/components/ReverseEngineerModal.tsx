import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Flame,
  ChefHat,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Wand2,
  Heart,
  PlusCircle,
  Lightbulb,
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

interface ReverseEngineerModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onAddMissingToPantry?: (ingredients: string[]) => void;
  onAdjustPhoto?: (recipe: Recipe) => void;
  currentLanguage?: SupportedLanguage;
}

export const ReverseEngineerModal: React.FC<ReverseEngineerModalProps> = ({
  recipe,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onStartCooking,
  onAddMissingToPantry,
  onAdjustPhoto,
  currentLanguage = 'en',
}) => {
  const baseServings = Math.max(1, recipe?.servings || 2);
  const [servings, setServings] = useState<number>(baseServings);

  useEffect(() => {
    if (recipe) {
      setServings(Math.max(1, recipe.servings || 2));
    }
  }, [recipe?.id, recipe?.servings]);

  if (!isOpen || !recipe) return null;

  const missingIngredients = recipe.ingredients.filter((i) => !i.hasIngredient);
  const matchedIngredients = recipe.ingredients.filter((i) => i.hasIngredient);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-stone-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[92vh]">
        {/* Top Floating Control Bar */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <span className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Chef Pro Reverse-Engineered
          </span>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(recipe)}
              type="button"
              className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                isFavorite
                  ? 'bg-red-500/90 text-white'
                  : 'bg-black/60 text-stone-300 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-stone-300 hover:text-white backdrop-blur-md transition-colors cursor-pointer shadow-md"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Photo Section */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden shrink-0 bg-stone-950">
          <img
            src={recipe.imageUrl || recipe.originalPhotoUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />

          {/* Plating style tag & quick photo adjust button */}
          <div className="absolute bottom-3 inset-x-4 flex items-end justify-between">
            <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-[11px] text-stone-200">
              <span className="text-amber-400 font-bold">Plating: </span>
              <span>{recipe.platingStyle || 'Restaurant Presentation'}</span>
            </div>

            {onAdjustPhoto && (
              <button
                onClick={() => onAdjustPhoto(recipe)}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Adjust Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Recipe Details */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Title and Metadata */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <span>{recipe.area}</span>
              <span>•</span>
              <span>{recipe.category}</span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-stone-300 text-xs mt-1.5 leading-relaxed">
                {recipe.description}
              </p>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 mt-3.5">
              <div className="p-2.5 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex flex-col items-center text-center">
                <Clock className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Time</span>
                <span className="text-xs font-bold text-stone-200">
                  {recipe.estimatedTimeMinutes} mins
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex flex-col items-center text-center">
                <Flame className="w-4 h-4 text-orange-400 mb-1" />
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Difficulty</span>
                <span className="text-xs font-bold text-stone-200">{recipe.difficulty}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex flex-col items-center text-center">
                <Users className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Servings</span>
                <div className="inline-flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                    className="w-4 h-4 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center text-[10px] cursor-pointer"
                    title="Decrease servings"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="text-xs font-bold text-amber-300 min-w-5 text-center">
                    {servings}p
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings((prev) => Math.min(12, prev + 1))}
                    className="w-4 h-4 rounded bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center text-[10px] cursor-pointer"
                    title="Increase servings"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <div className="p-2.5 rounded-2xl bg-stone-800/80 border border-stone-700/60 flex flex-col items-center text-center">
                <ChefHat className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Match</span>
                <span className="text-xs font-bold text-emerald-400">
                  {recipe.matchPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Flavor Profile Radar */}
          {recipe.flavorProfile && (
            <div className="p-4 rounded-2xl bg-stone-800/70 border border-stone-700">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('flavorRadar', currentLanguage)}</span>
              </h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                {Object.entries(recipe.flavorProfile).map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center">
                    <div className="w-full bg-stone-700 h-16 rounded-lg relative overflow-hidden flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-amber-600 to-orange-400 rounded-b-lg transition-all"
                        style={{ height: `${Math.min(100, Math.max(15, (Number(val) || 5) * 10))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-stone-400 capitalize mt-1.5 font-medium">
                      {key}
                    </span>
                    <span className="text-[11px] font-bold text-amber-300">
                      {val}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chef Notes & Secret Recipe Sauce */}
          {recipe.chefNotes && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-stone-900 border border-amber-600/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Lightbulb className="w-4 h-4" />
                <span>Executive Chef Insights &amp; Secret Recipe</span>
              </div>
              <p className="text-stone-300 text-xs leading-relaxed">
                {recipe.chefNotes}
              </p>
            </div>
          )}

          {/* Cooking Wares Needed */}
          {recipe.cookingWares && recipe.cookingWares.length > 0 && (
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700/80">
              <div className="flex items-center gap-2 mb-2.5 text-amber-400">
                <CookingPot className="w-4 h-4 stroke-[2.2]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-200">
                  {t('cookingWaresNeeded', currentLanguage)} ({recipe.cookingWares.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recipe.cookingWares.map((ware, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-stone-200 border border-stone-700 text-xs font-medium shadow-xs"
                  >
                    <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{ware}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detected Culinary Techniques */}
          {recipe.detectedTechniques && recipe.detectedTechniques.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                Identified Cooking Techniques
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {recipe.detectedTechniques.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recreated Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Recreated Recipe Ingredients ({recipe.ingredients.length})
                </h3>
                {servings !== baseServings && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    Scaled to {servings}p
                  </span>
                )}
              </div>
              {missingIngredients.length > 0 && onAddMissingToPantry && (
                <button
                  type="button"
                  onClick={() => onAddMissingToPantry(missingIngredients.map((m) => m.name))}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Missing to Pantry</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {recipe.ingredients.map((ing, idx) => {
                const scaledAmount = scaleMeasure(ing.measure, baseServings, servings);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-stone-800/60 border border-stone-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {ing.hasIngredient ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="font-semibold text-stone-200">{ing.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={servings !== baseServings ? 'text-amber-300 font-bold' : 'text-stone-400'}>
                        {scaledAmount}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          ing.hasIngredient
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {ing.hasIngredient ? 'In Pantry' : 'Needed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step-by-Step Culinary Instructions with Cartoonized Illustrations */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Master Chef Preparation Steps ({recipe.steps.length})
              </h3>
              <span className="text-[10px] text-stone-500 font-medium">
                Illustrated Actions
              </span>
            </div>
            <div className="space-y-2.5">
              {recipe.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3.5 rounded-2xl bg-stone-800/50 border border-stone-700/60 flex items-center gap-3.5 hover:border-amber-500/40 transition-colors"
                >
                  <StepCartoonIllustration
                    instruction={step.instruction}
                    actionType={step.actionType}
                    stepNumber={step.stepNumber}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-200 leading-relaxed font-medium">
                      {step.instruction}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {step.estimatedMinutes && (
                        <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md">
                          ⏱ ~{step.estimatedMinutes} min
                        </span>
                      )}
                      {step.tip && (
                        <p className="text-[11px] text-amber-300/90 italic">
                          Chef Tip: {step.tip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-stone-950/90 border-t border-stone-800 flex items-center gap-3">
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
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Voice Cooking Assistant</span>
            {servings !== baseServings && (
              <span className="text-xs bg-stone-900/40 px-2 py-0.5 rounded-lg">
                ({servings} servings)
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
