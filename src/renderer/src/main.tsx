import React from 'react'
import ReactDOM from 'react-dom/client'
import './globals.css'
import App from './App'

// Initialize UI store (applies theme to document)
import './stores/ui.store'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
