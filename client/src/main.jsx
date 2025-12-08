import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Stats } from "@react-three/drei"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Stats />
    <App />
  </StrictMode>,
)
