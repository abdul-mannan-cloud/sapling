import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Logo, SaplingMark } from '../components/Logo';

export function LoginPage() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  return (
    <div className="login-screen">
      <aside className="login-brand">
        <Logo theme="dark" size={26} sub="Family Clinic" />
        <div className="login-brand-copy">
          <h2>
            Patient messaging,
            <br />
            handled end&nbsp;to&nbsp;end.
          </h2>
          <p>
            The agent answers what the patient record and clinic FAQ already cover. Everything else lands in the staff
            queue with the details needed to act — no phone tag, no duplicate asks.
          </p>
        </div>
        <div className="login-brand-foot">
          <SaplingMark size={14} />
          Texts are read during business hours and are not monitored continuously.
        </div>
      </aside>

      <div className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h1>Sign in</h1>
          <p className="login-subtitle">Sapling Family Clinic internal tool</p>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn dark" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="login-hint">
            Demo accounts
            <br />
            <code>admin / admin123</code> staff · <code>alex / alex123</code> patient
          </div>
        </form>
      </div>
    </div>
  );
}
