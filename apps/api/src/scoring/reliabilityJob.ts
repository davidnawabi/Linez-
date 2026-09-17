/**
 * TODO (Phase 1 follow-up, not yet implemented):
 *
 * A scheduled job (Supabase cron / a queue worker) that updates
 * `reporter_scores.accuracy_score` by comparing each user's past reports
 * against the consensus of other reports made at the same venue within a
 * short window of theirs. A reporter whose crowd_level/wait_estimate
 * repeatedly disagrees with concurrent reports drifts down; one who
 * repeatedly agrees drifts up. Move slowly (e.g. exponential moving
 * average, not a hard recompute) so a single bad report can't tank a
 * long-standing reliable reporter, and so this can't be gamed by a burst
 * of coordinated fake reports agreeing with each other.
 *
 * Not built for Phase 1 because it needs real usage data to validate
 * against before the "agreement with consensus" heuristic can be tuned.
 * Until this exists, `reporter_scores.accuracy_score` stays at its
 * neutral default (0.75) for every user, which is equivalent to an
 * unweighted average in `computeWeightedVenueStatus` -- decay by recency
 * is still applied, only reporter-reliability weighting is inert.
 */
export {};
