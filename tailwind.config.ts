import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Garante que ele olha dentro de SRC
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;