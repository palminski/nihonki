// Single source of truth for how far system accessibility text-size settings are allowed
// to scale ordinary UI chrome (labels, buttons, counters) before it starts clipping fixed
// layouts. Card content deliberately bypasses this — see AppText's own comment.
export const GLOBAL_MAX_FONT_SIZE_MULTIPLIER = 1.3;
