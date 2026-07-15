// Centralized XP + leveling rules so every screen agrees on the numbers.

import type { Difficulty } from '../types'

// XP awarded for a CORRECT answer, by difficulty. A wrong / unanswered card
// yields WRONG_FRACTION of the correct value (see xpForCard).
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  'very-easy': 5,
  easy: 8,
  medium: 12,
  hard: 18,
  'very-hard': 25,
}

// Fallback when a card has no difficulty label.
export const DEFAULT_CORRECT_XP = 10

// Failing or not answering still grants a small consolation fraction.
export const WRONG_FRACTION = 0.1

// XP for a single card given whether it was answered correctly.
export function xpForCard(difficulty: Difficulty | undefined, correct: boolean): number {
  const base = difficulty ? XP_BY_DIFFICULTY[difficulty] : DEFAULT_CORRECT_XP
  return correct ? base : Math.round(base * WRONG_FRACTION)
}

// Total XP earned for a finished deck. `cards` carries each card's difficulty
// and its `correct` flag (true = right, false/undefined = wrong or skipped).
export function xpForSession(cards: { difficulty?: Difficulty; correct?: boolean }[]): number {
  return cards.reduce((sum, c) => sum + xpForCard(c.difficulty, c.correct === true), 0)
}

// XP for a focused "review the cards I got wrong" pass (point 5). The user
// already earned the 10% consolation fraction on the first attempt, so we do
// NOT re-add it. A card corrected on this retry earns 50% of its base value;
// a card missed again earns nothing extra (0).
export const WRONG_REVIEW_FRACTION = 0.5
export function xpForWrongReview(cards: { difficulty?: Difficulty; correct?: boolean }[]): number {
  return cards.reduce((sum, c) => {
    if (c.correct !== true) return sum // still wrong on retry -> no extra XP
    const base = c.difficulty ? XP_BY_DIFFICULTY[c.difficulty] : DEFAULT_CORRECT_XP
    return sum + Math.round(base * WRONG_REVIEW_FRACTION)
  }, 0)
}

// XP for a focused "study the cards I never answered" pass (point 7). These are
// brand-new attempts for the user, so a correct answer is worth 80% of the
// base value (a touch under a fresh full study) and a wrong one still grants the
// 10% consolation fraction, just like the first attempt in a normal session.
export const PENDING_REVIEW_FRACTION = 0.8
export function xpForPendingReview(cards: { difficulty?: Difficulty; correct?: boolean }[]): number {
  return cards.reduce((sum, c) => {
    const base = c.difficulty ? XP_BY_DIFFICULTY[c.difficulty] : DEFAULT_CORRECT_XP
    return sum + (c.correct === true ? Math.round(base * PENDING_REVIEW_FRACTION) : Math.round(base * WRONG_FRACTION))
  }, 0)
}

// ----- Levels -----
// Curve is quadratic (each level costs a bit more than the last) until LEVEL_CAP,
// after which every further level costs a FIXED amount. This keeps early levels
// snappy, makes mid/late levels meaningful, and prevents runaway requirements.
const LEVEL_CAP = 100
const BASE_STEP = 100 // cost from level 1 -> 2
const GROWTH = 15 // extra cost added per level while below the cap

// Cost (in XP) to go from `level` to `level + 1`.
function levelStep(level: number): number {
  const capped = Math.min(level, LEVEL_CAP)
  return BASE_STEP + (capped - 1) * GROWTH
}

// Total cumulative XP required to REACH a given level (level 1 = 0 XP).
export function xpToReachLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += levelStep(l)
  return total
}

export interface LevelInfo {
  level: number
  // XP accumulated inside the current level.
  intoLevel: number
  // XP span of the current level (current -> next).
  levelSpan: number
  // 0..100 progress within the current level.
  progressPct: number
}

// Resolve a raw XP total into level + progress information.
export function levelFromXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0))
  let level = 1
  // Walk up while the user can afford the next level.
  while (safeXp >= xpToReachLevel(level + 1)) level++
  const floor = xpToReachLevel(level)
  const span = levelStep(level)
  const intoLevel = safeXp - floor
  const progressPct = span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 100
  return { level, intoLevel, levelSpan: span, progressPct }
}
