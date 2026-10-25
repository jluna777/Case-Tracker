import { Link } from 'react-router'

export default function BackLink() {
  return (
    <Link to="/" className="back-link">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
      Cases
    </Link>
  )
}
