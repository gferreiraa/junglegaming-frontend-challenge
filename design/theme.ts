// KURIO — theme em TS (espelha tokens.css). Use em styled-components,
// CSS-in-JS, Storybook, testes, ou como preset do Tailwind v3.
// (≈) = valor estimado visualmente no Figma.

export const colors = {
  ink: "#140D0A",
  surfaceCard: "#241612",
  surfaceDark: "#38220F",
  surfaceRaised: "#2C1C16", // (≈)
  overlay: "rgba(20,13,10,0.72)", // (≈)
  primary: "#D28A4C",
  primaryHover: "#E09A5C", // (≈)
  primaryForeground: "#140D0A",
  textPrimary: "#F5F1EB",
  textSecondary: "#CFB28C",
  textAccent: "#E89B55",
  textMuted: "#B39463",
  border: "#3D2A1F", // (≈)
  borderStrong: "#5A3F2C", // (≈)
  danger: "#E5674D", // (≈)
} as const;

export const font = {
  family: `"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
  weight: { regular: 400, medium: 500, bold: 700 },
} as const;

// [fontSize, lineHeight, weight padrão]
export const typography = {
  display: ["43px", "70px", 700],
  h2: ["28px", "1", 700],
  h3: ["20px", "28px", 700],
  bodyLg: ["16px", "20px", 700],
  list: ["15px", "40px", 400],
  body: ["14px", "24px", 400],
  input: ["14px", "16px", 400],
  caption: ["12px", "16px", 400],
  micro: ["10px", "12px", 700],
} as const;

export const radius = { sm: 6, md: 10, lg: 15, xl: 24, device: 40, full: 9999 } as const;

export const layout = {
  containerMax: 1200,
  gutterDesktop: 120,
  gutterMobile: 24,
  sectionGap: 96,
  sidebarWidth: 270,
  breakpoints: { md: 768, lg: 1024, xl: 1440 },
} as const;

/** Preset para Tailwind v3 (tailwind.config.ts → presets: [kurioPreset]) */
export const kurioPreset = {
  theme: {
    extend: {
      colors: {
        ink: colors.ink,
        surface: { card: colors.surfaceCard, dark: colors.surfaceDark, raised: colors.surfaceRaised },
        primary: { DEFAULT: colors.primary, hover: colors.primaryHover, foreground: colors.primaryForeground },
        fg: { DEFAULT: colors.textPrimary, secondary: colors.textSecondary, accent: colors.textAccent, muted: colors.textMuted },
        border: { DEFAULT: colors.border, strong: colors.borderStrong },
        danger: colors.danger,
      },
      fontFamily: { mono: [font.family], sans: [font.family] },
      fontSize: Object.fromEntries(
        Object.entries(typography).map(([k, [s, lh, w]]) => [k, [s, { lineHeight: lh, fontWeight: String(w) }]]),
      ),
      borderRadius: { sm: "6px", md: "10px", lg: "15px", xl: "24px", device: "40px" },
      maxWidth: { container: "1200px" },
      spacing: { gutter: "120px", section: "96px", sidebar: "270px" },
    },
  },
};

export const theme = { colors, font, typography, radius, layout };
export default theme;
