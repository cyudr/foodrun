import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

export const geminiRouter = Router();

// Dynamic initialization to pick up GEMINI_KEY (or GEMINI_API_KEY)
function getGeminiClient(): { ai: GoogleGenAI; keySource: string } {
  const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_KEY or GEMINI_API_KEY is not configured in environment variables');
  }

  const keySource = process.env.GEMINI_KEY ? 'GEMINI_KEY' : 'GEMINI_API_KEY';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { ai, keySource };
}

// Resilient generateContent helper that tries gemini-flash-latest first,
// with graceful fallback to gemini-3.8-flash and gemini-3.1-flash-lite
async function generateWithFallback(ai: GoogleGenAI, params: any) {
  const models = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} request failed, trying next fallback:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}

// Curated culinary food images for recipe presentations
const RECIPE_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
];

// Check Gemini Key Status
export function handleKeyStatus(_req: Request, res: Response) {
  try {
    const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        configured: false,
        status: 'missing_key',
        message: 'No GEMINI_KEY or GEMINI_API_KEY found in environment variables.',
      });
    }

    const keySource = process.env.GEMINI_KEY ? 'GEMINI_KEY' : 'GEMINI_API_KEY';
    const masked = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';

    return res.json({
      configured: true,
      status: 'ready',
      keySource,
      maskedKey: masked,
      message: 'Gemini AI connection is active and ready.',
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: false,
      status: 'error',
      message: err?.message || 'Error checking Gemini key status',
    });
  }
}

// 1. Photo Analysis: Identify Ingredients
export async function handleIdentify(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const { ai } = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image carefully to identify ALL visible food ingredients, raw vegetables, fruits, meats, seafood, dairy, eggs, pantry staples, herbs, spices, or condiments.
For every distinct ingredient identified:
1. Provide the singular culinary English name (e.g., "Tomato", "Chicken Breast", "Garlic", "Onion", "Egg", "Bell Pepper", "Soy Sauce", "Milk", "Potato").
2. Assign an appropriate culinary category: "Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry & Seasonings", "Bakery & Grains", or "Other".
3. Provide confidence ("high", "medium", or "low").
4. Note its state/freshness if apparent (e.g. "Fresh", "Ripe", "Raw", "Chopped", "Canned", "Chilled").
5. Note estimated visible quantity if discernable (e.g. "3 items", "1 bunch", "approx. 250g", "1 carton").

Also provide 2 to 4 cuisine inspiration tags (e.g. "Italian", "Mexican", "Asian", "Mediterranean") and a short chef tip for cooking with these ingredients.
Return valid JSON according to the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  state: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                },
                required: ['name', 'category', 'confidence'],
              },
            },
            suggestedCuisines: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            chefTip: { type: Type.STRING },
          },
          required: ['ingredients'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const ingredientsWithIds = (parsed.ingredients || []).map((item: any, idx: number) => ({
      id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || 'Unknown Ingredient',
      category: item.category || 'Produce',
      confidence: item.confidence || 'high',
      state: item.state || 'Fresh',
      quantity: item.quantity || '',
      checked: true,
    }));

    return res.json({
      ingredients: ingredientsWithIds,
      suggestedCuisines: parsed.suggestedCuisines || ['Comfort Food', 'Quick Dinner'],
      chefTip: parsed.chefTip || 'Ensure vegetables are washed and prepped before starting your recipe.',
    });
  } catch (error: any) {
    console.error('Error in handleIdentify:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze image with Gemini',
    });
  }
}

// 2. Recipe Generation: Multi-Recipe Discovery via Gemini
export async function handleFindRecipes(req: Request, res: Response) {
  try {
    const { ingredients = [], preferences = '' } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    const { ai } = getGeminiClient();

    const prompt = `You are a world-class culinary chef. Generate 5 diverse, mouth-watering, realistic recipes that feature and make maximum use of these user-provided ingredients:
${ingredients.join(', ')}.

Preferences: ${preferences || 'Balanced variety: 1 quick 15-min meal, 1 comforting classic, 1 fresh healthy dish, 1 creative gourmet option'}.

Instructions:
1. Maximize use of user ingredients. Basic pantry items (salt, pepper, cooking oil, water, butter) can be assumed available.
2. For each ingredient in every recipe, explicitly set:
   - "hasIngredient": true if the user provided it (or very similar), false if it's an extra item.
   - "isStaple": true if it's a basic kitchen staple (salt, oil, pepper, water, flour).
3. Compute an honest matchPercentage (0 to 100) based on how much of the dish can be made with user's items.
4. Break each recipe into clear, numbered cooking steps. Each step should be concise and spoken-friendly for a voice cooking assistant.
5. Provide realistic prep and cook times in minutes, difficulty ("Easy", "Medium", "Hard"), and servings.
6. Provide an imageKeyword for each dish (e.g. "pasta", "soup", "salad", "stir-fry", "curry", "roast").

Return pure JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  area: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  prepTimeMinutes: { type: Type.NUMBER },
                  cookTimeMinutes: { type: Type.NUMBER },
                  servings: { type: Type.NUMBER },
                  imageKeyword: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        measure: { type: Type.STRING },
                        hasIngredient: { type: Type.BOOLEAN },
                        isStaple: { type: Type.BOOLEAN },
                      },
                      required: ['name', 'measure', 'hasIngredient', 'isStaple'],
                    },
                  },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.NUMBER },
                        instruction: { type: Type.STRING },
                        estimatedMinutes: { type: Type.NUMBER },
                        tip: { type: Type.STRING },
                      },
                      required: ['stepNumber', 'instruction'],
                    },
                  },
                  matchPercentage: { type: Type.NUMBER },
                  chefNotes: { type: Type.STRING },
                },
                required: ['title', 'category', 'area', 'difficulty', 'ingredients', 'steps', 'cookTimeMinutes'],
              },
            },
          },
          required: ['recipes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const processedRecipes = (parsed.recipes || []).map((recipe: any, index: number) => {
      const totalIng = (recipe.ingredients || []).length;
      const matched = (recipe.ingredients || []).filter((i: any) => i.hasIngredient).length;
      const missing = (recipe.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;

      const fallbackImage = RECIPE_IMAGE_FALLBACKS[index % RECIPE_IMAGE_FALLBACKS.length];

      return {
        id: `gemini-rec-${Date.now()}-${index}`,
        title: recipe.title,
        source: 'Gemini AI',
        description: recipe.description || 'Crafted with Gemini AI chef intelligence.',
        category: recipe.category || 'Chef Special',
        area: recipe.area || 'Fusion',
        imageUrl: fallbackImage,
        difficulty: recipe.difficulty || 'Easy',
        estimatedTimeMinutes: (recipe.prepTimeMinutes || 10) + (recipe.cookTimeMinutes || 15),
        servings: recipe.servings || 2,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        matchPercentage: recipe.matchPercentage || Math.round((matched / (totalIng || 1)) * 100),
        matchedCount: matched,
        missingCount: missing,
        totalIngredients: totalIng,
        chefNotes: recipe.chefNotes || 'Cook with love and season to taste.',
      };
    });

    processedRecipes.sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);

    return res.json({
      recipes: processedRecipes,
      totalFound: processedRecipes.length,
      userIngredients: ingredients,
    });
  } catch (error: any) {
    console.error('Error in handleFindRecipes:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate recipes with Gemini' });
  }
}

// 3. Single Custom Recipe Generation
export async function handleCustomRecipe(req: Request, res: Response) {
  try {
    const { ingredients = [], mealType = 'Any', dietaryPreference = 'None' } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients list is required' });
    }

    const { ai } = getGeminiClient();

    const prompt = `You are an expert chef creating a single bespoke gourmet recipe using these ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Requirements:
1. Create a clear recipe name that sounds appetizing.
2. Utilize as many of the user's available ingredients as possible.
3. Provide realistic prep time, cook time, difficulty, and servings.
4. Break down the cooking process into concise, well-sequenced, spoken-friendly cooking steps.
5. Add timer recommendation for steps requiring cooking/simmering/baking.
6. Provide chef advice/pro-tips.

Return purely JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            area: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            prepTimeMinutes: { type: Type.NUMBER },
            cookTimeMinutes: { type: Type.NUMBER },
            servings: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  measure: { type: Type.STRING },
                  hasIngredient: { type: Type.BOOLEAN },
                  isStaple: { type: Type.BOOLEAN },
                },
                required: ['name', 'measure', 'hasIngredient', 'isStaple'],
              },
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  instruction: { type: Type.STRING },
                  estimatedMinutes: { type: Type.NUMBER },
                  tip: { type: Type.STRING },
                },
                required: ['stepNumber', 'instruction'],
              },
            },
            chefNotes: { type: Type.STRING },
          },
          required: ['title', 'ingredients', 'steps', 'difficulty', 'cookTimeMinutes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const customRecipe = {
      id: `custom-${Date.now()}`,
      title: parsed.title || 'Gemini Chef Special Creation',
      source: 'Gemini AI',
      description: parsed.description || 'Custom crafted recipe by Gemini AI based on your fresh ingredients.',
      category: parsed.category || 'Chef Special',
      area: parsed.area || 'Fusion',
      imageUrl: RECIPE_IMAGE_FALLBACKS[0],
      difficulty: parsed.difficulty || 'Easy',
      estimatedTimeMinutes: (parsed.prepTimeMinutes || 10) + (parsed.cookTimeMinutes || 20),
      servings: parsed.servings || 2,
      ingredients: parsed.ingredients || [],
      steps: parsed.steps || [],
      matchPercentage: 95,
      matchedCount: (parsed.ingredients || []).filter((i: any) => i.hasIngredient).length,
      missingCount: (parsed.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length,
      totalIngredients: (parsed.ingredients || []).length,
      chefNotes: parsed.chefNotes || 'Adjust seasoning to taste.',
    };

    return res.json({ recipe: customRecipe });
  } catch (error: any) {
    console.error('Error in handleCustomRecipe:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate custom recipe' });
  }
}

// 4. Voice TTS via Gemini
export async function handleTts(req: Request, res: Response) {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const { ai } = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 500),
              speechMetadata: {
                style: 'Warm, clear, encouraging cooking chef assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    return res.json({
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (err: any) {
    console.warn('TTS request error:', err?.message);
    return res.status(500).json({ error: 'TTS fallback needed' });
  }
}

// Universal Serverless Dispatcher for /api/gemini
export async function handleGeminiServerless(req: Request, res: Response) {
  if (req.method === 'GET') {
    return handleKeyStatus(req, res);
  }

  const action = req.body?.action;
  if (action === 'status' || action === 'check-key') {
    return handleKeyStatus(req, res);
  }
  if (action === 'identify' || action === 'identify-ingredients' || req.body?.imageBase64) {
    return handleIdentify(req, res);
  }
  if (action === 'generate-recipe' || action === 'custom-recipe') {
    return handleCustomRecipe(req, res);
  }
  if (action === 'find-recipes' || action === 'search-recipes' || req.body?.ingredients) {
    return handleFindRecipes(req, res);
  }
  if (action === 'tts' || req.body?.text) {
    return handleTts(req, res);
  }

  return res.status(400).json({
    error: 'Missing or unrecognized action. Expected action: identify, find-recipes, generate-recipe, or tts',
  });
}

// Mount routes on router
geminiRouter.get('/status', handleKeyStatus);
geminiRouter.all('/', handleGeminiServerless);
geminiRouter.post('/identify', handleIdentify);
geminiRouter.post('/identify-ingredients', handleIdentify);
geminiRouter.post('/find-recipes', handleFindRecipes);
geminiRouter.post('/search-recipes', handleFindRecipes);
geminiRouter.post('/generate-recipe', handleCustomRecipe);
geminiRouter.post('/tts', handleTts);

export default geminiRouter;
