# P5-QA-04: opening schedules and timezones

Existing tests cover split shifts, overnight/week rollover, explicit 24/7,
unattended-payment separation, holidays, temporary closure, partial/invalid
grammar, country/timezone mismatch and both DST transitions.

The new calendar suite exercises opening-inclusive/closing-exclusive boundaries
on all 366 days of 2024 in Europe/Paris and Europe/Madrid (2,928 assertions), plus
leap-date and source-observation DST boundaries. It identified source parsers
silently shifting a spring-forward time or choosing a fall-back offset. Both now
return unknown for nonexistent/ambiguous local observations. A format round-trip
detects shifted clocks; Luxon's `getPossibleOffsets()` detects repeated clocks.

This is deliberately different from weekly schedules: a schedule of 02:00–03:00
applies to both repeated fall-back wall-clock occurrences, while a single price
observation at 02:30 cannot establish its precise instant without an offset.

Source: [Luxon DateTime API](https://moment.github.io/luxon/api-docs/index.html#datetimegetpossibleoffsets).
The pinned dependency remains 3.7.1; no library upgrade is part of this task.
Current V1 timezone scope is mainland FR/ES per the existing contracts; this does
not establish Canary Islands or overseas opening-time support.
