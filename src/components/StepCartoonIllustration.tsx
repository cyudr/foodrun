import React from 'react';

export type StepActionType =
  | 'chop'
  | 'saute'
  | 'boil'
  | 'mix'
  | 'season'
  | 'bake'
  | 'grill'
  | 'wash'
  | 'plate'
  | 'rest';

interface StepCartoonIllustrationProps {
  instruction: string;
  actionType?: string;
  stepNumber?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Detect the culinary cooking action from instruction text across English, Chinese,
 * Malay, Korean, Japanese, and Tamil.
 */
export function detectStepAction(instruction: string, fallbackAction?: string): StepActionType {
  if (fallbackAction) {
    const act = fallbackAction.toLowerCase();
    if (act.includes('chop') || act.includes('slice') || act.includes('dice') || act.includes('prep') || act.includes('peel') || act.includes('cut')) return 'chop';
    if (act.includes('saute') || act.includes('fry') || act.includes('sear') || act.includes('wok')) return 'saute';
    if (act.includes('boil') || act.includes('simmer') || act.includes('steam') || act.includes('stew') || act.includes('poach')) return 'boil';
    if (act.includes('mix') || act.includes('whisk') || act.includes('stir') || act.includes('blend') || act.includes('knead')) return 'mix';
    if (act.includes('season') || act.includes('marinate') || act.includes('spice') || act.includes('salt') || act.includes('garnish') || act.includes('drizzle')) return 'season';
    if (act.includes('bake') || act.includes('roast') || act.includes('broil') || act.includes('oven')) return 'bake';
    if (act.includes('grill') || act.includes('bbq') || act.includes('char')) return 'grill';
    if (act.includes('wash') || act.includes('rinse') || act.includes('drain') || act.includes('soak')) return 'wash';
    if (act.includes('plate') || act.includes('serve') || act.includes('enjoy') || act.includes('dish')) return 'plate';
    if (act.includes('rest') || act.includes('cool') || act.includes('chill') || act.includes('wait')) return 'rest';
  }

  const text = instruction.toLowerCase();

  // Wash / Rinse / Drain
  if (/wash|rinse|drain|strain|soak|clean|洗|冲洗|沥干|浸泡|cuci|toskan|rendam|씻|헹구|물기|洗う|水切り|கழுவு/.test(text)) {
    return 'wash';
  }

  // Plate / Serve / Finish
  if (/serve|plate|transfer to plate|dish out|enjoy|ready to eat|garnish and serve|出锅|装盘|摆盘|盛出|享用|hidang|sajikan|담아|완성|盛り付け|召し上が|பரிமாறு/.test(text)) {
    return 'plate';
  }

  // Bake / Roast / Oven
  if (/bake|roast|preheat|broil|oven|baking sheet|casserole|烤箱|烘烤|预热|bakar|ketuhar|오븐|예열|オーブン|焼成|சுடு/.test(text)) {
    return 'bake';
  }

  // Grill / BBQ
  if (/grill|barbecue|bbq|charcoal|char-grill|炭烤|烧烤|panggang|그릴|직화|グリル|炭火/.test(text)) {
    return 'grill';
  }

  // Sauté / Stir-fry / Sear / Pan-fry
  if (/saute|sauté|stir.?fry|fry|sear|pan.?fry|brown|sizzle|crisp|heat oil|hot pan|skillet|炒|煎|翻炒|热锅|热油|爆香|tumis|goreng|layur|볶|지지|부치|炒める|焼く|揚げ|வதக்கு/.test(text)) {
    return 'saute';
  }

  // Boil / Simmer / Steam / Stew
  if (/boil|simmer|steam|stew|poach|blanch|bubble|broth|pot of water|煮|焯水|炖|蒸|煨|大火煮沸|rebus|kukus|reneh|끓이|삶|찌|デイル|茹でる|煮る|煮込む|வேகவை/.test(text)) {
    return 'boil';
  }

  // Mix / Whisk / Stir / Fold / Knead
  if (/mix|whisk|combine|stir together|fold|blend|toss|knead|batter|dough|搅拌|混合|拌匀|打发|揉面|gaul|kacau|adun|sebatikan|섞|휘젓|버무리|반죽|混ぜる|泡立て|和える|கலக்கு/.test(text)) {
    return 'mix';
  }

  // Season / Marinate / Salt / Pepper / Garnish / Sprinkle
  if (/season|marinate|salt|pepper|spice|sprinkle|drizzle|sauce|soy sauce|rub|flavor|调味|腌制|撒|淋上|加盐|加糖|perap|perasa|tabur|renjis|양념|절이|간장|소금|뿌리|味付け|下味|振る|かけ|மசாலா/.test(text)) {
    return 'season';
  }

  // Chop / Slice / Dice / Mince / Cut / Peel
  if (/chop|slice|dice|mince|cut|peel|grate|julienne|cube|shred|halve|trim|切|剁|切丝|削皮|切块|切丁|potong|hiris|kupas|cincang|썰|다지|자르|깍둑|껍질|刻む|切る|千切り|みじん|வெட்டு/.test(text)) {
    return 'chop';
  }

  // Rest / Cool / Wait / Chill
  if (/rest|cool|chill|refrigerate|stand for|wait for|leave aside|静置|冷却|冷藏|放凉|rehat|sejukkan|식히|숙성|재우|休ませる|冷ます|இளைப்பாற/.test(text)) {
    return 'rest';
  }

  return 'saute';
}

/**
 * Cartoonized Culinary Step Illustration Badge
 */
export const StepCartoonIllustration: React.FC<StepCartoonIllustrationProps> = ({
  instruction,
  actionType,
  stepNumber,
  size = 'md',
  className = '',
}) => {
  const detected = detectStepAction(instruction, actionType);

  // Dimension settings
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  }[size];

  const iconScale = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16',
  }[size];

  // Action Theme Palettes
  const themes: Record<
    StepActionType,
    {
      bgGradient: string;
      borderColor: string;
      shadowColor: string;
      renderSvg: () => React.ReactNode;
      label: string;
    }
  > = {
    chop: {
      bgGradient: 'from-amber-400 via-orange-400 to-rose-400',
      borderColor: 'border-orange-300',
      shadowColor: 'shadow-orange-500/20',
      label: 'Chop & Prep',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Cutting Board */}
          <rect x="8" y="24" width="32" height="18" rx="4" fill="#D97706" />
          <rect x="10" y="26" width="28" height="14" rx="3" fill="#FBBF24" />
          {/* Sliced Carrot / Veggie */}
          <ellipse cx="19" cy="33" rx="5" ry="3.5" fill="#F97316" transform="rotate(-15 19 33)" />
          <ellipse cx="19" cy="33" rx="2.5" ry="1.5" fill="#FED7AA" transform="rotate(-15 19 33)" />
          <ellipse cx="27" cy="34" rx="4.5" ry="3" fill="#F97316" transform="rotate(10 27 34)" />
          <ellipse cx="27" cy="34" rx="2" ry="1.2" fill="#FED7AA" transform="rotate(10 27 34)" />
          {/* Friendly Chef Knife */}
          <path d="M14 12L34 19V23L16 20L14 12Z" fill="#F1F5F9" stroke="#334155" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M34 19L42 22L40 25L32 22L34 19Z" fill="#78350F" stroke="#451A03" strokeWidth="1.2" />
          {/* Blade Shine Sparkle */}
          <path d="M22 14L24 16M26 15L27 16" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          {/* Motion lines */}
          <path d="M20 7L20 10M28 8L27 11" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    saute: {
      bgGradient: 'from-amber-500 via-orange-500 to-red-500',
      borderColor: 'border-amber-300',
      shadowColor: 'shadow-red-500/25',
      label: 'Sauté & Sizzle',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Sizzle Flames beneath */}
          <path d="M16 42C16 40 18 38 18 36C19 38 21 38 21 42" fill="#EF4444" />
          <path d="M24 43C24 39 27 37 27 35C28 38 31 38 31 43" fill="#F59E0B" />
          {/* Skillet Pan */}
          <ellipse cx="23" cy="27" rx="14" ry="7" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
          <ellipse cx="23" cy="26" rx="12" ry="5.5" fill="#334155" />
          {/* Pan Handle */}
          <path d="M36 27L46 22" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M36 27L46 22" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          {/* Golden Sizzle Ingredients Flipping */}
          <circle cx="18" cy="21" r="2.5" fill="#FBBF24" />
          <circle cx="24" cy="18" r="3" fill="#10B981" />
          <circle cx="28" cy="20" r="2" fill="#F87171" />
          {/* Sizzle Stars & Steam Sparks */}
          <path d="M21 11L22 13L24 14L22 15L21 17L20 15L18 14L20 13L21 11Z" fill="#FEF08A" />
          <path d="M30 13L31 14.5L32.5 15L31 15.5L30 17L29.5 15.5L28 15L29.5 14.5L30 13Z" fill="#FEF08A" />
          <path d="M14 18C14 16 16 15 15 13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    boil: {
      bgGradient: 'from-sky-400 via-blue-500 to-indigo-600',
      borderColor: 'border-sky-300',
      shadowColor: 'shadow-blue-500/25',
      label: 'Boil & Simmer',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Steam Clouds */}
          <path d="M18 13C17 10 20 8 19 6M25 14C24 10 27 8 26 5M32 13C31 10 34 8 33 6" stroke="#E0F2FE" strokeWidth="2.2" strokeLinecap="round" />
          {/* Soup Pot Body */}
          <rect x="11" y="21" width="26" height="19" rx="5" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5" />
          <path d="M11 25C11 23 15 21 24 21C33 21 37 23 37 25" fill="#EF4444" />
          {/* Pot Handles */}
          <path d="M7 24C6 24 5 26 5 28C5 30 6 31 7 31" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M41 24C42 24 43 26 43 28C43 30 42 31 41 31" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Soup Broth & Bubbles */}
          <ellipse cx="24" cy="22" rx="11" ry="3.5" fill="#FDE047" />
          <circle cx="20" cy="22" r="1.5" fill="#F59E0B" />
          <circle cx="27" cy="22.5" r="1.8" fill="#F59E0B" />
          <circle cx="23" cy="21.5" r="1" fill="#F59E0B" />
          {/* Kawaii Highlights */}
          <ellipse cx="17" cy="30" rx="2" ry="3" fill="#FFFFFF" opacity="0.6" />
        </svg>
      ),
    },
    mix: {
      bgGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      borderColor: 'border-emerald-300',
      shadowColor: 'shadow-teal-500/25',
      label: 'Whisk & Mix',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Mixing Bowl */}
          <path d="M10 20C10 32 16 38 24 38C32 38 38 32 38 20H10Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
          <ellipse cx="24" cy="20" rx="14" ry="4" fill="#60A5FA" />
          <ellipse cx="24" cy="20" rx="11.5" ry="3" fill="#FEF08A" />
          {/* Whisk Tool */}
          <path d="M34 8L25 24" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="24" cy="22" rx="4" ry="6" stroke="#94A3B8" strokeWidth="1.5" transform="rotate(-30 24 22)" fill="none" />
          {/* Swirl lines */}
          <path d="M18 21C19 23 23 23 24 21" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          {/* Whisk Sparkles */}
          <circle cx="16" cy="14" r="2" fill="#34D399" />
          <circle cx="33" cy="16" r="1.5" fill="#F472B6" />
          <path d="M21 9L22 11L24 12L22 13L21 15L20 13L18 12L20 11L21 9Z" fill="#FDE047" />
        </svg>
      ),
    },
    season: {
      bgGradient: 'from-amber-400 via-yellow-500 to-orange-500',
      borderColor: 'border-yellow-200',
      shadowColor: 'shadow-amber-500/25',
      label: 'Season & Spice',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Spice Shaker tilted */}
          <g transform="rotate(-35 24 20)">
            <rect x="20" y="8" width="10" height="6" rx="2" fill="#94A3B8" stroke="#475569" strokeWidth="1.2" />
            <path d="M22 7L24 7M26 7L28 7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M18 14H32L30 30H20L18 14Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
            <rect x="20" y="18" width="10" height="9" rx="1" fill="#EA580C" />
          </g>
          {/* Seasoning Sparkles & Herb Sprig */}
          <circle cx="20" cy="30" r="1.5" fill="#EF4444" />
          <circle cx="24" cy="35" r="1.2" fill="#F59E0B" />
          <circle cx="28" cy="32" r="1.5" fill="#10B981" />
          <circle cx="22" cy="38" r="1.3" fill="#D97706" />
          <circle cx="30" cy="37" r="1.5" fill="#EF4444" />
          {/* Fresh Basil/Herb Leaf */}
          <path d="M12 36C12 31 17 30 20 33C17 37 14 38 12 36Z" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
          <path d="M14 36L18 33" stroke="#DCFCE7" strokeWidth="1" />
        </svg>
      ),
    },
    bake: {
      bgGradient: 'from-amber-600 via-orange-600 to-rose-700',
      borderColor: 'border-orange-400',
      shadowColor: 'shadow-orange-700/25',
      label: 'Bake & Roast',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Oven Window Box */}
          <rect x="8" y="10" width="32" height="28" rx="6" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
          {/* Oven Glass glowing */}
          <rect x="12" y="14" width="24" height="20" rx="3" fill="#D97706" />
          <rect x="14" y="16" width="20" height="16" rx="2" fill="#F59E0B" />
          {/* Baking Rack */}
          <line x1="14" y1="26" x2="34" y2="26" stroke="#78350F" strokeWidth="1.5" />
          {/* Golden Pastry / Roast Casserole on rack */}
          <ellipse cx="24" cy="24" rx="7" ry="3.5" fill="#FEF08A" stroke="#B45309" strokeWidth="1.2" />
          <ellipse cx="24" cy="23.5" rx="5" ry="2" fill="#FDE047" />
          {/* Heat Waves above */}
          <path d="M18 6C19 8 17 9 18 10M24 5C25 7 23 8 24 9M30 6C31 8 29 9 30 10" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    grill: {
      bgGradient: 'from-red-500 via-rose-600 to-amber-600',
      borderColor: 'border-red-300',
      shadowColor: 'shadow-red-600/25',
      label: 'Char & Grill',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Grill Body */}
          <path d="M10 22C10 32 16 38 24 38C32 38 38 32 38 22H10Z" fill="#0F172A" />
          <ellipse cx="24" cy="22" rx="14" ry="4" fill="#334155" stroke="#0F172A" strokeWidth="1.5" />
          {/* Grill Cross Hatch */}
          <line x1="14" y1="22" x2="34" y2="22" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="18" y1="19" x2="18" y2="25" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="24" y1="19" x2="24" y2="25" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="30" y1="19" x2="30" y2="25" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Flames bursting */}
          <path d="M20 18C20 14 22 13 22 10C24 13 25 14 24 18" fill="#F59E0B" />
          <path d="M26 18C26 15 28 14 28 11C29 14 30 15 29 18" fill="#EF4444" />
          {/* Grill Skewers */}
          <circle cx="21" cy="17" r="2.5" fill="#EA580C" />
          <circle cx="27" cy="16.5" r="2" fill="#10B981" />
        </svg>
      ),
    },
    wash: {
      bgGradient: 'from-cyan-400 via-sky-500 to-blue-600',
      borderColor: 'border-cyan-200',
      shadowColor: 'shadow-sky-500/25',
      label: 'Rinse & Clean',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Fresh Water Tap Flow */}
          <path d="M24 6V16" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M21 18C21 16 27 16 27 18C27 21 21 21 21 18Z" fill="#38BDF8" />
          {/* Colander Bowl */}
          <path d="M12 24C12 34 17 38 24 38C31 38 36 34 36 24H12Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
          <ellipse cx="24" cy="24" rx="12" ry="3.5" fill="#F8FAFC" />
          {/* Fresh Greens in Colander */}
          <circle cx="20" cy="23" r="3.5" fill="#22C55E" />
          <circle cx="26" cy="22" r="4" fill="#16A34A" />
          <circle cx="28" cy="24" r="3" fill="#4ADE80" />
          {/* Cleansing Water Droplets */}
          <path d="M18 12C18 10 19 9 19 8C20 9 21 10 20 12C20 13 18 13 18 12Z" fill="#BAE6FD" />
          <path d="M29 14C29 12 30 11 30 10C31 11 32 12 31 14C31 15 29 15 29 14Z" fill="#BAE6FD" />
          {/* Sparkles */}
          <path d="M14 18L15 20L17 21L15 22L14 24L13 22L11 21L13 20L14 18Z" fill="#FFFFFF" />
        </svg>
      ),
    },
    plate: {
      bgGradient: 'from-amber-400 via-rose-400 to-purple-500',
      borderColor: 'border-amber-300',
      shadowColor: 'shadow-purple-500/25',
      label: 'Plate & Serve',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Dinner Plate */}
          <ellipse cx="24" cy="30" rx="16" ry="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="24" cy="29" rx="11" ry="3.8" fill="#FFFFFF" />
          {/* Gourmet Plated Dish */}
          <ellipse cx="24" cy="28.5" rx="7" ry="2.5" fill="#D97706" />
          <circle cx="22" cy="27.5" r="1.5" fill="#EF4444" />
          <circle cx="25" cy="27" r="1.2" fill="#22C55E" />
          {/* Cloche Dome lifting with sparkles */}
          <path d="M15 24C15 15 33 15 33 24H15Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="24" cy="14" r="2.5" fill="#F59E0B" />
          {/* Steam & Chef Sparkles */}
          <path d="M20 9L21 11L23 12L21 13L20 15L19 13L17 12L19 11L20 9Z" fill="#FDE047" />
          <path d="M30 10L30.8 11.5L32 12L30.8 12.5L30 14L29.2 12.5L28 12L29.2 11.5L30 10Z" fill="#FDE047" />
        </svg>
      ),
    },
    rest: {
      bgGradient: 'from-indigo-400 via-purple-500 to-pink-500',
      borderColor: 'border-purple-300',
      shadowColor: 'shadow-indigo-500/25',
      label: 'Rest & Cool',
      renderSvg: () => (
        <svg viewBox="0 0 48 48" fill="none" className={iconScale} xmlns="http://www.w3.org/2000/svg">
          {/* Hourglass / Kitchen Clock */}
          <circle cx="24" cy="24" r="13" fill="#F8FAFC" stroke="#6366F1" strokeWidth="2" />
          <circle cx="24" cy="24" r="10" fill="#EEF2FF" />
          {/* Clock Hands */}
          <line x1="24" y1="24" x2="24" y2="18" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" />
          <line x1="24" y1="24" x2="29" y2="24" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" />
          {/* Resting Zzz steam */}
          <text x="28" y="14" fill="#818CF8" fontSize="8" fontWeight="bold">Z</text>
          <text x="33" y="10" fill="#A5B4FC" fontSize="6" fontWeight="bold">z</text>
        </svg>
      ),
    },
  };

  const theme = themes[detected] || themes.saute;

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-tr ${theme.bgGradient} p-0.5 border ${theme.borderColor} ${theme.shadowColor} shadow-md flex items-center justify-center shrink-0 ${dimensions} ${className}`}
      title={theme.label}
    >
      <div className="w-full h-full rounded-[14px] bg-white/20 backdrop-blur-2xs flex items-center justify-center p-1 overflow-hidden">
        {theme.renderSvg()}
      </div>

      {stepNumber !== undefined && size !== 'sm' && (
        <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-stone-900 border border-white/50 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
          {stepNumber}
        </span>
      )}
    </div>
  );
};
