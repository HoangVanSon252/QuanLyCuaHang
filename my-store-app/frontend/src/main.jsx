import { createRoot } from 'react-dom/client'
// Font tự host (không tải từ Google → đúng chính sách CSP, chạy được cả khi mạng chặn Google)
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/be-vietnam-pro/800.css'
import '@fontsource/montserrat/800.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <App />
)
