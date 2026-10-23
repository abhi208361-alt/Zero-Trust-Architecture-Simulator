type LoginPageProps = {
  onLogin: (username: string, password: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function LoginPage({ onLogin, loading, error }: LoginPageProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') ?? '')
    const password = String(formData.get('password') ?? '')
    await onLogin(username, password)
  }

  return (
    <div className="auth-wrap">
      <div className="panel auth-panel">
        <span className="eyebrow">Secure sign in</span>
        <h1>Access the simulator</h1>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Username
            <input name="username" defaultValue="admin" required />
          </label>
          <label>
            Password
            <input name="password" type="password" defaultValue="admin123!" required />
          </label>
          {error ? <div className="message error">{error}</div> : null}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Demo accounts</strong>
          <span>viewer / viewer123!</span>
          <span>analyst / analyst123!</span>
          <span>admin / admin123!</span>
        </div>
      </div>
    </div>
  )
}