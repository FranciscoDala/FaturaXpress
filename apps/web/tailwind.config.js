/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Zalando Sans Expanded"', 'ui-sans-serif', 'system-ui'],
            },
            colors: {
                'primaria': '#0a4a8a',
                'secundaria': '#1e90ff',
                'terciaria': '#00c6ff',
            }
        },
    },
    plugins: [],
}
