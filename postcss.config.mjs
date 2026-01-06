/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <--- AQUI ESTAVA O ERRO (Antes era só 'tailwindcss')
    autoprefixer: {},
  },
};

export default config;