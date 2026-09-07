# Mobile language verification

P4-APP-04 provides EN/FR/ES selection, device-locale fallback, typed copy catalogs
and iOS permission-message translations. All implemented screens subscribe to the
same context so changing language updates the current screen and open dialogs.
Device language changes are checked on return to the foreground when no explicit
preference is saved. Unsupported device locales fall back to English.

Only a language code is persisted under `fuel-now.language.v1`. Choosing device
language removes this preference. No coordinates or manual-location text enter
storage. A storage failure leaves the session usable and is disclosed in the
language selector. Writes are serialized; late initial storage reads cannot
override a newer explicit choice.

Tests cover saved/corrupt values, locale fallback, concurrent initial load and
selection, rapid writes/reset, storage failure and catalog completeness. Native
bundle export checks both platforms. iOS system permission copy follows the OS/app
language, which may differ from an in-app-only selection. Device testing of those
dialogs and large text remains part of the release regression.

New screens must add complete FR/ES/EN copy before their checklist item is closed.
Later result formatting uses the selected locale, while canonical API values and
provider attribution remain unchanged.

Reference: [Expo Localization](https://docs.expo.dev/versions/v57.0.0/sdk/localization/).
