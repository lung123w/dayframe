import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tokens first: `src/styles/tokens.css` declares custom properties only, so it
// carries no specificity — it must load before the stylesheets that consume it
// (design.md §2 D1). `App.css` is imported by `App.jsx`.
import './styles/tokens.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
