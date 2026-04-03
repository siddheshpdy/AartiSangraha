import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

registerSW()

const container = document.getElementById('root')

createRoot(container).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
