// Geometric, non-photographic avatars for StudySpark user profiles.
// Uses DiceBear's `shapes` style (abstract geometric) tinted to the
// StudySpark palette. Each avatar is deterministic from a seed, so a user
// keeps the same picture across devices.

// Palette tokens (from tailwind.config.js) as broadcastable hex strings.
const PALETTE = [
  '1e2a38', // ink
  '4a6c86', // ember (slate blue)
  '6f9bb8', // ember light
  'e0e9f2', // mist
  'd98c5f', // sepia/ember accent
  '2f4858', // deep slate
].join(',')

const STYLES = ['shapes', 'ring', 'bauhaus'] as const
export type AvatarStyle = (typeof STYLES)[number]

const BASE = 'https://api.dicebear.com/9.x'

// Build a deterministic geometric avatar URL from a seed + style.
export function avatarUrl(seed: string, style: AvatarStyle = 'shapes'): string {
  const s = encodeURIComponent(seed || 'StudySpark')
  return `${BASE}/${style}/svg?seed=${s}&radius=50&backgroundType=gradientLinear&palette=${PALETTE}`
}

// The list of styles a user can pick from in the avatar chooser.
export const AVATAR_STYLES = STYLES

// Pick a stable seed for a brand-new account (one is always assigned).
export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

// Resolve the avatar URL for a stored profile: if the profile has no avatar
// seed, derive a stable one from the user's name/email so existing accounts
// still get a consistent geometric picture instead of a blank.
export function profileAvatarUrl(avatar: string | null | undefined, fallback: string): string {
  const seed = (avatar && avatar.trim()) || fallback || 'StudySpark'
  return avatarUrl(seed, 'shapes')
}
