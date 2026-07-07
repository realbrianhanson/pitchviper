---
name: Canonical Headline KPIs
description: ghl_activities is the single source of truth for headline KPIs (calls today, pipeline, deals/revenue won this week) and the day streak
type: feature
---
`ghl_activities` (via `useGhlStats` for the current user, `calculate-leaderboard` for team leaderboards) is the CANONICAL source for the headline KPIs and the day streak that appear on Command Center, the LiveTicker, and the My Performance scorecard: calls today, pipeline deals, deals won this week, revenue won this week, current streak.

`daily_stats`, the `activities` table, and Aloware calls remain the source of truth for their DETAIL views only — activity feed, Call Intelligence, historical trend charts, manual daily_stats entry, and manager per-rep roll-ups (which still read `profiles.current_streak` because per-rep ghl computation isn't wired for other users).

Rule: when a screen displays a headline "same number" that also appears on Command Center, it must come from `useGhlStats` (or a shared selector built on it). Do not introduce a new daily_stats/activities read for the same headline metric.
