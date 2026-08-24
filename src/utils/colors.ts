// Plain hex equivalents of the Tailwind classes previously used via NativeWind, centralized
// so the StyleSheet-based conversion stays visually consistent across every screen.
export const colors = {
    black: '#000000',
    white: '#ffffff',
    purple300: '#d8b4fe',
    purple400: '#c084fc',
    purple500: '#a855f7',
    purple600: '#9333ea',
    purple700: '#7e22ce',
    purple800: '#6b21a8',
    purple900: '#581c87',
    purple950: '#3b0764',
    red400: '#f87171',
    red500: '#ef4444',
    red800: '#991b1b',
    green400: '#4ade80',
    green500: '#22c55e',
    blue400: '#60a5fa',
    zinc700: '#3f3f46',
};

// Mirrors Tailwind's `text-purple-300/50` style opacity modifiers.
export function withOpacity(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
