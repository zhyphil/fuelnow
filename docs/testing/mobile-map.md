# Secondary native map

P4-RES-12 follows ADR 0004: `react-native-maps` 1.27.2, the Expo SDK 57
recommended version, Apple Maps on iOS and Google Maps on Android.
The map is a user-opened modal containing the same result markers, with marker
selection opening canonical details. No location layer, background tracking,
in-app guidance or coordinate-bearing navigation route is enabled.

The map notice identifies the provider and viewed-area processing before rendering.
Native provider attribution is preserved. Closing the modal returns to the list.
Origin loss clears the response and removes the modal's map content.

Android standalone builds need `GOOGLE_MAPS_ANDROID_API_KEY` in their build
environment, restricted to the package name and signing certificate. Only a
configured flag reaches JS; the key is consumed by the native config plugin.
No key/account/billing has been created. Unconfigured Android builds explain the
missing map setup while retaining the list; Expo Go can use its bundled setup.

Automated checks cover valid markers/viewport and provider configuration fallback,
TypeScript and iOS/Android bundle export. Native map rendering, key restrictions
and release-build signing remain Phase 5 credential/device checks.

Reference: [Expo SDK 57 map setup](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/).
