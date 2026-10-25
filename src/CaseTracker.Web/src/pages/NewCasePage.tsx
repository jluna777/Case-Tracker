import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError, createCase } from '../api.ts'
import BackLink from '../components/BackLink.tsx'
import { useAgent } from '../context/AgentContext.tsx'
import { formatHoursFromNow, formatPreviewDue } from '../format.ts'
import {
  AGENTS, CATEGORIES, CATEGORY_LABELS, CUSTOMERS, PRIORITIES, PRIORITY_HOURS,
  type Category, type Priority,
} from '../types.ts'

function FieldError({ errors, name }: { errors: Record<string, string[]>, name: string }) {
  const messages = errors[name]
  if (!messages?.length) return null
  return <p id={`${name}-error`} className="error-text field-error">{messages[0]}</p>
}

function Required() {
  return <span className="required" aria-hidden="true">*</span>
}

export default function NewCasePage() {
  const navigate = useNavigate()
  const { agent } = useAgent()
  const [title, setTitle] = useState('')
  const [customer, setCustomer] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  // Set once from the acting agent; switching agents later shouldn't overwrite a choice made here.
  const [assignee, setAssignee] = useState(agent)
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const hours = PRIORITY_HOURS[priority]
  const previewDue = new Date(Date.now() + hours * 60 * 60 * 1000)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const created = await createCase({
        title,
        customer: customer || null,
        category: (category || null) as Category | null,
        priority,
        assignee: assignee || null,
        description: description || null,
        actor: agent,
      })
      navigate(`/cases/${created.id}`)
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors : {}
      setFieldErrors(fields)
      // The acting agent has no field on this form, so its error shows with the general ones.
      const shownInline = Object.keys(fields).some(k => k !== 'actor')
      setFormError(fields.actor?.[0] ?? (shownInline ? null : (err as Error).message))
      setSaving(false)
    }
  }

  // A fixed field shouldn't keep showing the error from the last submit.
  function clearError(name: string) {
    if (!fieldErrors[name]) return
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function describedBy(name: string) {
    return fieldErrors[name] ? `${name}-error` : undefined
  }

  return (
    <main className="form-page">
      <BackLink />
      <div>
        <h1>New case</h1>
        <p className="muted form-intro">New cases start in status New. Fields marked <span className="required">*</span> are required.</p>
      </div>

      <form className="card case-form" onSubmit={submit} noValidate>
        <div>
          <label className="form-label" htmlFor="title">Title <Required /></label>
          <input
            id="title"
            className="input"
            type="text"
            maxLength={120}
            value={title}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={describedBy('title')}
            onChange={e => { setTitle(e.target.value); clearError('title') }}
          />
          <FieldError errors={fieldErrors} name="title" />
        </div>

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="customer">Customer <Required /></label>
            <select
              id="customer"
              className="input"
              value={customer}
              aria-invalid={Boolean(fieldErrors.customer)}
              aria-describedby={describedBy('customer')}
              onChange={e => { setCustomer(e.target.value); clearError('customer') }}
            >
              <option value="">Choose a customer…</option>
              {CUSTOMERS.map(c => <option key={c}>{c}</option>)}
            </select>
            <FieldError errors={fieldErrors} name="customer" />
          </div>
          <div>
            <label className="form-label" htmlFor="category">Category <Required /></label>
            <select
              id="category"
              className="input"
              value={category}
              aria-invalid={Boolean(fieldErrors.category)}
              aria-describedby={describedBy('category')}
              onChange={e => { setCategory(e.target.value); clearError('category') }}
            >
              <option value="">Choose a category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <FieldError errors={fieldErrors} name="category" />
          </div>
        </div>

        <fieldset className="priority-field" aria-describedby={describedBy('priority')}>
          <legend className="form-label">Priority <Required /></legend>
          <div className="segments">
            {PRIORITIES.map(p => (
              <label key={p} className={p === priority ? 'segment segment-on' : 'segment'}>
                <input type="radio" name="priority" value={p} checked={p === priority} onChange={() => { setPriority(p); clearError('priority') }} />
                <span className={`priority-dot priority-${p}`} />
                {p}
              </label>
            ))}
          </div>
          <div className="due-preview">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#4F46E5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg>
            <span>
              Due <b>{formatPreviewDue(previewDue)}</b> · {formatHoursFromNow(hours)} ({priority})
              <br />
              <span className="muted">High = 24 hours · Medium = 3 days · Low = 5 days</span>
            </span>
          </div>
          <FieldError errors={fieldErrors} name="priority" />
        </fieldset>

        <div className="assignee-field">
          <label className="form-label" htmlFor="assignee">Assignee</label>
          <select
            id="assignee"
            className="input"
            value={assignee}
            aria-invalid={Boolean(fieldErrors.assignee)}
            aria-describedby={describedBy('assignee')}
            onChange={e => { setAssignee(e.target.value); clearError('assignee') }}
          >
            <option value="">Unassigned</option>
            {AGENTS.map(a => <option key={a}>{a}</option>)}
          </select>
          <FieldError errors={fieldErrors} name="assignee" />
        </div>

        <div>
          <label className="form-label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="input"
            rows={5}
            maxLength={2000}
            value={description}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={describedBy('description')}
            onChange={e => { setDescription(e.target.value); clearError('description') }}
          />
          <FieldError errors={fieldErrors} name="description" />
        </div>

        {formError && <p className="error-text form-error" role="alert">{formError}</p>}

        <div className="form-actions">
          <Link to="/" className="btn btn-secondary">Cancel</Link>
          <button type="submit" className="btn" disabled={saving}>Create case</button>
        </div>
      </form>
    </main>
  )
}
