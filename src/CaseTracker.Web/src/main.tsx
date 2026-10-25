import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles.css'
import App from './App.tsx'
import { AgentProvider } from './context/AgentContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AgentProvider>
        <App />
      </AgentProvider>
    </BrowserRouter>
  </StrictMode>,
)
