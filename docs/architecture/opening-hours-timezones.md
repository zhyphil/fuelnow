# Opening-hours timezone evaluation

- Task: `P3-OPEN-03`
- Date: 2026-09-04
- Scope: Backend decision evaluation

## Outcome

Open now evaluates every schedule in the service point's IANA timezone:
`Europe/Paris` for France and `Europe/Madrid` for Spain. UTC request instants are
never compared directly with local schedule strings, and the user's current
timezone does not affect a station's result.

The filter now verifies the country/timezone pair before applying either the
schedule or the French unattended Fuel 24/7 rule. A missing, unsupported or
country-mismatched timezone degrades the opening status to Unknown instead of
silently evaluating with the wrong clock.

## Daylight-saving behavior

Luxon's IANA timezone database resolves the applicable offset at the requested
instant. Tests cover:

- winter UTC+1 and summer UTC+2 local opening times;
- a UTC Sunday instant that is already Monday in Spain;
- the March spring-forward gap, where nonexistent local minutes are skipped;
- both occurrences of a repeated October fall-back hour;
- exact closing boundaries after each transition.

This preserves wall-clock business schedules across offset changes without
storing a fixed `+01:00` or `+02:00` assumption. France and mainland Spain share
current transition rules, but their distinct IANA zone identities remain part of
the country contract.

## Verification

Focused deterministic tests cover ordinary winter/summer days, local weekday
rollover, both 2026 DST transitions, invalid timezone values and mismatched
country/timezone pairs. Existing source, advanced-hours and Open now tests remain
green. The complete repository quality gate has 334 passing tests.
