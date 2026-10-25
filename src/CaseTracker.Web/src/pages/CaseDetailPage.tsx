import { Link, useParams } from 'react-router'

export default function CaseDetailPage() {
  const { id } = useParams()
  return (
    <main>
      <Link to="/">‹ Cases</Link>
      <h1>Case #{id}</h1>
    </main>
  )
}
