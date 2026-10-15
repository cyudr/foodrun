import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Flame,
  Award,
  ListOrdered,
  Plus,
  Globe,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe, RecipeStep, ActiveTimer } from '../types';
import { speechController } from '../utils/speech';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getLanguageMeta,
  VOICE_PROMPTS,
  t,
} from '../utils/i18n';

interface VoiceCookingAssistantProps {
  recipe: Recipe;
  onExit: () => void;
  onRecipeCompleted?: () => void;
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const VoiceCookingAssistant: React.FC<VoiceCookingAssistantProps> = ({
  recipe,
  onExit,
  onRecipeCompleted,
  currentLanguage = 'en',
  onLanguageChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoReadSteps, setAutoReadSteps] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isListening, setIsListening] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string>('');
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Kitchen Timer state
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);

  const langMeta = getLanguageMeta(currentLanguage);
  const prompts = VOICE_PROMPTS[currentLanguage] || VOICE_PROMPTS.en;

  const currentStep: RecipeStep =
    recipe.steps[currentStepIndex] || {
      stepNumber: 1,
      instruction: 'Prepare your workspace and ingredients.',
    };

  // Keep speechController in sync with active language
  useEffect(() => {
    speechController.setLanguage(currentLanguage);
  }, [currentLanguage]);

  // Close language popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  // Beep sound generator using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  // Speak current step text using language specific voice and phrasing
  const speakCurrentStep = (stepText?: string) => {
    const textToSpeak =
      stepText || prompts.stepInstruction(currentStep.stepNumber, currentStep.instruction);
    setIsSpeaking(true);
    speechController.speak(textToSpeak, {
      rate: speechRate,
      lang: currentLanguage,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // Stop speaking
  const stopSpeaking = () => {
    speechController.stop();
    setIsSpeaking(false);
  };

  // Initialize Voice recognition on mount
  useEffect(() => {
    speechController.setLanguage(currentLanguage);
    const supported = speechController.isVoiceSupported();
    setIsVoiceSupported(supported);

    if (supported) {
      speechController.initVoiceRecognition(
        (cmd, transcript) => {
          setLastHeardCommand(`Heard: "${transcript}"`);
          handleVoiceCommand(cmd, transcript);
        },
        (listening) => {
          setIsListening(listening);
        }
      );
    }

    // Auto-read first step if enabled
    if (autoReadSteps) {
      const timer = setTimeout(() => {
        speakCurrentStep();
      }, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      speechController.stop();
      speechController.stopListening();
    };
  }, []);

  // When step changes, speak new step if autoRead is on
  const goToStep = (index: number) => {
    if (index < 0 || index >= recipe.steps.length) return;
    setCurrentStepIndex(index);

    if (autoReadSteps) {
      const targetStep = recipe.steps[index];
      setTimeout(() => {
        speakCurrentStep(prompts.stepInstruction(targetStep.stepNumber, targetStep.instruction));
      }, 200);
    }
  };

  // Voice Command Dispatcher
  const handleVoiceCommand = (cmd: string, transcript: string) => {
    if (cmd === 'next') {
      if (currentStepIndex < recipe.steps.length - 1) {
        goToStep(currentStepIndex + 1);
      } else {
        handleFinishRecipe();
      }
    } else if (cmd === 'back') {
      if (currentStepIndex > 0) {
        goToStep(currentStepIndex - 1);
      }
    } else if (cmd === 'repeat') {
      speakCurrentStep();
    } else if (cmd === 'stop') {
      stopSpeaking();
    } else if (cmd === 'timer') {
      // Extract minute number from speech
      const match = transcript.match(/(\d+)\s*(?:mins?|minutes?|분|分|minit)/i);
      const minutes = match ? parseInt(match[1], 10) : 5;
      addTimer(minutes * 60, `${minutes} min timer`);
      speechController.speak(prompts.timerFinished(`${minutes} min`), { lang: currentLanguage });
    } else if (cmd === 'ingredients') {
      const ingList = recipe.ingredients.slice(0, 5).map((i) => i.name).join(', ');
      speechController.speak(ingList, { lang: currentLanguage });
    }
  };

  // Timer Tick Interval
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const next = t.remainingSeconds - 1;
          if (next === 0) {
            playBeep();
            speechController.speak(prompts.timerFinished(t.label), { lang: currentLanguage });
          }
          return {
            ...t,
            remainingSeconds: next,
            isRunning: next > 0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLanguage]);

  // Add kitchen timer
  const addTimer = (seconds: number, label: string) => {
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      stepNumber: currentStep.stepNumber,
    };
    setActiveTimers((prev) => [...prev, newTimer]);
  };

  const removeTimer = (id: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTimerRunning = (id: string) => {
    setActiveTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleFinishRecipe = () => {
    setIsCompleted(true);
    stopSpeaking();
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
    });
    speechController.speak(prompts.recipeComplete, { lang: currentLanguage });
    onRecipeCompleted?.();
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col justify-between overflow-hidden animate-fade-in select-none">
      {/* Top Header */}
      <div className="px-4 py-3 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          type="button"
          className="flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold px-2 py-1.5 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Exit</span>
        </button>

        <div className="text-center px-2 min-w-0 max-w-[45%]">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
            {recipe.title}
          </p>
          <p className="text-xs font-extrabold text-stone-200">
            {t('step', currentLanguage)} {currentStepIndex + 1} / {recipe.steps.length}
          </p>
        </div>

        {/* Right Header Controls: Language Selector, Mic & Speaker */}
        <div className="flex items-center gap-1.5">
          {/* In-Cooking Language Toggle */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all cursor-pointer"
              title="Change Voice & Recipe Language"
            >
              <span>{langMeta.flag}</span>
              <span className="text-[10px] uppercase font-bold">{langMeta.code}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-stone-900 rounded-2xl shadow-2xl border border-stone-700 py-1.5 z-50">
                <div className="px-3 py-1 border-b border-stone-800 text-[10px] font-bold uppercase text-stone-400 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-amber-400" />
                  <span>{t('languageSelector', currentLanguage)}</span>
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = lang.code === currentLanguage;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange?.(lang.code);
                        speechController.setLanguage(lang.code);
                        setIsLangMenuOpen(false);
                      }}
                      type="button"
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-400 font-bold'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.nativeName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Voice Recognition Toggle */}
          {isVoiceSupported ? (
            <button
              onClick={() => {
                if (isListening) {
                  speechController.stopListening();
                } else {
                  speechController.startListening();
                }
              }}
              type="button"
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isListening
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 animate-pulse'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
              title="Hands-free voice recognition"
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          ) : null}

          {/* Voice Speech Toggle */}
          <button
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                speakCurrentStep();
              }
            }}
            type="button"
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="Read step out loud"
          >
            {isSpeaking ? <Volume2 className="w-4 h-4 animate-bounce" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Step Progress Line */}
      <div className="w-full bg-stone-900 h-1.5 shrink-0">
        <div
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
          style={{
            width: `${((currentStepIndex + 1) / (recipe.steps.length || 1)) * 100}%`,
          }}
        />
      </div>

      {/* Center Body: Step Content or Completion */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
        {!isCompleted ? (
          <div className="space-y-5">
            {/* Step Number Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{prompts.stepPrefix(currentStep.stepNumber)}</span>
            </div>

            {/* Step Instruction */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed tracking-tight px-1 font-sans">
              {currentStep.instruction}
            </h2>

            {/* Chef Tip if available */}
            {currentStep.tip && (
              <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-xs text-stone-300 flex items-start gap-2.5 text-left max-w-sm mx-auto shadow-sm">
                <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-400 block mb-0.5">
                    {t('chefNotes', currentLanguage)}:
                  </span>
                  <span>{currentStep.tip}</span>
                </div>
              </div>
            )}

            {/* Inline Timer Button if step specifies estimatedMinutes */}
            {currentStep.estimatedMinutes && currentStep.estimatedMinutes > 0 && (
              <div className="pt-2">
                <button
                  onClick={() =>
                    addTimer(
                      currentStep.estimatedMinutes! * 60,
                      `${prompts.stepPrefix(currentStep.stepNumber)}: ${currentStep.estimatedMinutes} min`
                    )
                  }
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-amber-400 font-bold text-xs border border-amber-500/30 shadow-md transition-all cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>⏰ {t('kitchenTimer', currentLanguage)} ({currentStep.estimatedMinutes} min)</span>
                </button>
              </div>
            )}

            {/* Voice Command Heard Bubble */}
            {isListening && (
              <div className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>
                  {lastHeardCommand || t('voiceListening', currentLanguage)}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Completed View */
          <div className="space-y-4 py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              {t('finishCooking', currentLanguage)}!
            </h2>
            <p className="text-stone-300 text-sm max-w-xs mx-auto leading-relaxed">
              <span className="text-amber-400 font-bold">{recipe.title}</span>
            </p>
            <div className="pt-4 flex flex-col gap-2.5 w-full max-w-xs mx-auto">
              <button
                onClick={onExit}
                type="button"
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm shadow-lg transition-all cursor-pointer"
              >
                {t('recipes', currentLanguage)}
              </button>
            </div>
          </div>
        )}

        {/* Active Timers Dock */}
        {activeTimers.length > 0 && (
          <div className="w-full max-w-md mt-6 space-y-2">
            {activeTimers.map((timer) => (
              <div
                key={timer.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  timer.remainingSeconds === 0
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                    : 'bg-stone-900 border-stone-800 text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Clock className={`w-4 h-4 ${timer.remainingSeconds === 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                  <div>
                    <p className="text-xs font-bold">{timer.label}</p>
                    <p className="text-base font-extrabold font-mono tracking-wider">
                      {timer.remainingSeconds === 0 ? 'TIME IS UP!' : formatTimerDisplay(timer.remainingSeconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleTimerRunning(timer.id)}
                    type="button"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                  >
                    {timer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => removeTimer(timer.id)}
                    type="button"
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Giant Messy-Hands Friendly Bottom Controls */}
      <div className="p-4 bg-stone-900/95 border-t border-stone-800 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Previous Step Button */}
          <button
            onClick={() => goToStep(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
            type="button"
            className="flex-1 py-4 px-3 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 font-extrabold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('previousStep', currentLanguage)}</span>
          </button>

          {/* Voice Read/Repeat Button */}
          <button
            onClick={() => speakCurrentStep()}
            type="button"
            className={`py-4 px-5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
              isSpeaking
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700'
            }`}
            title="Read instruction again"
          >
            <Volume2 className="w-5 h-5" />
            <span>{t('readAgain', currentLanguage)}</span>
          </button>

          {/* Next / Finish Button */}
          {currentStepIndex < recipe.steps.length - 1 ? (
            <button
              onClick={() => goToStep(currentStepIndex + 1)}
              type="button"
              className="flex-1 py-4 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <span>{t('nextStep', currentLanguage)}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleFinishRecipe}
              type="button"
              className="flex-1 py-4 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <span>{t('finishCooking', currentLanguage)}!</span>
              <Check className="w-5 h-5 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Bottom Quick Controls & Speed */}
        <div className="max-w-lg mx-auto flex items-center justify-between text-stone-400 text-xs pt-3 px-1">
          <div className="flex items-center gap-2">
            <span>Speed:</span>
            <button
              onClick={() => setSpeechRate((r) => (r === 1.0 ? 0.8 : r === 0.8 ? 1.2 : 1.0))}
              type="button"
              className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-bold hover:bg-stone-700 cursor-pointer"
            >
              {speechRate}x
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-stone-400 hover:text-stone-200">
            <input
              type="checkbox"
              checked={autoReadSteps}
              onChange={(e) => setAutoReadSteps(e.target.checked)}
              className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-0"
            />
            <span>Auto-speak</span>
          </label>
        </div>
      </div>
    </div>
  );
};
