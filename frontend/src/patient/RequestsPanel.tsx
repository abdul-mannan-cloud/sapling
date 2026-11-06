import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../socket/SocketContext';
import type { HandoffRecord } from '../types';

export function RequestsPanel() {
  const socket = useSocket();
  const [records, setRecords] = useState<HandoffRecord[]>([]);
  const [filter, setFilter] = useState<'appointment_request' | 'refill'>('appointment_request');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const refresh = () => api.myRequests().then(setRecords).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!socket) return;
    const update = () => { void refresh(); };
    socket.on('conversation_updated', update);
    socket.on('connect', update);
    socket.on('requests_updated', update);
    return () => { socket.off('conversation_updated', update); socket.off('connect', update); socket.off('requests_updated', update); };
  }, [socket]);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); setEditing(null); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section className="chat-column requests-panel">
    <div className="chat-header"><span className="chat-header-title">My appointments & refills</span></div>
    <div className="request-content">
      <p>Track your requests and confirmed bookings. Changes to a booking go back to staff for approval.</p>
      <div className="request-tabs" role="tablist" aria-label="Request type">
        <button role="tab" aria-selected={filter === 'appointment_request'} className={`btn ${filter === 'appointment_request' ? 'dark' : 'ghost'}`} onClick={() => setFilter('appointment_request')}>Appointments</button>
        <button role="tab" aria-selected={filter === 'refill'} className={`btn ${filter === 'refill' ? 'dark' : 'ghost'}`} onClick={() => setFilter('refill')}>Refills</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p>Loading requests…</p> : !records.some((r) => r.type === filter) ? <p>No {filter === 'refill' ? 'refill requests' : 'appointments'} yet. Start a chat to request one.</p> : null}
      {records.filter((r) => r.type === filter).map((r) => <article className="request-card" key={r.id}>
        <div className="request-card-heading"><h3>{String(r.details.reason ?? r.details.medication ?? (r.type === 'refill' ? 'Refill request' : 'Appointment'))}</h3><span className="chip">{r.status === 'resolved' ? (r.type === 'refill' ? 'Completed' : 'Confirmed') : r.status === 'cancelled' ? 'Cancelled' : 'Pending staff review'}</span></div>
        {editing === r.id ? <form onSubmit={(e) => { e.preventDefault(); void act(() => api.editMyRequest(r.id, draft)); }}>
          {(r.type === 'refill' ? ['medication', 'pharmacy'] : ['reason', 'date', 'window', 'provider']).map((field) => <label className="request-field" key={field}>{field === 'window' ? 'Preferred time' : field.charAt(0).toUpperCase() + field.slice(1)}
            {field === 'window' ? <select required value={draft[field] ?? ''} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}><option value="">Choose a time</option>{['morning', 'afternoon', 'evening'].map((w) => <option key={w}>{w}</option>)}</select> : <input required type={field === 'date' ? 'date' : 'text'} value={draft[field] ?? ''} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />}
          </label>)}
          <div className="request-tabs"><button className="btn dark small" disabled={busy}>Submit changes for review</button><button type="button" className="btn ghost small" onClick={() => setEditing(null)}>Discard</button></div>
        </form> : <>
          <dl>{Object.entries(r.details).filter(([, v]) => v != null && v !== '').map(([k, v]) => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{String(v)}</dd></div>)}</dl>
          <small>Updated {new Date(r.updatedAt).toLocaleString()}</small>
          {r.status !== 'cancelled' && <div className="request-tabs">
            <button className="btn ghost small" disabled={busy} onClick={() => { setEditing(r.id); setDraft(Object.fromEntries(Object.entries(r.details).map(([k, v]) => [k, String(v ?? '')]))); }}>Update</button>
            <button className="btn ghost small" disabled={busy} onClick={() => { if (window.confirm('Cancel this request or booking? This will notify the clinic.')) void act(() => api.cancelMyRequest(r.id)); }}>Cancel booking / request</button>
          </div>}
        </>}
      </article>)}
    </div>
  </section>;
}
