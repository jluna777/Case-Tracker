import { useState, type FormEvent } from 'react'

interface Props {
  agent: string
  locked: boolean
  onAdd: (body: string) => Promise<void>
}

export default function AddNote({ agent, locked, onAdd }: Props) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onAdd(body)
      setBody('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={locked ? 'add-note add-note-locked' : 'add-note'} onSubmit={submit}>
      <label htmlFor="note">Add a note</label>
      <textarea
        id="note"
        rows={3}
        maxLength={2000}
        value={locked ? '' : body}
        disabled={locked || busy}
        placeholder={locked ? 'Reopen the case to add notes' : 'What changed, what you tried, what’s next…'}
        onChange={e => setBody(e.target.value)}
      />
      {error && <p className="error-text field-error">{error}</p>}
      <div className="add-note-footer">
        <span className="meta">{locked ? 'Notes are locked while a case is Closed' : `Posting as ${agent}`}</span>
        <button type="submit" className="btn" disabled={locked || busy || !body.trim()}>Add note</button>
      </div>
    </form>
  )
}
