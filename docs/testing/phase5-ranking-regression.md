# P5-QA-03: ranking regression

The existing Phase 3 matrix remains the detailed oracle for Nearest route/fallback
ordering, capability-gated Cheapest/Open now, Fuel/EV Best, limited Air/Wash Best,
missing evidence, invalid numbers, hard exclusions and deterministic tie breaks.
See `ranking-boundary-matrix.md` and the versioned formula documents.

The Phase 5 invariant suite additionally checks 64 varied candidates in each
Fuel/EV formula: reversing or rotating input cannot change ranked results; input
is not mutated; scores remain in [0,1]; weighted contributions reconcile; exclusions
preserve counts; improving one Fuel component cannot reduce its score. Missing EV
queue/charging duration remains incomplete TTS. Air/Wash with unknown evidence is
stable Nearest-equivalent, including exact distance ties.

These are deterministic correctness regressions, not conversion-optimized weights
or claims about live driver outcomes; calibration remains Phase 6.
