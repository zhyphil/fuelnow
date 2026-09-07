export const languageNames = { en: "English", fr: "Français", es: "Español" } as const;
const en = {
  choose: "Language",
  system: "Use device language",
  close: "Close",
  failed:
    "Your language works for this session, but could not be saved on this device.",
};
export const languageMessages: Record<"en" | "fr" | "es", typeof en> = {
  en,
  fr: {
    choose: "Langue",
    system: "Utiliser la langue de l’appareil",
    close: "Fermer",
    failed:
      "La langue est active pour cette session, mais n’a pas pu être enregistrée sur cet appareil.",
  },
  es: {
    choose: "Idioma",
    system: "Usar idioma del dispositivo",
    close: "Cerrar",
    failed:
      "El idioma funciona en esta sesión, pero no se pudo guardar en este dispositivo.",
  },
};
