/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chat: {
          bg: "#0b141a",
          panel: "#111b21",
          bubbleMe: "#005c4b",
          bubbleOther: "#202c33",
          accent: "#00a884",
        },
      },
    },
  },
  plugins: [],
};
