/** @type {import('tailwindcss').Config} */
// Bảng màu thương hiệu UniPOS — đổi màu toàn hệ thống chỉ cần sửa ở đây.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Xanh dương chủ đạo ("POS"); brand-500 đạt độ tương phản 4.5:1 với chữ trắng
        brand: {
          50: "#EEF5FE",
          100: "#DCEBFD",
          200: "#BAD6FB",
          300: "#8BB9F7",
          400: "#4C95F0",
          500: "#1D74E0",
          600: "#1663CC",
          700: "#1451A8",
          800: "#143F80",
          900: "#11336A",
          950: "#0A1F44", // navy ("Uni")
        },
        // Cam điểm nhấn
        accent: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          400: "#FBA94C",
          500: "#F7931E",
          600: "#E07A0A",
          700: "#B85F07",
        },
        // Xanh lá tăng trưởng
        growth: {
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        brand: ["Montserrat", '"Be Vietnam Pro"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
