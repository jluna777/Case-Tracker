import { Link } from 'react-router'

export default function CasesPage() {
  return (
    <main>
      <h1>Cases</h1>
      <p>
        <Link to="/cases/new">New case</Link> · <Link to="/cases/1047">Case #1047</Link>
      </p>
    </main>
  )
}
