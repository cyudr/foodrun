import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI, Type } from '@google/genai';

// Helper to send JSON across any runtime (Express, Vercel Serverless, Vite Dev Middleware, Node HTTP)
function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
  return res.end(JSON.stringify(data));
}

// Parse request body for stream-based runtimes (Node HTTP, Vite connect middleware)
async function parseRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }
    req.on('data', (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Dynamic initialization to pick up GEMINI_KEY (or GEMINI_API_KEY)
function getGeminiClient(): { ai: GoogleGenAI; keySource: string } {
  const apiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
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

// Resilient generateContent helper that starts with ultra-fast gemini-3.5-flash
// and cascades through available fallbacks with retry
async function generateWithFallback(ai: GoogleGenAI, params: any) {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} failed, trying next fallback:`, err?.message || err);
      lastError = err;
      if (err?.message?.includes('503') || err?.status === 503) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}

// Curated culinary food images for recipe presentations
const RECIPE_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80',
];

// Rich, verified categorical culinary photography mapped to exact recipe archetypes, cuisines & ingredients
const CULINARY_PHOTO_MAP: Record<string, string[]> = {
  salmon: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80', // Pan-seared salmon
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80', // Grilled salmon fillet
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
  ],
  shrimp: [
    'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=80', // Garlic butter prawns
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80', // Grilled shrimp bowl
  ],
  seafood: [
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80', // Seafood platter
    'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=80',
  ],
  fish: [
    'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=1200&q=80', // Crispy fish fillet
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
  ],
  'chicken-roast': [
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=80', // Herb roasted chicken
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80',
  ],
  'chicken-crispy': [
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1200&q=80', // Golden crispy chicken katsu
    'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=1200&q=80', // Fried chicken
  ],
  'chicken-curry': [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80', // Butter chicken
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80', // Golden chicken curry
  ],
  chicken: [
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80', // Grilled chicken plate
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80',
  ],
  steak: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', // Seared ribeye steak
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80', // Sliced beef steak
  ],
  'beef-stir-fry': [
    'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=1200&q=80', // Beef wok stir fry
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  ],
  'beef-stew': [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', // Braised beef
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
  ],
  beef: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=1200&q=80',
  ],
  pork: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80', // Roast pork
  ],
  'pasta-creamy': [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80', // Creamy fettuccine alfredo
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80', // Carbonara pasta
  ],
  'pasta-tomato': [
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80', // Spaghetti pomodoro
    'https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&w=1200&q=80', // Bolognese pasta
  ],
  'pasta-pesto': [
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80', // Basil pesto rigatoni
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80',
  ],
  ramen: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', // Tonkotsu ramen with egg
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80', // Japanese miso ramen
    'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80', // Shoyu ramen
  ],
  noodles: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80', // Stir fried noodles
  ],
  'fried-rice': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80', // Golden egg fried rice
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', // Wok fried rice
  ],
  biryani: [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80', // Spiced biryani rice
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
  ],
  rice: [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80',
  ],
  tofu: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80', // Crispy tofu bowl
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  ],
  'stir-fry': [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80', // Wok stir fry
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  ],
  'salad-caesar': [
    'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=1200&q=80', // Caesar salad
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  ],
  salad: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80', // Vibrant green salad
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80', // Mediterranean grain bowl
  ],
  'soup-tomato': [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', // Rich tomato soup
  ],
  'soup-miso': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80', // Japanese soup
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80', // Hearty soup
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80',
  ],
  curry: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80', // Tikka masala
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80', // Golden curry
  ],
  'eggs-shakshuka': [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80', // Shakshuka skillet
  ],
  eggs: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80', // Breakfast eggs
    'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=80', // Omelette
  ],
  pancakes: [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80', // Fluffy berry pancakes
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80',
  ],
  'toast-avocado': [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80', // Artisan toast
    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&w=1200&q=80',
  ],
  toast: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&w=1200&q=80',
  ],
  'pizza-margherita': [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80', // Wood fired margherita
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  ],
  tacos: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80', // Street tacos
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80', // Quesadilla
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80', // Gourmet cheeseburger
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  ],
  sandwich: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80', // Gourmet grilled cheese
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  ],
  dumplings: [
    'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80', // Pan fried dumplings
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=1200&q=80', // Steamed dim sum
  ],
  sushi: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80', // Sushi platter
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
  ],
  'bbq-ribs': [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80', // Chocolate cake
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80', // Berry tart
  ],
};

function resolveDishPhoto(
  title: string,
  ingredients: string[] = [],
  visualType?: string,
  englishDishName?: string,
  index = 0
): string {
  // 1. Direct Visual Category Key match
  if (visualType && CULINARY_PHOTO_MAP[visualType.toLowerCase().trim()]) {
    const list = CULINARY_PHOTO_MAP[visualType.toLowerCase().trim()];
    return list[index % list.length];
  }

  const query = `${title} ${englishDishName || ''} ${ingredients.join(' ')} ${visualType || ''}`.toLowerCase();

  // 2. Multilingual Keyword Matcher
  // Fried Rice & Grains
  if (/炒饭|nasi goreng|볶음밥|チャーハン|fried.?rice|paella|risotto|biryani/.test(query)) {
    return CULINARY_PHOTO_MAP['fried-rice'][index % CULINARY_PHOTO_MAP['fried-rice'].length];
  }

  // Ramen & Asian Noodles
  if (/拉面|ラーメン|라면|ramen|udon|pho|soba/.test(query)) {
    return CULINARY_PHOTO_MAP['ramen'][index % CULINARY_PHOTO_MAP['ramen'].length];
  }

  // Noodles & Pasta
  if (/意面|意大利面|파스타|パスタ|pasta|spaghetti|carbonara|fettuccine|penne|lasagna|bolognese/.test(query)) {
    if (/creamy|alfredo|carbonara|cheese|白酱|크림|クリーム/.test(query)) {
      return CULINARY_PHOTO_MAP['pasta-creamy'][index % CULINARY_PHOTO_MAP['pasta-creamy'].length];
    }
    if (/pesto|basil|青酱|바질|バジル/.test(query)) {
      return CULINARY_PHOTO_MAP['pasta-pesto'][index % CULINARY_PHOTO_MAP['pasta-pesto'].length];
    }
    return CULINARY_PHOTO_MAP['pasta-tomato'][index % CULINARY_PHOTO_MAP['pasta-tomato'].length];
  }

  if (/面|炒面|mee|mie|국수|noodles|chow mein|pad thai|lo mein/.test(query)) {
    return CULINARY_PHOTO_MAP['noodles'][index % CULINARY_PHOTO_MAP['noodles'].length];
  }

  // Pizza & Tacos & Burgers
  if (/披萨|比萨|피자|ピザ|pizza|margherita/.test(query)) {
    return CULINARY_PHOTO_MAP['pizza-margherita'][index % CULINARY_PHOTO_MAP['pizza-margherita'].length];
  }
  if (/汉堡|버거|ハンバーガー|burger|cheeseburger/.test(query)) {
    return CULINARY_PHOTO_MAP['burger'][index % CULINARY_PHOTO_MAP['burger'].length];
  }
  if (/taco|burrito|quesadilla|fajita|墨西哥|타코|タコス/.test(query)) {
    return CULINARY_PHOTO_MAP['tacos'][index % CULINARY_PHOTO_MAP['tacos'].length];
  }
  if (/三明治|吐司|土司|토스트|トースト|toast|sandwich|panini/.test(query)) {
    if (/avocado|牛油果|아보카도|アボカド/.test(query)) {
      return CULINARY_PHOTO_MAP['toast-avocado'][index % CULINARY_PHOTO_MAP['toast-avocado'].length];
    }
    return CULINARY_PHOTO_MAP['sandwich'][index % CULINARY_PHOTO_MAP['sandwich'].length];
  }

  // Dumplings & Dim Sum
  if (/饺子|煎饺|锅贴|点心|만두|餃子|dumpling|gyoza|dim sum|wonton/.test(query)) {
    return CULINARY_PHOTO_MAP['dumplings'][index % CULINARY_PHOTO_MAP['dumplings'].length];
  }

  // Sushi
  if (/寿司|生鱼片|초밥|스시|sushi|sashimi|nigiri/.test(query)) {
    return CULINARY_PHOTO_MAP['sushi'][index % CULINARY_PHOTO_MAP['sushi'].length];
  }

  // Salmon & Seafood
  if (/三文鱼|鲑鱼|연어|サーモン|鮭|salmon|trout/.test(query)) {
    return CULINARY_PHOTO_MAP['salmon'][index % CULINARY_PHOTO_MAP['salmon'].length];
  }
  if (/虾|udang|새우|エビ|海老|shrimp|prawn|lobster|calamari/.test(query)) {
    return CULINARY_PHOTO_MAP['shrimp'][index % CULINARY_PHOTO_MAP['shrimp'].length];
  }
  if (/鱼|ikan|생선|魚|fish|cod|halibut|seabass/.test(query)) {
    return CULINARY_PHOTO_MAP['fish'][index % CULINARY_PHOTO_MAP['fish'].length];
  }

  // Steak & Beef
  if (/牛排|스테이크|ステーキ|steak|ribeye|sirloin|tenderloin/.test(query)) {
    return CULINARY_PHOTO_MAP['steak'][index % CULINARY_PHOTO_MAP['steak'].length];
  }
  if (/牛肉|daging|소고기|불고기|beef|bulgogi/.test(query)) {
    return CULINARY_PHOTO_MAP['beef'][index % CULINARY_PHOTO_MAP['beef'].length];
  }

  // Chicken & Poultry
  if (/鸡|ayam|닭|チキン|鶏|chicken|poultry|turkey/.test(query)) {
    if (/curry|咖喱|kari|카레|カレー|tikka|masala/.test(query)) {
      return CULINARY_PHOTO_MAP['chicken-curry'][index % CULINARY_PHOTO_MAP['chicken-curry'].length];
    }
    if (/crispy|katsu|fried|炸|튀김|カツ/.test(query)) {
      return CULINARY_PHOTO_MAP['chicken-crispy'][index % CULINARY_PHOTO_MAP['chicken-crispy'].length];
    }
    return CULINARY_PHOTO_MAP['chicken'][index % CULINARY_PHOTO_MAP['chicken'].length];
  }

  // Curry
  if (/咖喱|kari|카레|カレー|curry|masala|korma|dal/.test(query)) {
    return CULINARY_PHOTO_MAP['curry'][index % CULINARY_PHOTO_MAP['curry'].length];
  }

  // Eggs & Breakfast
  if (/shakshuka|北非蛋|샤크슈카|シャクシュカ/.test(query)) {
    return CULINARY_PHOTO_MAP['eggs-shakshuka'][0];
  }
  if (/蛋|telur|계란|달걀|卵|egg|omelet|frittata/.test(query)) {
    return CULINARY_PHOTO_MAP['eggs'][index % CULINARY_PHOTO_MAP['eggs'].length];
  }
  if (/松饼|煎饼|팬케이크|パンケーキ|pancake|waffle/.test(query)) {
    return CULINARY_PHOTO_MAP['pancakes'][index % CULINARY_PHOTO_MAP['pancakes'].length];
  }

  // Soups & Stews
  if (/汤|sup|국|찌개|スープ|味噌汁|soup|stew|chowder|broth|miso/.test(query)) {
    if (/miso|味噌|미소/.test(query)) {
      return CULINARY_PHOTO_MAP['soup-miso'][0];
    }
    if (/tomato|番茄|토마토|トマト/.test(query)) {
      return CULINARY_PHOTO_MAP['soup-tomato'][0];
    }
    return CULINARY_PHOTO_MAP['soup'][index % CULINARY_PHOTO_MAP['soup'].length];
  }

  // Salads & Bowls
  if (/沙拉|샐러드|サラダ|salad|greens|bowl/.test(query)) {
    return CULINARY_PHOTO_MAP['salad'][index % CULINARY_PHOTO_MAP['salad'].length];
  }

  // Tofu
  if (/豆腐|tofu|두부/.test(query)) {
    return CULINARY_PHOTO_MAP['tofu'][index % CULINARY_PHOTO_MAP['tofu'].length];
  }

  // Stir-Fry
  if (/炒|wok|stir.?fry/.test(query)) {
    return CULINARY_PHOTO_MAP['stir-fry'][index % CULINARY_PHOTO_MAP['stir-fry'].length];
  }

  // Dessert
  if (/蛋糕|甜点|디저트|デザート|cake|chocolate|dessert|tart|brownie/.test(query)) {
    return CULINARY_PHOTO_MAP['dessert'][index % CULINARY_PHOTO_MAP['dessert'].length];
  }

  // Fallback to high-quality curated dish photo
  return RECIPE_IMAGE_FALLBACKS[index % RECIPE_IMAGE_FALLBACKS.length];
}

// 1. Check Key Status
export function handleKeyStatus(_req: any, res: any) {
  try {
    const apiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return sendJson(res, 200, {
        configured: false,
        status: 'missing_key',
        message: 'No GEMINI_KEY or GEMINI_API_KEY found in environment variables.',
      });
    }

    const keySource = process.env.GEMINI_KEY ? 'GEMINI_KEY' : 'GEMINI_API_KEY';
    const masked = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';

    return sendJson(res, 200, {
      configured: true,
      status: 'ready',
      keySource,
      maskedKey: masked,
      message: 'Chef studio connection is active and ready.',
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      configured: false,
      status: 'error',
      message: err?.message || 'Error checking Gemini key status',
    });
  }
}

// Multilingual Prompt Localization Helper
function getLanguageInstruction(languageCode?: string): { code: string; name: string; promptNote: string } {
  const code = (languageCode || 'en').toLowerCase().trim();
  switch (code) {
    case 'zh':
      return {
        code: 'zh',
        name: 'Simplified Chinese (简体中文)',
        promptNote: 'CRITICAL LANGUAGE REQUIREMENT: Output ALL ingredient names, state/freshness, culinary categories, dish names, tips, descriptions, and instructions completely in Simplified Chinese (简体中文). E.g. "番茄", "大蒜", "鸡胸肉", "生抽".',
      };
    case 'ms':
      return {
        code: 'ms',
        name: 'Malay (Bahasa Melayu)',
        promptNote: 'CRITICAL LANGUAGE REQUIREMENT: Output ALL ingredient names, state/freshness, culinary categories, dish names, tips, descriptions, and instructions completely in Malay (Bahasa Melayu). E.g. "Tomato", "Bawang Putih", "Dada Ayam", "Kicap".',
      };
    case 'ko':
      return {
        code: 'ko',
        name: 'Korean (한국어)',
        promptNote: 'CRITICAL LANGUAGE REQUIREMENT: Output ALL ingredient names, state/freshness, culinary categories, dish names, tips, descriptions, and instructions completely in Korean (한국어). E.g. "토마토", "마늘", "닭가슴살", "간장".',
      };
    case 'ta':
      return {
        code: 'ta',
        name: 'Tamil (தமிழ்)',
        promptNote: 'CRITICAL LANGUAGE REQUIREMENT: Output ALL ingredient names, state/freshness, culinary categories, dish names, tips, descriptions, and instructions completely in Tamil (தமிழ்). E.g. "தக்காளி", "பூண்டு", "கோழி இறைச்சி", "சோயா சாஸ்".',
      };
    case 'ja':
      return {
        code: 'ja',
        name: 'Japanese (日本語)',
        promptNote: 'CRITICAL LANGUAGE REQUIREMENT: Output ALL ingredient names, state/freshness, culinary categories, dish names, tips, descriptions, and instructions completely in Japanese (日本語). E.g. "トマト", "ニンニク", "鶏むね肉", "醤油".',
      };
    default:
      return {
        code: 'en',
        name: 'English',
        promptNote: 'Output all ingredient names and instructions in English.',
      };
  }
}

// 2. Photo Analysis: Identify Ingredients
export async function handleIdentify(req: any, res: any) {
  try {
    const body = req.body || {};
    const rawImage = body.imageBase64 || body.image;
    const requestedLanguage = body.language || 'en';
    const langConfig = getLanguageInstruction(requestedLanguage);

    if (!rawImage || typeof rawImage !== 'string') {
      return sendJson(res, 400, { error: 'Image data is required (imageBase64)' });
    }

    const { ai } = getGeminiClient();

    let cleanMime = body.mimeType || 'image/jpeg';
    let cleanBase64 = rawImage;

    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      cleanMime = mimeMatch[1];
      cleanBase64 = rawImage.slice(mimeMatch[0].length);
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');
    }

    console.log(`[Gemini Vision - Lang: ${langConfig.code}] Analyzing image: ~${Math.round(cleanBase64.length / 1024)} KB, MIME: ${cleanMime}`);

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image carefully. Whether this photo depicts raw groceries, produce, pantry ingredients OR a finished/cooked food dish, identify ALL recognizable food ingredients, raw vegetables, fruits, meats, seafood, dairy, eggs, pantry staples, herbs, spices, condiments, sauces, and garnishes.

Language Requirement:
${langConfig.promptNote}

For every distinct ingredient identified:
1. Provide the singular culinary name in ${langConfig.name}.
2. Assign an appropriate culinary category translated to ${langConfig.name} (e.g. Produce, Meat & Seafood, Dairy & Eggs, Pantry & Seasonings, Bakery & Grains, Other).
3. Provide confidence ("high", "medium", or "low").
4. Note its state/freshness if apparent in ${langConfig.name} (e.g. Fresh, Ripe, Raw, Chopped, Canned, Chilled, Cooked).
5. Note estimated visible quantity if discernable (e.g. "3 items", "1 bunch", "approx. 250g", "1 carton").

Additionally:
- Set isPreparedDish to true if this image appears to be a finished cooked meal or plated restaurant dish (e.g. Pasta Carbonara, Pad Thai, Burger, Steak, Salad bowl), and provide dishName and dishCuisine translated to ${langConfig.name}.
- Otherwise set isPreparedDish to false.
- Provide 2 to 4 cuisine inspiration tags and a short pro chef tip in ${langConfig.name} for cooking with these ingredients.
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
            isPreparedDish: { type: Type.BOOLEAN },
            dishName: { type: Type.STRING },
            dishCuisine: { type: Type.STRING },
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = { ingredients: [] };
    }

    const ingredientsWithIds = (parsed.ingredients || []).map((item: any, idx: number) => ({
      id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || 'Ingredient',
      category: item.category || 'Produce',
      confidence: item.confidence || 'high',
      state: item.state || 'Fresh',
      quantity: item.quantity || '',
      checked: true,
    }));

    return sendJson(res, 200, {
      ingredients: ingredientsWithIds,
      isPreparedDish: !!parsed.isPreparedDish,
      dishName: parsed.dishName || '',
      dishCuisine: parsed.dishCuisine || '',
      suggestedCuisines: parsed.suggestedCuisines || ['Comfort Food', 'Quick Dinner'],
      chefTip: parsed.chefTip || 'Fresh ingredients deliver the brightest flavors.',
    });
  } catch (error: any) {
    console.error('Error in handleIdentify:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'The server is temporarily experiencing high traffic. Please tap snap photo again in a few seconds.'
        : error?.message || 'Failed to analyze image',
    });
  }
}

// 3. Multi-Recipe Discovery via Gemini
export async function handleFindRecipes(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], preferences = '', language = 'en' } = body;
    const langConfig = getLanguageInstruction(language);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'At least one ingredient is required' });
    }

    const { ai } = getGeminiClient();

    const prompt = `You are a world-class culinary chef. Generate 5 diverse, mouth-watering, realistic recipes that feature and make maximum use of these user-provided ingredients:
${ingredients.join(', ')}.

Language Requirement:
${langConfig.promptNote}
CRITICAL: All recipe titles, descriptions, categories, areas/origins, difficulty, dishAppearance, chefNotes, ingredient names, ingredient measurements, and every cooking step instruction and tip MUST BE WRITTEN IN ${langConfig.name}. This is essential for the Voice Cooking Assistant to read the cooking steps aloud fluently in ${langConfig.name}.

Preferences: ${preferences || 'Balanced variety: 1 quick 15-min meal, 1 comforting classic, 1 fresh healthy dish, 1 creative gourmet option'}.

Instructions:
1. Maximize use of user ingredients. Basic pantry items (salt, pepper, cooking oil, water, butter) can be assumed available.
2. For each ingredient in every recipe, explicitly set:
   - "hasIngredient": true if the user provided it (or very similar), false if it's an extra item.
   - "isStaple": true if it's a basic kitchen staple (salt, oil, pepper, water, flour).
3. Compute an honest matchPercentage (0 to 100) based on how much of the dish can be made with user's items.
4. Break each recipe into clear, numbered cooking steps in ${langConfig.name}. Each step should be concise and spoken-friendly for a voice cooking assistant.
5. Provide realistic prep and cook times in minutes, difficulty ("Easy", "Medium", "Hard" translated if appropriate), and accurate integer servings (must be an integer between 1 and 8, typically 2 or 4, exactly scaled to match the ingredient quantities provided).
6. Provide an accurate dishVisualType for each dish matching its appearance from: "salmon", "shrimp", "seafood", "fish", "chicken-roast", "chicken-crispy", "chicken-curry", "chicken", "steak", "beef-stir-fry", "beef-stew", "beef", "pork", "pasta-creamy", "pasta-tomato", "pasta-pesto", "pasta", "ramen", "noodles", "fried-rice", "biryani", "rice", "tofu", "stir-fry", "salad-caesar", "salad", "soup-tomato", "soup-miso", "soup", "curry", "eggs-shakshuka", "eggs", "pancakes", "toast-avocado", "toast", "pizza-margherita", "pizza", "tacos", "burger", "sandwich", "dumplings", "sushi", "bbq-ribs", or "dessert".
7. Provide englishDishName: A concise 2-4 word standard English name for the dish (e.g. "Garlic Butter Shrimp Pasta", "Kimchi Fried Rice", "Miso Ramen", "Chicken Tikka Masala", "Avocado Toast", "Beef Bulgogi") to guarantee 100% accurate culinary photography matching regardless of the display language.
8. Provide cookingWares: An array of 3-6 essential kitchen cooking wares, pans, pots, knives, and utensils required to prepare this recipe, written in ${langConfig.name} (e.g. Non-stick skillet, Chef knife, Cutting board, Large pot, Wooden spatula, Mixing bowl, Whisk, Tongs, Baking sheet).
9. Provide dishAppearance: A vivid 1-sentence description in ${langConfig.name} of the plated dish highlighting the user's pantry ingredients.
10. Provide platingStyle: Default plating presentation (e.g. "Rustic Skillet", "Modern Plate", "Cozy Bowl", or "Family Platter").

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
                  englishDishName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  area: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  prepTimeMinutes: { type: Type.NUMBER },
                  cookTimeMinutes: { type: Type.NUMBER },
                  servings: { type: Type.NUMBER },
                  dishVisualType: { type: Type.STRING },
                  dishAppearance: { type: Type.STRING },
                  platingStyle: { type: Type.STRING },
                  cookingWares: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = { recipes: [] };
    }

    const processedRecipes = (parsed.recipes || []).map((recipe: any, index: number) => {
      const totalIng = (recipe.ingredients || []).length;
      const matched = (recipe.ingredients || []).filter((i: any) => i.hasIngredient).length;
      const missing = (recipe.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;
      const ingNames = (recipe.ingredients || []).map((i: any) => i.name);

      // Dynamically adjust dish photo based on the pantry ingredients & recipe characteristics
      const adjustedDishPhoto = resolveDishPhoto(
        recipe.title,
        [...ingredients, ...ingNames],
        recipe.dishVisualType,
        recipe.englishDishName,
        index
      );

      return {
        id: `gemini-rec-${Date.now()}-${index}`,
        title: recipe.title,
        source: 'Chef Recipe',
        description: recipe.description || 'Crafted with master culinary precision.',
        category: recipe.category || 'Chef Special',
        area: recipe.area || 'Fusion',
        imageUrl: adjustedDishPhoto,
        dishVisualType: recipe.dishVisualType || 'special',
        dishAppearance: recipe.dishAppearance || `Freshly prepared featuring ${ingredients.slice(0, 3).join(', ')}.`,
        platingStyle: recipe.platingStyle || 'Modern Plate',
        difficulty: recipe.difficulty || 'Easy',
        estimatedTimeMinutes: (recipe.prepTimeMinutes || 10) + (recipe.cookTimeMinutes || 15),
        servings: Math.max(1, Math.round(Number(recipe.servings) || 2)),
        cookingWares: Array.isArray(recipe.cookingWares) && recipe.cookingWares.length > 0
          ? recipe.cookingWares
          : ['Non-stick skillet', 'Chef knife', 'Cutting board'],
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

    return sendJson(res, 200, {
      recipes: processedRecipes,
      totalFound: processedRecipes.length,
      userIngredients: ingredients,
    });
  } catch (error: any) {
    console.error('Error in handleFindRecipes:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'The culinary engine is temporarily busy. Please tap search recipes again in a moment.'
        : error?.message || 'Failed to generate recipes',
    });
  }
}

// 4. Single Custom Recipe Generation
export async function handleCustomRecipe(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], mealType = 'Any', dietaryPreference = 'None', language = 'en' } = body;
    const langConfig = getLanguageInstruction(language);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'Ingredients list is required' });
    }

    const { ai } = getGeminiClient();

    const prompt = `You are an expert chef creating a single bespoke gourmet recipe using these ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Language Requirement:
${langConfig.promptNote}
CRITICAL: All recipe content (title, description, category, area, difficulty, dishAppearance, chefNotes, ingredient names, ingredient measurements, and every cooking step instruction and tip) MUST BE WRITTEN IN ${langConfig.name}. This is required so the Voice Cooking Assistant can read the cooking instructions aloud in ${langConfig.name}.

Requirements:
1. Create a clear recipe name in ${langConfig.name} that sounds appetizing.
2. Utilize as many of the user's available ingredients as possible.
3. Provide realistic prep time, cook time, difficulty, and accurate integer servings (must be an integer, typically 2 or 4, matching the ingredient quantities).
4. Break down the cooking process into concise, well-sequenced, spoken-friendly cooking steps in ${langConfig.name}.
5. Add timer recommendation for steps requiring cooking/simmering/baking.
6. Provide dishVisualType: ("salmon", "shrimp", "seafood", "fish", "chicken-roast", "chicken-crispy", "chicken-curry", "chicken", "steak", "beef-stir-fry", "beef-stew", "beef", "pork", "pasta-creamy", "pasta-tomato", "pasta-pesto", "pasta", "ramen", "noodles", "fried-rice", "biryani", "rice", "tofu", "stir-fry", "salad-caesar", "salad", "soup-tomato", "soup-miso", "soup", "curry", "eggs-shakshuka", "eggs", "pancakes", "toast-avocado", "toast", "pizza-margherita", "pizza", "tacos", "burger", "sandwich", "dumplings", "sushi", "bbq-ribs", or "dessert").
7. Provide englishDishName: A concise 2-4 word standard English name for the dish (e.g. "Garlic Butter Shrimp Pasta", "Kimchi Fried Rice", "Miso Ramen", "Chicken Tikka Masala", "Avocado Toast", "Beef Bulgogi") to guarantee 100% accurate culinary photography matching regardless of the display language.
8. Provide cookingWares: An array of 3-6 essential kitchen cooking wares, pans, pots, knives, and utensils required to prepare this recipe, written in ${langConfig.name} (e.g. Non-stick skillet, Chef knife, Cutting board, Large pot, Wooden spatula, Mixing bowl, Whisk, Tongs, Baking sheet).
9. Provide dishAppearance: Detailed 1-sentence plating description in ${langConfig.name}.
10. Provide chef advice/pro-tips in ${langConfig.name}.

Return purely JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            englishDishName: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            area: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            prepTimeMinutes: { type: Type.NUMBER },
            cookTimeMinutes: { type: Type.NUMBER },
            servings: { type: Type.NUMBER },
            dishVisualType: { type: Type.STRING },
            dishAppearance: { type: Type.STRING },
            platingStyle: { type: Type.STRING },
            cookingWares: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = {};
    }

    // Match dish photo specifically to the pantry ingredients, english name, and dish title
    const adjustedDishPhoto = resolveDishPhoto(
      parsed.title || 'Chef Creation',
      ingredients,
      parsed.dishVisualType,
      parsed.englishDishName,
      0
    );

    const customRecipe = {
      id: `custom-${Date.now()}`,
      title: parsed.title || 'Chef Special Creation',
      source: 'Chef Dish',
      description: parsed.description || 'Custom crafted recipe by our executive chef based on your fresh ingredients.',
      category: parsed.category || 'Chef Special',
      area: parsed.area || 'Fusion',
      imageUrl: adjustedDishPhoto,
      dishVisualType: parsed.dishVisualType || 'special',
      dishAppearance: parsed.dishAppearance || `Bespoke culinary creation with ${ingredients.slice(0, 3).join(', ')}.`,
      platingStyle: parsed.platingStyle || 'Modern Plate',
      difficulty: parsed.difficulty || 'Easy',
      estimatedTimeMinutes: (parsed.prepTimeMinutes || 10) + (parsed.cookTimeMinutes || 20),
      servings: Math.max(1, Math.round(Number(parsed.servings) || 2)),
      cookingWares: Array.isArray(parsed.cookingWares) && parsed.cookingWares.length > 0
        ? parsed.cookingWares
        : ['Non-stick skillet', 'Chef knife', 'Cutting board'],
      ingredients: parsed.ingredients || [],
      steps: parsed.steps || [],
      matchPercentage: 95,
      matchedCount: (parsed.ingredients || []).filter((i: any) => i.hasIngredient).length,
      missingCount: (parsed.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length,
      totalIngredients: (parsed.ingredients || []).length,
      chefNotes: parsed.chefNotes || 'Adjust seasoning to taste.',
    };

    return sendJson(res, 200, { recipe: customRecipe });
  } catch (error: any) {
    console.error('Error in handleCustomRecipe:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'The culinary engine is temporarily busy. Please try generating again in a moment.'
        : error?.message || 'Failed to generate custom recipe',
    });
  }
}

// 5. Reverse Engineer Food Recipe Based on Photo (Premium Feature)
export async function handleReverseEngineerRecipe(req: any, res: any) {
  try {
    const body = req.body || {};
    const userCode = (body.proCode || body.code || body.inviteCode || '').toString().trim();

    if (!checkIsAuthorizedInviteCode(userCode)) {
      return sendJson(res, 403, {
        error: 'Chef Pro invitation code required. Please enter a valid invitation code to unlock Chef Pro features.',
      });
    }

    const rawImage = body.imageBase64 || body.image;
    const userIngredients: string[] = Array.isArray(body.userIngredients) ? body.userIngredients : [];
    const language = body.language || 'en';
    const langConfig = getLanguageInstruction(language);

    if (!rawImage || typeof rawImage !== 'string') {
      return sendJson(res, 400, { error: 'Image data is required for reverse engineering recipe' });
    }

    const { ai } = getGeminiClient();

    let cleanMime = body.mimeType || 'image/jpeg';
    let cleanBase64 = rawImage;

    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      cleanMime = mimeMatch[1];
      cleanBase64 = rawImage.slice(mimeMatch[0].length);
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');
    }

    console.log(`[Gemini Pro - Lang: ${langConfig.code}] Reverse engineering dish recipe from photo: ~${Math.round(cleanBase64.length / 1024)} KB`);

    const userPantryContext =
      userIngredients.length > 0
        ? `The user's current kitchen pantry has: ${userIngredients.join(', ')}.`
        : 'User has standard kitchen pantry staples.';

    const prompt = `You are an elite Michelin-starred culinary investigator and food scientist specializing in deep reverse engineering of restaurant dishes from food photography.

Language Requirement:
${langConfig.promptNote}
CRITICAL: Output the entire deconstruction result (dishName, cuisine, description, difficulty, detectedTechniques, secretChefTip, component names and descriptions, all ingredient names and measures, and all cooking step instructions and tips) COMPLETELY IN ${langConfig.name}. This allows the Voice Cooking Assistant to read the recipe steps fluently in ${langConfig.name}.

Carefully examine this photograph of a finished food dish:
1. Identify the exact dish name, origin region, and culinary heritage in ${langConfig.name}.
2. Deconstruct the dish into components:
   - Visible base ingredients (proteins, carbs, produce, garnishes) in ${langConfig.name}.
   - Hidden culinary elements: sauces, emulsified dressings, marinades, aromatics, and secret spice blends that give this dish its signature taste in ${langConfig.name}.
   - Core culinary techniques used in ${langConfig.name} (e.g. pan-sear with crispy skin, deglaze reduction, sous-vide, charring, flash-fry).
3. Evaluate the flavor balance on 0-100: savory, umami, acidity, sweetness, richness/fat.
4. Formulate the definitive, step-by-step master recipe in ${langConfig.name} so the user can recreate this restaurant-quality dish at home:
   - Clear title and enticing description in ${langConfig.name}.
   - Prep time, cook time, difficulty ('Easy', 'Medium', 'Hard'), and accurate integer servings (must be an integer, typically 2 or 4, matching the ingredient portions).
   - Comprehensive ingredients list with precise culinary measurements in ${langConfig.name}.
   - Cross-reference with the user's pantry (${userPantryContext}):
     * Set hasIngredient = true if user already has it in their pantry.
     * Set isStaple = true if it's a basic kitchen staple (salt, black pepper, cooking oil, water, flour).
   - Clear, numbered cooking steps in ${langConfig.name} optimized for a Voice Cooking Assistant.
    - Secret Chef Tip in ${langConfig.name}: The insider trick that restaurants use to make this dish taste extraordinary.
5. Provide cookingWares: An array of 3-6 essential kitchen cooking wares, pans, pots, knives, and utensils required to execute this dish in ${langConfig.name}.
6. Provide dishVisualType: matching the primary dish category ("salmon", "shrimp", "seafood", "fish", "chicken-roast", "chicken-crispy", "chicken-curry", "chicken", "steak", "beef-stir-fry", "beef-stew", "beef", "pork", "pasta-creamy", "pasta-tomato", "pasta-pesto", "pasta", "ramen", "noodles", "fried-rice", "biryani", "rice", "tofu", "stir-fry", "salad-caesar", "salad", "soup-tomato", "soup-miso", "soup", "curry", "eggs-shakshuka", "eggs", "pancakes", "toast-avocado", "toast", "pizza-margherita", "pizza", "tacos", "burger", "sandwich", "dumplings", "sushi", "bbq-ribs", or "dessert").
7. Provide dishAppearance: A 1-sentence description in ${langConfig.name} of the plating presentation.

Return purely JSON adhering strictly to the schema.`;

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dishName: { type: Type.STRING },
            cuisine: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            prepTimeMinutes: { type: Type.NUMBER },
            cookTimeMinutes: { type: Type.NUMBER },
            servings: { type: Type.NUMBER },
            dishVisualType: { type: Type.STRING },
            dishAppearance: { type: Type.STRING },
            platingStyle: { type: Type.STRING },
            cookingWares: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            detectedTechniques: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            secretChefTip: { type: Type.STRING },
            flavorProfile: {
              type: Type.OBJECT,
              properties: {
                savory: { type: Type.NUMBER },
                umami: { type: Type.NUMBER },
                acidity: { type: Type.NUMBER },
                sweetness: { type: Type.NUMBER },
                richness: { type: Type.NUMBER },
              },
              required: ['savory', 'umami', 'acidity', 'sweetness', 'richness'],
            },
            deconstructedComponents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  componentName: { type: Type.STRING },
                  description: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['componentName', 'description'],
              },
            },
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
          },
          required: ['dishName', 'cuisine', 'ingredients', 'steps', 'secretChefTip', 'flavorProfile'],
        },
      },
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = {};
    }

    const totalIng = (parsed.ingredients || []).length;
    const matched = (parsed.ingredients || []).filter((i: any) => i.hasIngredient).length;
    const missing = (parsed.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;

    // Use user's uploaded photo as primary dish photo since it's the exact dish reverse-engineered!
    const dishImageUrl = rawImage.startsWith('data:') ? rawImage : resolveDishPhoto(parsed.dishName, userIngredients, parsed.dishVisualType, parsed.dishName, 0);

    const masterRecipe = {
      id: `rev-eng-${Date.now()}`,
      title: parsed.dishName || 'Recreated Chef Master Dish',
      source: 'Chef Recipe',
      description: parsed.description || 'Precision culinary recreation formulated from high-fidelity food photography.',
      category: parsed.category || parsed.cuisine || 'Chef Pro Special',
      area: parsed.cuisine || 'Gourmet',
      imageUrl: dishImageUrl,
      originalPhotoUrl: rawImage,
      dishVisualType: parsed.dishVisualType || 'special',
      dishAppearance: parsed.dishAppearance || 'Precision plated restaurant master dish.',
      platingStyle: parsed.platingStyle || 'Fine Dining',
      difficulty: parsed.difficulty || 'Medium',
      estimatedTimeMinutes: (parsed.prepTimeMinutes || 15) + (parsed.cookTimeMinutes || 25),
      servings: Math.max(1, Math.round(Number(parsed.servings) || 2)),
      cookingWares: Array.isArray(parsed.cookingWares) && parsed.cookingWares.length > 0
        ? parsed.cookingWares
        : ['Chef skillet', 'Santoku knife', 'Prep bowls'],
      ingredients: parsed.ingredients || [],
      steps: parsed.steps || [],
      matchPercentage: Math.round(((matched + 1) / (totalIng || 1)) * 100),
      matchedCount: matched,
      missingCount: missing,
      totalIngredients: totalIng,
      chefNotes: parsed.secretChefTip || 'Use fresh cold butter and high flame for authentic caramelization.',
      isReverseEngineered: true,
      flavorProfile: parsed.flavorProfile || { savory: 85, umami: 80, acidity: 65, sweetness: 40, richness: 75 },
      detectedTechniques: parsed.detectedTechniques || ['Pan-searing', 'Emulsion sauce reduction'],
      deconstructedComponents: parsed.deconstructedComponents || [],
    };

    return sendJson(res, 200, {
      success: true,
      recipe: masterRecipe,
      dishName: parsed.dishName,
      cuisine: parsed.cuisine,
      flavorProfile: parsed.flavorProfile,
      detectedTechniques: parsed.detectedTechniques,
      secretChefTip: parsed.secretChefTip,
      deconstructedComponents: parsed.deconstructedComponents,
    });
  } catch (error: any) {
    console.error('Error in handleReverseEngineerRecipe:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'The culinary engine is currently busy. Please tap recreate dish again in a few seconds.'
        : error?.message || 'Failed to recreate recipe from photo',
    });
  }
}

// 6. Dynamic Dish Photo Visual Adjustment
export function handleAdjustDishPhoto(req: any, res: any) {
  try {
    const body = req.body || {};
    const { recipeTitle = '', ingredients = [], visualType = '', englishDishName = '', platingStyle = 'modern' } = body;

    const adjustedPhoto = resolveDishPhoto(
      recipeTitle,
      ingredients,
      visualType,
      englishDishName,
      platingStyle === 'rustic' ? 0 : platingStyle === 'bowl' ? 2 : 1
    );

    return sendJson(res, 200, {
      imageUrl: adjustedPhoto,
      platingStyle,
    });
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Failed to adjust dish photo' });
  }
}

// 7. Voice TTS via Gemini
export async function handleTts(req: any, res: any) {
  try {
    const body = req.body || {};
    const { text, voice = 'Kore' } = body;
    if (!text) {
      return sendJson(res, 400, { error: 'Text is required for TTS' });
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
      return sendJson(res, 500, { error: 'No audio returned from Gemini TTS' });
    }

    return sendJson(res, 200, {
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (err: any) {
    console.warn('TTS request error:', err?.message);
    return sendJson(res, 500, { error: 'TTS fallback needed' });
  }
}

// Helper: Verify if an invitation code is authorized
export function checkIsAuthorizedInviteCode(inputCode: string): boolean {
  if (!inputCode) return false;
  const cleanInput = inputCode.trim().toLowerCase();
  const vibeEnvKeys = Object.keys(process.env).filter((key) =>
    key.toLowerCase().startsWith('vibe_')
  );

  if (vibeEnvKeys.length === 0) return false;

  for (const key of vibeEnvKeys) {
    const val = (process.env[key] || '').trim();
    const cleanVal = val.toLowerCase();
    const cleanKey = key.toLowerCase();
    const cleanSuffix = cleanKey.replace(/^vibe_/i, '').trim();

    if (
      (cleanVal && cleanVal === cleanInput) ||
      cleanKey === cleanInput ||
      (cleanSuffix && cleanSuffix === cleanInput)
    ) {
      return true;
    }
  }
  return false;
}

// 8. Verify Invitation Code for Chef Pro
export function handleVerifyInviteCode(req: any, res: any) {
  try {
    const body = req.body || {};
    const inputCode = (body.code || body.inviteCode || '').toString().trim();

    if (!inputCode) {
      return sendJson(res, 400, {
        valid: false,
        error: 'Please enter an invitation code.',
      });
    }

    const isMatch = checkIsAuthorizedInviteCode(inputCode);

    if (isMatch) {
      return sendJson(res, 200, {
        valid: true,
        message: 'Invitation code verified! Welcome to Chef Pro.',
      });
    } else {
      return sendJson(res, 403, {
        valid: false,
        error: 'Invalid invitation code. Please check your code and try again.',
      });
    }
  } catch (err: any) {
    return sendJson(res, 500, {
      valid: false,
      error: err?.message || 'Failed to verify invitation code',
    });
  }
}

// Universal Serverless Function Handler for /api/gemini.ts
// Compatible with Vercel Serverless, Vite Dev Middleware, Netlify, and Express
export default async function handler(req: any, res: any) {
  // Set CORS headers
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  // Parse body across stream and parsed body types
  req.body = await parseRequestBody(req);

  const url = req.url || '';
  const action = req.body?.action;

  if (req.method === 'GET' || url.includes('status') || action === 'status' || action === 'check-key') {
    return handleKeyStatus(req, res);
  }
  if (url.includes('verify-invite-code') || url.includes('verify-code') || action === 'verify-invite-code' || action === 'verify-code') {
    return handleVerifyInviteCode(req, res);
  }
  if (url.includes('reverse-engineer') || action === 'reverse-engineer' || action === 'reverse-engineer-recipe') {
    return handleReverseEngineerRecipe(req, res);
  }
  if (url.includes('adjust-dish-photo') || action === 'adjust-dish-photo') {
    return handleAdjustDishPhoto(req, res);
  }
  if (url.includes('identify') || action === 'identify' || action === 'identify-ingredients' || (req.body?.imageBase64 && action !== 'reverse-engineer')) {
    return handleIdentify(req, res);
  }
  if (url.includes('generate-recipe') || action === 'generate-recipe' || action === 'custom-recipe') {
    return handleCustomRecipe(req, res);
  }
  if (url.includes('find-recipes') || action === 'find-recipes' || action === 'search-recipes' || (req.body?.ingredients && !req.body?.imageBase64)) {
    return handleFindRecipes(req, res);
  }
  if (url.includes('tts') || action === 'tts' || req.body?.text) {
    return handleTts(req, res);
  }

  return sendJson(res, 400, {
    error: 'Missing or unrecognized action. Expected: verify-invite-code, identify, find-recipes, generate-recipe, reverse-engineer, adjust-dish-photo, or tts',
  });
}
