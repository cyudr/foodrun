/**
 * Cookie-based App Usage & Energy System
 * 
 * Rules:
 * 1. 3/3 credits at the start.
 * 2. When all counts finish (reaches 0), every 2 hours refreshes 1 count (with timer on minute).
 * 3. User can watch a sponsor ad to reset/add 1 counter (+1 credit, up to 3).
 * 4. Stored persistently in browser cookies.
 */

export interface UsageState {
  count: number;             // Current counts: 0, 1, 2, or 3
  maxCount: number;          // 3
  depletedAt: number | null; // Timestamp (ms) when count hit 0
  nextRefreshTime: number | null; // Timestamp (ms) when next count will refresh
  lastUpdated: number;       // Timestamp (ms) of last cookie save
}

const COOKIE_NAME = 'snapchef_usage_v1';
const MAX_COUNT = 3;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 7,200,000 ms

/**
 * Cookie helper: Read cookie by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Cookie helper: Set persistent cookie
 */
export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Parses raw state from cookie or generates pristine 3/3 default
 */
export function loadRawUsageState(): UsageState {
  const defaultState: UsageState = {
    count: MAX_COUNT,
    maxCount: MAX_COUNT,
    depletedAt: null,
    nextRefreshTime: null,
    lastUpdated: Date.now(),
  };

  try {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) {
      saveUsageState(defaultState);
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    const count = typeof parsed.count === 'number' ? Math.max(0, Math.min(MAX_COUNT, parsed.count)) : MAX_COUNT;
    const depletedAt = typeof parsed.depletedAt === 'number' ? parsed.depletedAt : null;
    const nextRefreshTime = typeof parsed.nextRefreshTime === 'number' ? parsed.nextRefreshTime : null;

    return {
      count,
      maxCount: MAX_COUNT,
      depletedAt,
      nextRefreshTime,
      lastUpdated: parsed.lastUpdated || Date.now(),
    };
  } catch (err) {
    console.warn('Failed to parse usage cookie, resetting to default 3/3:', err);
    saveUsageState(defaultState);
    return defaultState;
  }
}

/**
 * Saves current usage state into browser cookie
 */
export function saveUsageState(state: UsageState): void {
  try {
    const payload = JSON.stringify({
      count: state.count,
      maxCount: state.maxCount,
      depletedAt: state.depletedAt,
      nextRefreshTime: state.nextRefreshTime,
      lastUpdated: Date.now(),
    });
    setCookie(COOKIE_NAME, payload, 365);
  } catch (err) {
    console.warn('Could not write usage cookie:', err);
  }
}

/**
 * Checks elapsed time and applies 2-hour refreshes (+1 count per 2 hours when count < 3).
 * Returns the up-to-date state (saving back to cookie if changes occurred).
 */
export function getRefreshedUsageState(): UsageState {
  const state = loadRawUsageState();
  const now = Date.now();

  // If already full, clear timers
  if (state.count >= MAX_COUNT) {
    if (state.nextRefreshTime !== null || state.depletedAt !== null) {
      state.nextRefreshTime = null;
      state.depletedAt = null;
      saveUsageState(state);
    }
    return state;
  }

  // If count is less than 3, ensure a refresh target exists
  if (!state.nextRefreshTime) {
    state.depletedAt = state.depletedAt || now;
    state.nextRefreshTime = now + TWO_HOURS_MS;
    saveUsageState(state);
    return state;
  }

  // Check if refresh time has passed
  if (now >= state.nextRefreshTime) {
    const startPoint = state.depletedAt || (state.nextRefreshTime - TWO_HOURS_MS);
    const elapsedSinceStart = now - startPoint;
    const totalPossibleCycles = Math.floor(elapsedSinceStart / TWO_HOURS_MS);

    if (totalPossibleCycles > 0) {
      // Add cycles to whatever count we were at when depleted, or increment by cycles passed
      const added = Math.min(MAX_COUNT - state.count, totalPossibleCycles);
      const newCount = Math.min(MAX_COUNT, state.count + added);

      state.count = newCount;

      if (newCount >= MAX_COUNT) {
        state.count = MAX_COUNT;
        state.depletedAt = null;
        state.nextRefreshTime = null;
      } else {
        // Schedule next 2-hour cycle
        state.nextRefreshTime = now + TWO_HOURS_MS;
        state.depletedAt = now;
      }

      saveUsageState(state);
    }
  }

  return state;
}

/**
 * Deduct 1 usage count.
 * If count reaches 0, begins the 2-hour countdown to refresh 1 count.
 * Returns true if successfully consumed, false if no credits left.
 */
export function consumeUsage(isPro = false): { success: boolean; state: UsageState } {
  const state = getRefreshedUsageState();

  // Chef Pro users have unlimited access and do not deplete credits
  if (isPro) {
    return { success: true, state };
  }

  if (state.count <= 0) {
    return { success: false, state };
  }

  state.count -= 1;
  const now = Date.now();

  // If now depleted or was not scheduled, start 2-hour refresh
  if (state.count < MAX_COUNT && !state.nextRefreshTime) {
    state.depletedAt = now;
    state.nextRefreshTime = now + TWO_HOURS_MS;
  } else if (state.count === 0 && !state.depletedAt) {
    state.depletedAt = now;
    state.nextRefreshTime = now + TWO_HOURS_MS;
  }

  saveUsageState(state);
  return { success: true, state };
}

/**
 * Rewards 1 usage count (e.g., after watching a sponsor ad).
 * Increments count by 1 up to MAX_COUNT (3).
 */
export function rewardAdUsage(): UsageState {
  const state = getRefreshedUsageState();

  if (state.count < MAX_COUNT) {
    state.count += 1;

    if (state.count >= MAX_COUNT) {
      state.count = MAX_COUNT;
      state.depletedAt = null;
      state.nextRefreshTime = null;
    } else {
      // Still below max, keep or adjust the next refresh timer
      if (!state.nextRefreshTime) {
        state.nextRefreshTime = Date.now() + TWO_HOURS_MS;
      }
    }

    saveUsageState(state);
  }

  return state;
}

/**
 * Calculate remaining minutes until next refresh
 */
export function getRemainingRefreshMinutes(state: UsageState): number {
  if (state.count >= MAX_COUNT || !state.nextRefreshTime) {
    return 0;
  }
  const diff = state.nextRefreshTime - Date.now();
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (60 * 1000)));
}

/**
 * Formats remaining minutes into readable string
 * e.g. 119 -> "1h 59m", 45 -> "45m"
 */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return 'Ready';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}m`;
}
