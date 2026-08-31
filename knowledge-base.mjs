/**
 * knowledge-base.mjs
 *
 * Tier-1 ONLY. Every word in this file is either already posted publicly
 * in the Discord server (setup-discord.mjs's own pinned content, reused
 * verbatim rather than paraphrased into something that might drift) or
 * a direct, general extension of it. This file is the bot's entire
 * world -- if a fact isn't in here, the bot doesn't know it, which is
 * the actual security boundary, not a prompt instruction on top of a
 * bigger context.
 *
 * DO NOT add specific rule IDs, swing-point values, the Kelly fraction,
 * the player-rating weight, calibration numbers, or any of the other
 * Tier-2 items documented in secrets-guard.mjs. Before adding anything
 * here, ask: would this help someone rebuild the model, or only help
 * them understand it? Tier-1 is "understand", never "rebuild".
 */

export const KNOWLEDGE_BASE = `
# What Caliper is

A statistical model that prices NRL markets. It fits team attack and
defence strengths and positional try distributions from match history,
simulates each fixture tens of thousands of times, and compares the
result to live prices across several bookmakers. Where the difference
is large enough, it suggests a bet and sizes it using the Kelly
criterion.

On top of that sits an independent second opinion: a separate matchup
model that can push back on a selection when it disagrees with the
primary engine.

# What is unusual about it

It reports closing line value above profit. Whether the price taken
beat where the market settled is measurable on a small sample; profit
is not.

It refuses to bet when it agrees with the market. Agreeing with a
price isn't an edge -- an edge requires a specific price being wrong,
not just being right about the result.

Every constant it uses is either measured from data or labelled as a
guess. When an assumption contradicts the history, the model shrinks
it toward zero rather than keeping it at full strength.

# How the model works, in plain terms

1. Team strengths: a statistical fit over match history gives each
   club an attack and a defence rating, plus a competition-wide home
   advantage.
2. Positional split: how each club's tries distribute across
   positions, adjusted toward the league average where a team's own
   sample is thin.
3. Simulation: many thousands of simulated matches per fixture. Every
   market comes from the same simulated draws, so correlations
   between (for example) a line bet and a total-points bet are
   actually measured rather than assumed independent.
4. Second opinion: an independent matchup model is blended in, and
   can push back on a selection when it disagrees with the primary
   engine.
5. Pricing: head-to-head prices are de-vigged (the bookmaker's margin
   is removed mathematically) so the comparison is against a fair
   probability, not a price that's inherently skewed against the
   bettor.
6. Staking: sized using the Kelly criterion, at a fraction of what
   full Kelly would suggest, and shrunk further when the model's own
   estimate is more uncertain.

# What it deliberately does NOT do

Injuries beyond what's in the published team list, weather beyond the
public forecast, motivation, travel beyond distance, or anything
picked up from a press conference rather than data. If it isn't
measurable and repeatable, it isn't in the model.

# On CLV (closing line value)

CLV asks one question: did the price taken beat where the market
closed? It's the measure the model leans on most, because it's
checkable on a much smaller sample than profit is. A model can show
good CLV over a losing stretch and still be doing something right --
variance in the actual results doesn't erase a real, measured pricing
edge, and a string of wins doesn't manufacture one either.

# Why one round proves nothing, win or lose

At these stakes and this many bets, a single round is mostly noise.
The record is published every week regardless of which way it goes,
specifically so nobody has to take that on faith.

# On the Kelly staking approach

Kelly criterion sizing chooses a bet size that grows a bankroll
optimally over the long run, given a genuine edge and correctly
estimated probabilities. Betting less than full Kelly ("fractional
Kelly") trades away some long-run growth for a smoother ride and more
protection against the model's probabilities being slightly wrong --
which they always are, to some degree. The model also sizes down
further specifically for bets it's less certain about, and caps how
much can go on a single very long-priced bet, since a badly-estimated
longshot can do outsized damage to a bankroll even at a modest stake.

The exact fraction used, and the exact caps, aren't shared -- they're
tuning choices that would let someone replicate the sizing exactly
rather than understand the approach.

# On multis

The model can identify same-bookmaker multi-bet combinations from its
own single-bet edges. Research into this specifically found that
multis are, in general, a structurally worse way to express an edge
than betting the same legs separately -- higher variance, more
sensitive to small errors in the underlying probabilities, for often
lower expected value than the equivalent singles. The model's own
multi tool reflects this: most weeks, it correctly recommends against
the multi it just built, because the singles are the better bet. That
isn't a bug -- it's the tool being honest about what the math says.

# 18+ / responsible gambling

Gambling is a way to lose money. Most people who bet lose over time,
and a model doesn't change that for anyone staking more than they can
afford. If you need support: BetStop (the national self-exclusion
register, betstop.gov.au), Gambling Help Online (1800 858 858,
gamblinghelponline.org.au), or Lifeline (13 11 14).
`.trim();
