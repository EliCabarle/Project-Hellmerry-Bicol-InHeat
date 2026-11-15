import React from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './clay-bridge.css'
import './dark-theme.css'
import App from './app.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Prod only: register service worker after load so Vite HMR isn't shadowed.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

// Install prompt: deferred install UI for the PWA. Shows a clay-styled banner
// when the browser offers an installable PWA, dismissed on install or dismiss.
let deferredPrompt = null
const installBanner = document.createElement('div')
installBanner.id = 'bih-install-banner'
installBanner.style.cssText = `
  position: fixed;
  bottom: env(safe-area-inset-bottom, 1rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: #FFFFFF;
  border: 3px solid #FED7AA;
  border-radius: 20px;
  padding: 10px 16px;
  box-shadow: 0 6px 24px rgba(30,27,75,0.12);
  font-family: 'Nunito', system-ui, sans-serif;
  font-size: 13px;
  color: #9A3412;
  display: none;
  align-items: center;
  gap: 10px;
`
document.body.appendChild(installBanner)

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  installBanner.style.display = 'flex'
})

installBanner.innerHTML = `
  <span style="flex:1">Install Bicol In-Heat — works offline</span>
  <button id="bih-install-btn" style="
    background:#F97316;color:#fff;border:none;border-radius:12px;
    padding:6px 14px;font-weight:600;font-size:13px;cursor:pointer
  ">Install</button>
  <button id="bih-install-dismiss" style="
    background:none;border:none;color:#64748B;font-size:13px;
    cursor:pointer;padding:0
  ">&times;</button>
`

document.getElementById('bih-install-btn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  if (outcome === 'accepted') {
    installBanner.style.display = 'none'
  }
  deferredPrompt = null
})

document.getElementById('bih-install-dismiss')?.addEventListener('click', () => {
  installBanner.style.display = 'none'
})

// Listen for app installed event to hide banner
window.addEventListener('appinstalled', () => {
  installBanner.style.display = 'none'
  deferredPrompt = null
})
