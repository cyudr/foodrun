/**
 * SnapChef Multilingual Speech Synthesis & Hands-Free Recognition Manager
 * Dynamically adapts TTS voice accents and SpeechRecognition language
 * across English, Chinese, Malay, Korean, Tamil, and Japanese.
 */

import {
  SupportedLanguage,
  getLanguageMeta,
  VOICE_COMMANDS,
} from './i18n';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: SupportedLanguage;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class SpeechController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;
  private isListening: boolean = false;
  private currentLanguage: SupportedLanguage = 'en';
  private onCommandCallback: ((command: string, rawText: string) => void) | null = null;
  private onStatusChangeCallback: ((listening: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.currentLanguage = lang;
    const meta = getLanguageMeta(lang);

    // If recognition is active, update recognition language
    if (this.recognition) {
      const wasListening = this.isListening;
      try {
        if (wasListening) {
          this.recognition.stop();
        }
        this.recognition.lang = meta.recognitionLang;
        if (wasListening) {
          setTimeout(() => {
            try {
              this.recognition.start();
            } catch {
              // Ignore restart error
            }
          }, 300);
        }
      } catch (err) {
        console.warn('Error updating recognition language:', err);
      }
    }
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  // Speak text using Web Speech API with language-specific voice and pronunciation
  public speak(text: string, options: SpeechOptions = {}): boolean {
    if (!this.synth) return false;

    // Cancel any ongoing speech
    this.stop();

    const targetLang = options.lang || this.currentLanguage;
    const meta = getLanguageMeta(targetLang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = meta.bcp47;
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    // Pick the most natural voice matching the target language
    const voices = this.synth.getVoices();
    const langPrefix = meta.bcp47.split('-')[0].toLowerCase();

    // Prefer high quality / natural voices in target language
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(langPrefix) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Premium') ||
            v.name.includes('Neural') ||
            v.name.includes('Siri') ||
            v.name.includes('Karen') ||
            v.name.includes('Tingting') ||
            v.name.includes('Yuna') ||
            v.name.includes('Kyoko') ||
            v.name.includes('Kanya'))
      ) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
      (targetLang === 'ms' ? voices.find((v) => v.lang.toLowerCase().startsWith('id')) : null) || // Indonesian voice closely matches Malay
      voices.find((v) => v.lang.toLowerCase().startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech error:', e);
        options.onError?.(e);
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!this.synth && this.synth.speaking;
  }

  // Multilingual Voice Command Recognition for hands-free cooking
  public initVoiceRecognition(
    onCommand: (command: string, rawText: string) => void,
    onStatusChange?: (listening: boolean) => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API is not supported in this browser environment');
      return false;
    }

    this.onCommandCallback = onCommand;
    this.onStatusChangeCallback = onStatusChange || null;

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;

      const meta = getLanguageMeta(this.currentLanguage);
      this.recognition.lang = meta.recognitionLang;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStatusChangeCallback?.(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStatusChangeCallback?.(false);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Voice recognition error:', event.error);
        }
      };

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        console.log(`[Voice Recognition - ${this.currentLanguage}] Spoken transcript:`, transcript);

        // Multilingual Command Matching
        const cmd = this.matchCommand(transcript);
        if (cmd) {
          this.onCommandCallback?.(cmd, transcript);
        }
      };

      return true;
    } catch (e) {
      console.warn('Failed to initialize speech recognition:', e);
      return false;
    }
  }

  // Matches spoken transcript across the active language commands and English keywords
  private matchCommand(transcript: string): string | null {
    const activeCommands = VOICE_COMMANDS[this.currentLanguage] || VOICE_COMMANDS.en;
    const enCommands = VOICE_COMMANDS.en;

    const checkList = (keywords: string[]) =>
      keywords.some((kw) => transcript.includes(kw.toLowerCase()));

    // 1. Next / Forward
    if (checkList(activeCommands.next) || checkList(enCommands.next)) {
      return 'next';
    }

    // 2. Previous / Back
    if (checkList(activeCommands.back) || checkList(enCommands.back)) {
      return 'back';
    }

    // 3. Repeat / Read again
    if (checkList(activeCommands.repeat) || checkList(enCommands.repeat)) {
      return 'repeat';
    }

    // 4. Timer
    if (checkList(activeCommands.timer) || checkList(enCommands.timer)) {
      return 'timer';
    }

    // 5. Ingredients list
    if (checkList(activeCommands.ingredients) || checkList(enCommands.ingredients)) {
      return 'ingredients';
    }

    // 6. Stop / Pause
    if (checkList(activeCommands.stop) || checkList(enCommands.stop)) {
      return 'stop';
    }

    return null;
  }

  public startListening(): boolean {
    if (this.recognition && !this.isListening) {
      try {
        const meta = getLanguageMeta(this.currentLanguage);
        this.recognition.lang = meta.recognitionLang;
        this.recognition.start();
        return true;
      } catch (err) {
        console.warn('Error starting speech recognition:', err);
      }
    }
    return false;
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
    }
  }

  public isVoiceSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }
}

export const speechController = new SpeechController();
