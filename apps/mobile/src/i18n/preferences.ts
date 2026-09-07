export const LANGUAGES = ["en", "fr", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_KEY = "fuel-now.language.v1";
export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}
export function deviceLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(base)) return base;
  }
  return "en";
}
export interface LanguageStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
interface LanguageState {
  language: Language;
  preference: Language | null;
  storageFailed: boolean;
}

export class LanguagePreferences {
  private state: LanguageState;
  private revision = 0;
  private initialized: Promise<void> | null = null;
  private pending = Promise.resolve();
  private listeners = new Set<() => void>();
  public constructor(
    private readonly storage: LanguageStorage,
    private readonly systemLanguage: () => Language,
  ) {
    this.state = { language: systemLanguage(), preference: null, storageFailed: false };
  }
  public getSnapshot = () => this.state;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(state: LanguageState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  public initialize = (): Promise<void> => {
    if (this.initialized) return this.initialized;
    const revision = this.revision;
    this.initialized = this.storage
      .getItem(LANGUAGE_KEY)
      .then((value) => {
        if (revision !== this.revision) return;
        const preference = isLanguage(value) ? value : null;
        this.update({
          language: preference ?? this.systemLanguage(),
          preference,
          storageFailed: false,
        });
      })
      .catch(() => {
        if (revision === this.revision)
          this.update({ ...this.state, storageFailed: true });
      });
    return this.initialized;
  };
  public refreshSystem = () => {
    if (this.state.preference === null)
      this.update({ ...this.state, language: this.systemLanguage() });
  };
  public select = (preference: Language | null): Promise<void> => {
    if (preference !== null && !isLanguage(preference))
      throw new Error("Unsupported language");
    const revision = ++this.revision;
    this.update({
      language: preference ?? this.systemLanguage(),
      preference,
      storageFailed: false,
    });
    // Serialize writes so rapid selections cannot leave an older locale on disk.
    this.pending = this.pending
      .then(() =>
        preference === null
          ? this.storage.removeItem(LANGUAGE_KEY)
          : this.storage.setItem(LANGUAGE_KEY, preference),
      )
      .catch(() => {
        if (revision === this.revision)
          this.update({ ...this.state, storageFailed: true });
      });
    return this.pending;
  };
}
