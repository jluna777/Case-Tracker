import { Link } from 'react-router'
import { useAgent } from '../context/AgentContext.tsx'
import { AGENTS } from '../types.ts'
import Avatar from './Avatar.tsx'

export default function Header() {
  const { agent, setAgent } = useAgent()

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#4F46E5" />
          <g transform="rotate(-14 16 16)">
            <path d="M7 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.6a2.4 2.4 0 0 0 0 4.8V21a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2.6a2.4 2.4 0 0 0 0-4.8z" fill="#FFFFFF" />
            <path d="M12.2 16.2l2.6 2.6 5-5.2" fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
        <span>Case Tracker</span>
      </Link>
      <div className="acting-as">
        <label htmlFor="agent">Acting as</label>
        <Avatar name={agent} />
        <select id="agent" className="select" value={agent} onChange={e => setAgent(e.target.value)}>
          {AGENTS.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>
    </header>
  )
}
