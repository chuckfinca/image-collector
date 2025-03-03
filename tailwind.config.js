/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // UI Colors
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        
        // Background Colors
        background: 'var(--color-background)',
        'background-alt': 'var(--color-background-alt)',
        'background-subtle': 'var(--color-background-subtle)',
        
        // Text Colors
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        'text-on-primary': 'var(--color-text-on-primary)',
        
        // Border Colors
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        
        // State Colors
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        
        // Subtle accent colors
        'accent-subtle': 'var(--color-accent-subtle)',
        'primary-subtle': 'var(--color-primary-subtle)',
      },
    },
  },
  plugins: [],
}