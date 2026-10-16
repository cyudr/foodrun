/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { IngredientReview } from './components/IngredientReview';
import { RecipeList } from './components/RecipeList';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { VoiceCookingAssistant } from './components/VoiceCookingAssistant';
import { FavoritesView } from './components/FavoritesView';
import { TopBar, BottomTabBar } from './components/Navigation';
import { ChefProModal } from './components/ChefProModal';
import { ReverseEngineerModal } from './components/ReverseEngineerModal';
import { AdjustDishPhotoModal } from './components/AdjustDishPhotoModal';
import { UsageStatusModal } from './components/UsageStatusModal';
import { AdRewardModal } from './components/AdRewardModal';
import { Ingredient, Recipe, AppTab } from './types';
import { SupportedLanguage } from './utils/i18n';
import { speechController } from './utils/speech';
import {
  UsageState,
  getRefreshedUsageState,
  consumeUsage,
  rewardAdUsage,
} from './utils/usageCookies';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('scanner');

  // Multilingual Language state (English, Chinese, Malay, Korean, Tamil, Japanese)
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('snapchef_language') as SupportedLanguage;
      return saved && ['en', 'zh', 'ms', 'ko', 'ta', 'ja'].includes(saved) ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem('snapchef_ingredients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem('snapchef_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeCookingRecipe, setActiveCookingRecipe] = useState<Recipe | null>(null);

  // Chef Pro / Premium tier state strictly gated by invitation codes
  const [proCode, setProCode] = useState<string>(() => {
    try {
      return (localStorage.getItem('snapchef_pro_code') || '').trim();
    } catch {
      return '';
    }
  });

  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      const storedPro = localStorage.getItem('snapchef_is_pro') === 'true';
      const storedCode = (localStorage.getItem('snapchef_pro_code') || '').trim();
      return storedPro && storedCode.length > 0;
    } catch {
      return false;
    }
  });

  // Verify stored invitation code with backend on startup
  // Deactivates Pro immediately if no code was entered or if code is invalid
  useEffect(() => {
    const storedCode = (localStorage.getItem('snapchef_pro_code') || '').trim();
    if (!storedCode) {
      setIsPro(false);
      setProCode('');
      try {
        localStorage.removeItem('snapchef_is_pro');
        localStorage.removeItem('snapchef_pro_code');
      } catch {
        // ignore
      }
      return;
    }

    fetch('/api/gemini.ts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify-invite-code', code: storedCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.valid) {
          setIsPro(false);
          setProCode('');
          try {
            localStorage.removeItem('snapchef_is_pro');
            localStorage.removeItem('snapchef_pro_code');
          } catch {
            // ignore
          }
        } else {
          setIsPro(true);
        }
      })
      .catch(() => {
        // On connection error, do not allow unverified access
        setIsPro(false);
      });
  }, []);

  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalFeature, setProModalFeature] = useState<string>('reverse-engineer');

  // Reverse Engineer Modal state
  const [reverseEngineeredRecipe, setReverseEngineeredRecipe] = useState<Recipe | null>(null);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);

  // Adjust Dish Photo Modal state
  const [adjustPhotoRecipe, setAdjustPhotoRecipe] = useState<Recipe | null>(null);
  const [isAdjustPhotoModalOpen, setIsAdjustPhotoModalOpen] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingRecipes, setIsSearchingRecipes] = useState(false);
  const [isLoadingCustomRecipe, setIsLoadingCustomRecipe] = useState(false);

  // Cookie-based App Usage & Energy System (3/3 start, 2-hr refresh countdown on minute, watch ads to reset)
  const [usageState, setUsageState] = useState<UsageState>(() => getRefreshedUsageState());
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Periodic interval to refresh 2-hour timers live on the minute
  useEffect(() => {
    const timer = setInterval(() => {
      setUsageState(getRefreshedUsageState());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleConsumeUsage = (): boolean => {
    if (isPro) return true;
    const current = getRefreshedUsageState();
    if (current.count <= 0) {
      setUsageState(current);
      setIsUsageModalOpen(true);
      return false;
    }
    const result = consumeUsage(isPro);
    setUsageState(result.state);
    return result.success;
  };

  const handleRewardEarned = () => {
    const nextState = rewardAdUsage();
    setUsageState(nextState);
  };

  const [chefTip, setChefTip] = useState<string>('');
  const [suggestedCuisines, setSuggestedCuisines] = useState<string[]>([]);

  // Keep speechController in sync with active language
  useEffect(() => {
    speechController.setLanguage(currentLanguage);
  }, [currentLanguage]);

  // Persist language to localStorage
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    try {
      localStorage.setItem('snapchef_language', lang);
    } catch {
      // ignore
    }
    speechController.setLanguage(lang);
  };

  // Persist ingredients to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('snapchef_ingredients', JSON.stringify(ingredients));
    } catch {
      // ignore
    }
  }, [ingredients]);

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('snapchef_favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  // Verify invitation code against server
  const handleActivateWithCode = async (
    code: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch('/api/gemini.ts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-invite-code',
          code,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.valid) {
        setIsPro(true);
        setProCode(code);
        try {
          localStorage.setItem('snapchef_is_pro', 'true');
          localStorage.setItem('snapchef_pro_code', code);
        } catch {
          // ignore
        }
        return {
          success: true,
          message: data.message || 'Invitation code verified! Welcome to Chef Pro.',
        };
      } else {
        return {
          success: false,
          message: data.error || 'Invalid invitation code. Please check your code and try again.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Verification connection error.',
      };
    }
  };

  // Toggle or deactivate Pro
  const handleTogglePro = () => {
    if (isPro) {
      // Deactivate Pro
      setIsPro(false);
      setProCode('');
      try {
        localStorage.removeItem('snapchef_is_pro');
        localStorage.removeItem('snapchef_pro_code');
      } catch {
        // ignore
      }
    } else {
      // Open modal for entering invitation code
      setIsProModalOpen(true);
    }
  };

  const handleOpenProModal = (feature: string = 'reverse-engineer') => {
    setProModalFeature(feature);
    setIsProModalOpen(true);
  };

  // Reverse engineer recipe completed callback
  const handleReverseEngineerCompleted = (recipe: Recipe) => {
    setReverseEngineeredRecipe(recipe);
    setIsReverseModalOpen(true);
    setRecipes((prev) => {
      if (prev.some((r) => r.id === recipe.id)) return prev;
      return [recipe, ...prev];
    });
  };

  // Open adjust photo modal (Chef Pro feature)
  const handleOpenAdjustPhoto = (recipe: Recipe) => {
    if (!isPro) {
      handleOpenProModal('adjust-photo');
      return;
    }
    setAdjustPhotoRecipe(recipe);
    setIsAdjustPhotoModalOpen(true);
  };

  // Apply adjusted photo
  const handlePhotoAdjusted = (updatedRecipe: Recipe) => {
    setRecipes((prev) => prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)));
    setFavorites((prev) => prev.map((f) => (f.id === updatedRecipe.id ? updatedRecipe : f)));
    if (selectedRecipe && selectedRecipe.id === updatedRecipe.id) {
      setSelectedRecipe(updatedRecipe);
    }
    if (reverseEngineeredRecipe && reverseEngineeredRecipe.id === updatedRecipe.id) {
      setReverseEngineeredRecipe(updatedRecipe);
    }
    if (activeCookingRecipe && activeCookingRecipe.id === updatedRecipe.id) {
      setActiveCookingRecipe(updatedRecipe);
    }
  };

  // Add missing ingredients from reverse-engineered dish to pantry
  const handleAddMissingToPantry = (missingNames: string[]) => {
    if (!missingNames || missingNames.length === 0) return;
    missingNames.forEach((name) => {
      handleAddIngredient(name, 'Grocery');
    });
    alert(`Added ${missingNames.length} missing ingredients to your pantry list!`);
  };

  // Handle ingredients detected from photo
  const handleIngredientsDetected = (data: {
    ingredients: any[];
    suggestedCuisines?: string[];
    chefTip?: string;
  }) => {
    if (data.ingredients && data.ingredients.length > 0) {
      setIngredients((prev) => {
        // Deduplicate by name
        const existingNames = new Set(prev.map((i) => i.name.toLowerCase()));
        const newOnes = data.ingredients.filter(
          (i) => !existingNames.has(i.name.toLowerCase())
        );
        return [...prev, ...newOnes];
      });
    }

    if (data.chefTip) setChefTip(data.chefTip);
    if (data.suggestedCuisines) setSuggestedCuisines(data.suggestedCuisines);

    // Switch to pantry review tab
    setCurrentTab('pantry');
  };

  // Toggle ingredient check for search
  const handleToggleCheck = (id: string) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // Remove single ingredient
  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  // Manually add ingredient
  const handleAddIngredient = (name: string, category: string = 'Other') => {
    const newItem: Ingredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      confidence: 'high',
      state: 'Available',
      quantity: '',
      checked: true,
    };
    setIngredients((prev) => [...prev, newItem]);
  };

  // Clear all ingredients
  const handleClearAllIngredients = () => {
    if (confirm('Clear all identified ingredients from your pantry list?')) {
      setIngredients([]);
      setRecipes([]);
    }
  };

  // Generate recipes with active language
  const handleFindGeminiRecipes = async () => {
    const activeIngredients = ingredients.filter((i) => i.checked).map((i) => i.name);
    if (activeIngredients.length === 0) return;

    if (!handleConsumeUsage()) return;

    setIsSearchingRecipes(true);
    try {
      const payload = {
        action: 'find-recipes',
        ingredients: activeIngredients,
        language: currentLanguage,
      };
      const response = await fetch('/api/gemini.ts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate recipes');
      }

      const data = await response.json();
      setRecipes(data.recipes || []);
      setCurrentTab('recipes');
    } catch (err: any) {
      console.error('Error fetching recipes:', err);
      alert(err.message || 'Could not fetch recipes at this moment');
    } finally {
      setIsSearchingRecipes(false);
    }
  };

  // Generate Bespoke Custom Recipe with active language
  const handleGenerateCustomRecipe = async () => {
    const activeIngredients = ingredients.filter((i) => i.checked).map((i) => i.name);
    if (activeIngredients.length === 0) {
      alert('Please check at least 1 ingredient first!');
      return;
    }

    if (!handleConsumeUsage()) return;

    setIsLoadingCustomRecipe(true);
    try {
      const payload = {
        action: 'generate-recipe',
        ingredients: activeIngredients,
        mealType: 'Dinner',
        dietaryPreference: 'None',
        language: currentLanguage,
      };

      const response = await fetch('/api/gemini.ts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate custom recipe');
      }

      const data = await response.json();
      if (data.recipe) {
        setRecipes((prev) => [data.recipe, ...prev.filter((r) => r.id !== data.recipe.id)]);
        setSelectedRecipe(data.recipe);
        setCurrentTab('recipes');
      }
    } catch (err: any) {
      console.error('Custom recipe error:', err);
      alert(err.message || 'Could not generate custom recipe');
    } finally {
      setIsLoadingCustomRecipe(false);
    }
  };

  // Toggle favorite recipe
  const handleToggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  };

  // Launch Voice Cooking Assistant
  const handleStartCooking = (recipe: Recipe) => {
    setSelectedRecipe(null);
    setIsReverseModalOpen(false);
    setActiveCookingRecipe(recipe);
    setCurrentTab('cooking');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col antialiased selection:bg-amber-200 selection:text-amber-900">
      {/* Top Bar (Hidden when actively in voice cooking mode) */}
      {currentTab !== 'cooking' && (
        <TopBar
          currentTab={currentTab}
          pantryCount={ingredients.length}
          onGoToScanner={() => setCurrentTab('scanner')}
          isPro={isPro}
          onOpenProModal={() => handleOpenProModal('reverse-engineer')}
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
          usageState={usageState}
          onOpenUsageModal={() => setIsUsageModalOpen(true)}
        />
      )}

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {/* Tab 1: Scanner */}
        {currentTab === 'scanner' && (
          <CameraScanner
            onIngredientsDetected={handleIngredientsDetected}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            onViewPantry={() => setCurrentTab('pantry')}
            pantryCount={ingredients.length}
            userIngredients={ingredients.filter((i) => i.checked).map((i) => i.name)}
            isPro={isPro}
            proCode={proCode}
            onOpenProModal={handleOpenProModal}
            onReverseEngineerCompleted={handleReverseEngineerCompleted}
            currentLanguage={currentLanguage}
            onConsumeUsage={handleConsumeUsage}
            onOpenUsageModal={() => setIsUsageModalOpen(true)}
          />
        )}

        {/* Tab 2: Pantry Review */}
        {currentTab === 'pantry' && (
          <IngredientReview
            ingredients={ingredients}
            onToggleCheck={handleToggleCheck}
            onRemoveIngredient={handleRemoveIngredient}
            onAddIngredient={handleAddIngredient}
            onClearAll={handleClearAllIngredients}
            onTakeAnotherPhoto={() => setCurrentTab('scanner')}
            onFindGeminiRecipes={handleFindGeminiRecipes}
            onGenerateCustomRecipe={handleGenerateCustomRecipe}
            chefTip={chefTip}
            suggestedCuisines={suggestedCuisines}
            isSearchingRecipes={isSearchingRecipes}
            currentLanguage={currentLanguage}
          />
        )}

        {/* Tab 3: Recipes List */}
        {currentTab === 'recipes' && (
          <RecipeList
            recipes={recipes}
            userIngredients={ingredients.filter((i) => i.checked).map((i) => i.name)}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onStartCooking={handleStartCooking}
            onGenerateCustomRecipe={handleGenerateCustomRecipe}
            onBackToPantry={() => setCurrentTab('pantry')}
            isLoadingCustomRecipe={isLoadingCustomRecipe}
            onAdjustPhoto={handleOpenAdjustPhoto}
          />
        )}

        {/* Tab 4: Favorites */}
        {currentTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onStartCooking={handleStartCooking}
            onGoToScanner={() => setCurrentTab('scanner')}
          />
        )}

        {/* Tab 5: Dedicated Fullscreen Voice Cooking Assistant */}
        {currentTab === 'cooking' && activeCookingRecipe && (
          <VoiceCookingAssistant
            recipe={activeCookingRecipe}
            onExit={() => {
              setActiveCookingRecipe(null);
              setCurrentTab('recipes');
            }}
            onRecipeCompleted={() => {
              // auto-favorite or celebrate
            }}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        )}
      </main>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        isFavorite={selectedRecipe ? favorites.some((f) => f.id === selectedRecipe.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onStartCooking={handleStartCooking}
        onAdjustPhoto={handleOpenAdjustPhoto}
        currentLanguage={currentLanguage}
      />

      {/* Reverse Engineer / Recreate Dish Modal */}
      <ReverseEngineerModal
        recipe={reverseEngineeredRecipe}
        isOpen={isReverseModalOpen}
        onClose={() => setIsReverseModalOpen(false)}
        isFavorite={reverseEngineeredRecipe ? favorites.some((f) => f.id === reverseEngineeredRecipe.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onStartCooking={handleStartCooking}
        onAddMissingToPantry={handleAddMissingToPantry}
        onAdjustPhoto={handleOpenAdjustPhoto}
        currentLanguage={currentLanguage}
      />

      {/* Adjust Dish Photo Modal */}
      <AdjustDishPhotoModal
        recipe={adjustPhotoRecipe}
        isOpen={isAdjustPhotoModalOpen}
        onClose={() => {
          setIsAdjustPhotoModalOpen(false);
          setAdjustPhotoRecipe(null);
        }}
        onPhotoAdjusted={handlePhotoAdjusted}
        userIngredients={ingredients.filter((i) => i.checked).map((i) => i.name)}
      />

      {/* Chef Pro / Premium Modal with Invitation Code */}
      <ChefProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        isPro={isPro}
        onTogglePro={handleTogglePro}
        onActivateWithCode={handleActivateWithCode}
        proCode={proCode}
        targetFeature={proModalFeature}
      />

      {/* Cookie-based Usage & Credit Status Modal */}
      <UsageStatusModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        usageState={usageState}
        isPro={isPro}
        onWatchAd={() => {
          setIsUsageModalOpen(false);
          setIsAdModalOpen(true);
        }}
        onOpenProModal={() => {
          setIsUsageModalOpen(false);
          setIsProModalOpen(true);
        }}
        currentLanguage={currentLanguage}
      />

      {/* Sponsor Ad Reward Player Modal to Reset +1 Counter */}
      <AdRewardModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onRewardEarned={handleRewardEarned}
        currentCount={usageState.count}
        maxCount={usageState.maxCount}
        currentLanguage={currentLanguage}
      />

      {/* Mobile Floating Bottom Tab Bar */}
      <BottomTabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        pantryCount={ingredients.length}
        recipesCount={recipes.length}
        favoritesCount={favorites.length}
        hasActiveCookingSession={!!activeCookingRecipe && currentTab !== 'cooking'}
        onResumeCooking={() => setCurrentTab('cooking')}
        currentLanguage={currentLanguage}
      />
    </div>
  );
}
