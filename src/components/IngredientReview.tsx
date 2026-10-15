import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Camera,
  Search,
  Sparkles,
  Layers,
  Info,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Ingredient } from '../types';
import { SupportedLanguage, t, translateIngredient } from '../utils/i18n';

interface IngredientReviewProps {
  ingredients: Ingredient[];
  onToggleCheck: (id: string) => void;
  onRemoveIngredient: (id: string) => void;
  onAddIngredient: (name: string, category?: string) => void;
  onClearAll: () => void;
  onTakeAnotherPhoto: () => void;
  onFindGeminiRecipes: () => void;
  onGenerateCustomRecipe: () => void;
  chefTip?: string;
  suggestedCuisines?: string[];
  isSearchingRecipes: boolean;
  currentLanguage?: SupportedLanguage;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Produce: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Meat & Seafood': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Dairy & Eggs': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Pantry & Seasonings': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Bakery & Grains': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  Other: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
};

export const IngredientReview: React.FC<IngredientReviewProps> = ({
  ingredients,
  onToggleCheck,
  onRemoveIngredient,
  onAddIngredient,
  onClearAll,
  onTakeAnotherPhoto,
  onFindGeminiRecipes,
  onGenerateCustomRecipe,
  chefTip,
  suggestedCuisines,
  isSearchingRecipes,
  currentLanguage = 'en',
}) => {
  const [newIngredientName, setNewIngredientName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  const selectedCount = ingredients.filter((i) => i.checked).length;

  const categories = ['All', ...Array.from(new Set(ingredients.map((i) => i.category || 'Other')))];

  const filteredIngredients =
    selectedCategoryFilter === 'All'
      ? ingredients
      : ingredients.filter((i) => (i.category || 'Other') === selectedCategoryFilter);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;
    onAddIngredient(newIngredientName.trim(), 'Other');
    setNewIngredientName('');
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-28 pt-2">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
            {t('pantryReviewTitle', currentLanguage)}
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            {selectedCount} of {ingredients.length} items selected for recipes
          </p>
        </div>

        {ingredients.length > 0 && (
          <button
            onClick={onClearAll}
            type="button"
            className="text-stone-500 hover:text-red-500 text-xs font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Chef Tip & Suggested Cuisines Callout */}
      {(chefTip || (suggestedCuisines && suggestedCuisines.length > 0)) && (
        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              {chefTip && (
                <p className="text-xs text-stone-800 font-medium leading-relaxed">
                  <span className="font-bold text-amber-900">{t('chefNotes', currentLanguage)}:</span> {chefTip}
                </p>
              )}
              {suggestedCuisines && suggestedCuisines.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-wider">
                    Ideal for:
                  </span>
                  {suggestedCuisines.map((c, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat === 'All' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Ingredients List */}
      <div className="mt-2 space-y-2">
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-stone-300 p-6">
            <Layers className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-600">
              {t('noIngredients', currentLanguage)}
            </p>
            <button
              onClick={onTakeAnotherPhoto}
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              {t('snapPhoto', currentLanguage)}
            </button>
          </div>
        ) : (
          filteredIngredients.map((item) => {
            const catStyle =
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
            const displayName = translateIngredient(item.name, currentLanguage);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl bg-white border transition-all flex items-center justify-between shadow-2xs ${
                  item.checked
                    ? 'border-stone-200 hover:border-amber-300'
                    : 'border-stone-100 opacity-60 bg-stone-50'
                }`}
              >
                {/* Left: Checkbox + Name */}
                <div
                  onClick={() => onToggleCheck(item.id)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-amber-500 text-stone-950 font-black'
                        : 'border-2 border-stone-300 bg-white'
                    }`}
                  >
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm truncate">
                        {displayName}
                      </span>
                      {displayName !== item.name && (
                        <span className="text-[10px] text-stone-600 truncate">
                          ({item.name})
                        </span>
                      )}
                      {item.state && (
                        <span className="text-[10px] text-stone-600 font-medium bg-stone-100 px-1.5 py-0.5 rounded-md">
                          {item.state}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {item.category}
                      </span>
                      {item.quantity && (
                        <span className="text-[10px] text-stone-600">
                          • {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item.id)}
                  className="p-2 text-stone-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors ml-2 cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Ingredient Add Bar */}
      <form onSubmit={handleAddSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newIngredientName}
          onChange={(e) => setNewIngredientName(e.target.value)}
          placeholder={t('quickAddPlaceholder', currentLanguage)}
          className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
        <button
          type="submit"
          className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white rounded-2xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addIngredient', currentLanguage)}
        </button>
      </form>

      {/* Multi-photo repetition prompt */}
      <div className="mt-4 pt-3 border-t border-stone-200">
        <button
          onClick={onTakeAnotherPhoto}
          type="button"
          className="w-full py-3 px-4 rounded-2xl border border-dashed border-amber-400 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <Camera className="w-4 h-4 text-amber-700" />
          📸 Take Another Photo to Add More Ingredients
        </button>
        <p className="text-[11px] text-stone-600 text-center mt-1">
          Add items from your fridge, spice rack, or pantry shelf.
        </p>
      </div>

      {/* Primary Action Buttons: Find with Gemini AI */}
      <div className="mt-5 space-y-2.5">
        <button
          onClick={onFindGeminiRecipes}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSearchingRecipes ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {t('findRecipes', currentLanguage)} ({selectedCount})
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGenerateCustomRecipe}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-amber-400 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-stone-800 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t('generateCustom', currentLanguage)}
        </button>
      </div>
    </div>
  );
};
