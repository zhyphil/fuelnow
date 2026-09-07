# Foreground location verification

P4-APP-02 implements contextual location access (ADR 0007). App launch does not
request permission. Only the explicit location button checks/requests foreground
permission. Blocked permissions are not reprompted. Approximate fixes are accepted.

The native adapter obtains one balanced-accuracy fix with a 10-second deadline,
then removes its subscription. Cancellation, timeout, provider errors and early
callbacks all release the listener. The session ignores late asynchronous results
and clears coordinates when the app enters the background or the provider unmounts.
Permission dialogs' temporary `inactive` state does not cancel the request.

Automated tests cover grant, denial, permanent denial, disabled system services,
invalid fixes, duplicate taps, cancellation and listener cleanup. Native bundles
are exported for iOS and Android. Config inspection checks foreground permission
wording and the absence of background/always and motion permission declarations.

Device release regression remains required: iOS Allow Once/While Using, Android
approximate/precise, denied permission and return from Settings, disabled system
location, backgrounding while locating and a slow GPS fix. Bundle export and
mocked adapter tests do not establish those OS dialog interactions on real devices.

P4-APP-03 adds an offline, searchable list of the eight ADR 0005 city-centre
anchors and validated coordinate entry (including decimal commas and negative
longitude). This is explicitly city-centre search, not address geocoding or device
location. Arbitrary coordinates remain available for locations outside the list.
No geocoding service, provider key or manual-text transmission is needed.

Manual selection works without a location permission request and uses the same
in-memory origin consumed by later search screens. Selecting manually cancels
pending GPS work; a late GPS response cannot overwrite the chosen origin. Closing
the selector preserves an existing ready origin. Raw coordinates, manual input,
permission errors and location history are not written to storage or analytics.

API reference: [Expo Location SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/location/).
