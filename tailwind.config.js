/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', "Pretendard", "system-ui", "-apple-system", "sans-serif"],
        serif: ['"Noto Serif KR"', "serif"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        premium: "0 1px 2px rgba(72, 54, 37, 0.04), 0 12px 28px -22px rgba(72, 54, 37, 0.16), 0 22px 50px -38px rgba(72, 54, 37, 0.20)",
        lift: "0 10px 22px -16px rgba(72, 54, 37, 0.22)"
      },
      backgroundImage: {
        "grid-fade": "radial-gradient(circle at top, rgba(195,199,183,0.28), transparent 45%), linear-gradient(180deg, rgba(255,253,248,0.55), transparent)"
      }
    }
  },
  plugins: []
};
