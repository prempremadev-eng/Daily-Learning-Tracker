import { useEffect, useState } from 'react'
import { getRecords, addRecord, updateRecord, deleteRecord } from './api.js'

// Today's date in local time as YYYY-MM-DD
const today = () => new Date().toLocaleDateString('en-CA')
const emptyForm = () => ({ date: today(), topic: '', description: '', status: 'In Progress' })

export default function App() {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null) // null = adding, id = editing
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true) // loading the list
  const [saving, setSaving] = useState(false) // add / update / delete in progress
  const [error, setError] = useState('')

  // Load records once when the page opens
  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    setLoading(true)
    setError('')
    try {
      const data = await getRecords()
      setRecords(data)
    } catch (err) {
      setError('Could not load records: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.topic.trim()) {
      setError('Topic is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await updateRecord(editingId, form)
      } else {
        await addRecord(form)
      }
      setForm(emptyForm())
      setEditingId(null)
      await loadRecords()
    } catch (err) {
      setError('Could not save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(record) {
    setEditingId(record.id)
    setForm({
      date: record.date,
      topic: record.topic,
      description: record.description,
      status: record.status
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this record?')) return
    setSaving(true)
    setError('')
    try {
      await deleteRecord(id)
      setRecords(records.filter((r) => r.id !== id))
    } catch (err) {
      setError('Could not delete: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const visibleRecords =
    filter === 'All' ? records : records.filter((r) => r.status === filter)

  return (
    <div className="container">
      <h1>📚 Daily Learning Tracker</h1>

      {/* ---------- Add / Edit form ---------- */}
      <form className="card" onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit Learning' : 'Add Learning'}</h2>

        <label>
          Date
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
        </label>

        <label>
          Topic
          <input
            type="text"
            name="topic"
            value={form.topic}
            onChange={handleChange}
            placeholder="e.g. React useState"
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="3"
            placeholder="What did you learn?"
          />
        </label>

        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>

        <div className="buttons">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {/* ---------- Records list ---------- */}
      <div className="card">
        <div className="list-header">
          <h2>My Learning ({visibleRecords.length})</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : visibleRecords.length === 0 ? (
          <p>No records yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Topic</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.topic}</td>
                  <td>{r.description}</td>
                  <td>
                    <span className={r.status === 'Completed' ? 'badge done' : 'badge progress'}>
                      {r.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="secondary" onClick={() => handleEdit(r)} disabled={saving}>
                      Edit
                    </button>
                    <button className="danger" onClick={() => handleDelete(r.id)} disabled={saving}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
