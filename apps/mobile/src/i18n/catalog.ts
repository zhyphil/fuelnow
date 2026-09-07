import { messages } from "../content/messages";
import { locationMessages } from "../content/location";
import { manualMessages } from "../content/manual";
import { languageMessages } from "../content/language";
import type { Language } from "./preferences";
import { serviceMessages } from "../content/services";
import { resultMessages } from "../content/results";
import { sortMessages } from "../content/sorts";

export function getMessages(language: Language) {
  return {
    sorts: sortMessages[language],
    results: resultMessages[language],
    services: serviceMessages[language],
    app: messages[language],
    location: locationMessages[language],
    manual: manualMessages[language],
    language: languageMessages[language],
  };
}
