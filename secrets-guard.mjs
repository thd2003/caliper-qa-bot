/**
 * secrets-guard.mjs
 *
 * The output-side backstop for the Caliper Q&A bot. NOT the primary
 * defense -- the primary defense is architectural: the bot's knowledge
 * base (system prompt + retrieved content) never contains a Tier-2
 * secret in the first place, so there is nothing for a jailbreak to
 * extract. This module exists for the failure mode where a secret
 * leaks into context by mistake (a knowledge-base document accidentally
 * includes a real number, a future edit reintroduces one, etc.) --
 * catching that before it reaches Discord, not relying on the model to
 * withhold something it can see.
 *
 * DELIBERATELY DOES NOT BLOCKLIST BARE NUMBERS like 0.35 or 0.55.
 * Those are Kelly fractions and rating shifts, but they're also
 * completely ordinary numbers that show up constantly in innocent
 * statistics conversation ("a 35% win rate", "correlation of 0.55").
 * A denylist on numbers that common would either produce false
 * positives on every second message, or be trivially dodged by
 * rephrasing ("about a third" instead of "0.35") -- the research this
 * was built from is explicit that output filtering only works well on
 * UNIQUE strings, not common values. What's blocked here instead:
 *
 *   - The 71 real rule IDs from rules_seed.csv (e.g. "storm_no_howarth")
 *   - Constant/variable names from rules.py (e.g. "KELLY_FRACTION")
 *   - A few distinctive phrases unique to this project's internals
 *
 * None of these could plausibly appear in an innocent sentence, which
 * is what makes them safe to hard-block without annoying real users.
 */

// Generated from rules_seed.csv -- if rules are added or removed there,
// regenerate this list (see build-denylist.mjs) rather than hand-edit it.
export const RULE_IDS = [
  "broncos_no_reynolds_env",
  "broncos_no_reynolds_weapon",
  "broncos_yes_anderson",
  "broncos_yes_haas",
  "broncos_yes_mariner",
  "bulldogs_no_crichton",
  "bulldogs_no_kikau",
  "bulldogs_no_preston",
  "bulldogs_no_rinakama",
  "cowboys_drinkwater_left_conversions",
  "cowboys_no_chester",
  "cowboys_no_nanai",
  "dolphins_no_farnworth",
  "dolphins_no_finefeuiaki",
  "dolphins_no_katoa_env",
  "dolphins_no_katoa_weapon",
  "dragons_no_kerr",
  "dragons_no_pasifiki_tonga",
  "eagles_no_koula",
  "eagles_no_olakau'atu",
  "eels_no_ da_silva",
  "eels_no_ moses_env",
  "eels_no_ moses_weapon",
  "eels_no_addo-carr",
  "knights_no_best",
  "knights_no_marzhew",
  "knights_no_saifiti",
  "knights_ponga_and_brown_yes_env",
  "knights_ponga_and_brown_yes_weapon",
  "panthers_no_cleary_env",
  "panthers_no_cleary_weapon",
  "panthers_no_papaliâ€™i",
  "panthers_no_toâ€™o",
  "rabbitohs_no_fifita",
  "rabbitohs_no_graham",
  "rabbitohs_no_kaloamatangi",
  "rabbitohs_no_mitchell_env",
  "rabbitohs_no_mitchell_weapon",
  "rabbitohs_no_smith",
  "raiders_no_ssasagi",
  "raiders_no_strange",
  "raiders_no_weekes",
  "raiders_yes_mariota",
  "roosters_no_nawaqanitawase",
  "roosters_no_robson",
  "roosters_no_toia",
  "roosters_no_walker_env",
  "roosters_no_walker_weapon",
  "roosters_no_whyte",
  "sharks_no_hynes_env",
  "sharks_no_hynes_weapon",
  "sharks_no_nikora",
  "sharks_no_ramien",
  "storm_no_grant",
  "storm_no_howarth",
  "storm_no_hughes",
  "storm_no_meaney_env",
  "storm_no_meaney_weapon",
  "storm_no_munster",
  "tigers_no_doueihi_env",
  "tigers_no_doueihi_weapon",
  "tigers_no_makasini",
  "tigers_no_may",
  "tigers_no_pole",
  "titans_no_campbell_env",
  "titans_no_campbell_weapon",
  "titans_no_fa'asuamaleaui",
  "titans_no_fifita",
  "warriors_no_halasima",
  "warriors_no_harris-tavita_env",
  "warriors_no_harris-tavita_weapon",
];

// Constant/variable names from rules.py -- these are what actually get
// discussed if a jailbreak tries "explain your exact staking formula" --
// the names themselves are Tier-2 even before any value is attached.
export const CONSTANT_NAMES = [
  "KELLY_FRACTION", "KELLY_BY_BAND", "UNIT_FRACTION", "MAX_UNITS_PER_BET",
  "MAX_UNITS_PER_FIXTURE", "MAX_UNITS_PER_ROUND", "MAX_UNITS_PER_GROUP",
  "MAX_UNITS_PER_GROUP_PER_ROUND", "STAKE_STEP", "MIN_UNITS",
  "PLAYER_WEIGHT", "RATING_TEAM_LIFT", "TEAM_LIFT_CAP", "DEFENCE_WEIGHT",
  "RATING_SWING_SCALE", "ALIGNED_UNCERTAINTY", "HOME_SCORES_FIRST",
  "SHRINK_TO_MARKET", "MAX_MAGNITUDE", "MAX_OPINION_RULES_PER_FIXTURE",
  "MAX_TOTAL_ADJUSTMENT", "UNITS_PER_RATIO", "EVIDENCE_UNCERTAINTY",
  "BASIS_UNCERTAINTY", "MARKET_SD", "REL_MARGIN", "RATING_SHIFT",
  "MULTI_KELLY_FRACTION", "PROB_FLOOR", "REPLACEMENT_LEVEL",
  "MIN_VIABLE_UNITS", "per_bet_cap", "max_total",
];

// Distinctive phrases that would only appear if the model started
// describing real internal mechanics, not just talking ABOUT the
// existence of a concept.
export const PHRASE_PATTERNS = [
  /swing[_ ]?points?\s*[:=]\s*[-+]?\d/i,     // an actual rule value being stated
  /half[- ]life of \d+ matches/i,             // the specific 80-match figure
  /kelly fraction (?:is|of|=)\s*0?\.\d+/i,    // stating the exact fraction
  /devig(?:ged|ging)? power\s*[:=]\s*\d/i,
];

/**
 * Scans a candidate bot response for Tier-2 leakage before it's sent.
 * Returns { safe: boolean, hits: string[] } -- hits is empty when safe.
 */
export function scanForLeaks(text) {
  const hits = [];
  const lower = text.toLowerCase();

  for (const id of RULE_IDS) {
    if (lower.includes(id.toLowerCase())) hits.push(`rule id: ${id}`);
  }
  for (const name of CONSTANT_NAMES) {
    // Word-boundary match so "kelly fraction" (the concept, fine to discuss)
    // doesn't false-positive on the constant NAME "KELLY_FRACTION" being a
    // substring check gone wrong -- require the actual identifier form.
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(text)) hits.push(`constant name: ${name}`);
  }
  for (const pattern of PHRASE_PATTERNS) {
    if (pattern.test(text)) hits.push(`pattern: ${pattern}`);
  }

  return { safe: hits.length === 0, hits };
}
