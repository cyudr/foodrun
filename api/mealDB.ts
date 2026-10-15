import { Router, Request, Response } from 'express';

export const mealDbRouter = Router();

// In-memory cache for TheMealDB lookups to keep search snappy
const mealDbCache = new Map<string, any>();

// Common kitchen staples that don't penalize recipe match score
const KITCHEN_STAPLES = new Set([
  'salt',
  'water',
  'black pepper',
  'pepper',
  'olive oil',
  'vegetable oil',
  'oil',
  'sugar',
  'flour',
  'all-purpose flour',
  'butter',
  'garlic',
  'onion',
]);

function getMealDbBaseUrl(): string {
  const key = process.env.mealDB_KEY || process.env.MEALDB_KEY || '1';
  return `https://www.themealdb.com/api/json/v1/${key}`;
}

function cleanIngredientName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(fresh|organic|raw|diced|chopped|sliced|canned|dried|crushed|minced|whole)\s+/i, '')
    .trim();
}

function detectMinutes(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:mins?|minutes?)/i);
  if (match) {
    return parseInt(match[2] || match[1], 10);
  }
  return undefined;
}

// 1. Search recipes matching a list of ingredients
mealDbRouter.post('/search-by-ingredients', async (req: Request, res: Response) => {
  try {
    const { ingredients = [] } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    const baseUrl = getMealDbBaseUrl();
    const cleanedUserIngredients = ingredients.map((i: string) => cleanIngredientName(i));

    // Fetch recipes from TheMealDB for up to 6 key ingredients
    const searchTerms = cleanedUserIngredients.slice(0, 6);
    const searchPromises = searchTerms.map(async (term) => {
      try {
        const queryTerm = encodeURIComponent(term.replace(/\s+/g, '_'));
        const response = await fetch(`${baseUrl}/filter.php?i=${queryTerm}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.meals || [];
      } catch (err) {
        console.warn(`TheMealDB search failed for ${term}:`, err);
        return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const candidateMealIds = new Set<string>();

    for (const meals of searchResults) {
      for (const meal of meals) {
        candidateMealIds.add(meal.idMeal);
      }
    }

    // If few results found, also try search by main keyword
    if (candidateMealIds.size < 4 && searchTerms[0]) {
      try {
        const sRes = await fetch(`${baseUrl}/search.php?s=${encodeURIComponent(searchTerms[0])}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          (sData.meals || []).forEach((m: any) => candidateMealIds.add(m.idMeal));
        }
      } catch {
        // ignore
      }
    }

    // Lookup meal details (up to 16 meals)
    const idsToLookup = Array.from(candidateMealIds).slice(0, 16);
    const lookupPromises = idsToLookup.map(async (id) => {
      if (mealDbCache.has(id)) {
        return mealDbCache.get(id);
      }
      try {
        const fetchRes = await fetch(`${baseUrl}/lookup.php?i=${id}`);
        if (!fetchRes.ok) return null;
        const data = await fetchRes.json();
        const meal = data.meals?.[0];
        if (meal) {
          mealDbCache.set(id, meal);
        }
        return meal;
      } catch {
        return null;
      }
    });

    const fullMeals = (await Promise.all(lookupPromises)).filter(Boolean);

    // Compute ingredient match rates
    const processedRecipes = fullMeals.map((meal: any) => {
      const recipeIngredients: { name: string; measure: string; hasIngredient: boolean; isStaple: boolean }[] = [];

      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
          const cleanIng = cleanIngredientName(ing);
          const isStaple = KITCHEN_STAPLES.has(cleanIng);

          const hasIngredient = cleanedUserIngredients.some((userIng: string) => {
            return (
              cleanIng.includes(userIng) ||
              userIng.includes(cleanIng) ||
              cleanIng.startsWith(userIng.slice(0, 4))
            );
          });

          recipeIngredients.push({
            name: ing.trim(),
            measure: measure ? measure.trim() : '',
            hasIngredient,
            isStaple,
          });
        }
      }

      const totalIngredients = recipeIngredients.length;
      const matchedIngredients = recipeIngredients.filter((r) => r.hasIngredient);
      const missingIngredients = recipeIngredients.filter((r) => !r.hasIngredient);
      const nonStapleRequired = recipeIngredients.filter((r) => !r.isStaple);
      const nonStapleMatched = nonStapleRequired.filter((r) => r.hasIngredient);

      const matchPercentage =
        nonStapleRequired.length > 0
          ? Math.round((nonStapleMatched.length / nonStapleRequired.length) * 100)
          : Math.round((matchedIngredients.length / (totalIngredients || 1)) * 100);

      // Split instructions into actionable numbered steps
      const rawInstructions = meal.strInstructions || '';
      const stepLines = rawInstructions
        .split(/\r?\n+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 10);

      const formattedSteps = stepLines.length > 1
        ? stepLines.map((text: string, idx: number) => ({
            stepNumber: idx + 1,
            instruction: text.replace(/^Step\s*\d+[:.]?\s*/i, '').trim(),
            estimatedMinutes: detectMinutes(text),
          }))
        : rawInstructions
            .split(/(?<=[.?!])\s+(?=[A-Z])/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 15)
            .map((text: string, idx: number) => ({
              stepNumber: idx + 1,
              instruction: text,
              estimatedMinutes: detectMinutes(text),
            }));

      return {
        id: meal.idMeal,
        title: meal.strMeal,
        source: 'TheMealDB',
        category: meal.strCategory || 'General',
        area: meal.strArea || 'International',
        imageUrl: meal.strMealThumb || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80',
        youtubeUrl: meal.strYoutube || '',
        tags: meal.strTags ? meal.strTags.split(',').map((t: string) => t.trim()) : [],
        instructions: meal.strInstructions,
        steps: formattedSteps,
        ingredients: recipeIngredients,
        matchedCount: matchedIngredients.length,
        missingCount: missingIngredients.length,
        totalIngredients,
        matchPercentage,
        estimatedTimeMinutes: Math.max(15, formattedSteps.length * 5),
        difficulty: formattedSteps.length > 6 ? 'Medium' : 'Easy',
      };
    });

    processedRecipes.sort((a: any, b: any) => {
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage;
      }
      return b.matchedCount - a.matchedCount;
    });

    return res.json({
      recipes: processedRecipes,
      totalFound: processedRecipes.length,
      userIngredients: ingredients,
    });
  } catch (error: any) {
    console.error('Error in /api/mealDB/search-by-ingredients:', error);
    return res.status(500).json({ error: error?.message || 'Failed to query TheMealDB' });
  }
});

// 2. Direct lookup by Meal ID
mealDbRouter.get('/lookup/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const baseUrl = getMealDbBaseUrl();
    const fetchRes = await fetch(`${baseUrl}/lookup.php?i=${id}`);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: 'MealDB lookup failed' });
    }
    const data = await fetchRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to lookup meal' });
  }
});

// 3. Random meal inspiration
mealDbRouter.get('/random', async (_req: Request, res: Response) => {
  try {
    const baseUrl = getMealDbBaseUrl();
    const fetchRes = await fetch(`${baseUrl}/random.php`);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: 'MealDB random failed' });
    }
    const data = await fetchRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to get random meal' });
  }
});

export default mealDbRouter;
