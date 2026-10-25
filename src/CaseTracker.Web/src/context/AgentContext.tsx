import { createContext, useContext, useState, type ReactNode } from 'react'
import { AGENTS } from '../types.ts'

const STORAGE_KEY = 'caseTracker.agent'

interface AgentContextValue {
  agent: string
  setAgent: (agent: string) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

// Storage can throw (private mode, blocked site data); fall back to the default agent.
function loadAgent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && AGENTS.includes(saved)) return saved
  } catch {
    // ignore
  }
  return AGENTS[0]
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgentState] = useState(loadAgent)

  function setAgent(next: string) {
    setAgentState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return <AgentContext.Provider value={{ agent, setAgent }}>{children}</AgentContext.Provider>
}

export function useAgent() {
  const value = useContext(AgentContext)
  if (!value) throw new Error('useAgent must be used inside AgentProvider')
  return value
}
