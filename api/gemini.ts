import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

export const geminiRouter = Router();

// Lazy or dynamic initialization to pick up runtime environment variables
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_KEY or GEMINI_API_KEY is not configured in environment variables');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function handleIdentify(req: Request, res: Response) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    console.error('Error in /api/gemini/identify-ingredients:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to identify ingredients from image',
    });
  }
}

// Bind both paths to handleIdentify
geminiRouter.post('/identify-ingredients', handleIdentify);
geminiRouter.post('/identify', handleIdentify);

// 2. Generate Custom Tailored AI Recipe
geminiRouter.post('/generate-recipe', async (req: Request, res: Response) => {
  try {
    const { ingredients = [], mealType = 'Any', dietaryPreference = 'None' } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients list is required' });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert chef creating a delicious, realistic, high-rated home recipe specifically featuring these identified ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Requirements:
1. Create a clear recipe name that sounds appetizing and restaurant-quality.
2. Utilize as many of the user's available ingredients as possible. Assume basic pantry items (salt, pepper, cooking oil, water) are always on hand.
3. Provide realistic prep time, cook time, difficulty (Easy, Medium, Hard), and servings.
4. Break down the cooking process into concise, well-sequenced, spoken-friendly cooking steps (each step should be easy to listen to while cooking).
5. Add timer recommendation for steps requiring cooking/simmering/baking.
6. Provide chef advice/pro-tips.

Return purely JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
      title: parsed.title || 'Chef Special Creation',
      source: 'AI Chef',
      description: parsed.description || 'Custom crafted recipe based on your fresh ingredients.',
      category: parsed.category || 'Chef Special',
      area: parsed.area || 'Fusion',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
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
    console.error('Error generating custom recipe:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate custom recipe' });
  }
});

// 3. Spoken Audio Generation via Gemini TTS
geminiRouter.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGeminiClient();

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
});

export default geminiRouter;
