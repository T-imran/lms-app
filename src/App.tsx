import { useEffect, useState } from 'react'
import './App.css'
import {
  clearPendingState,
  clearSession,
  getClientId,
  getPendingState,
  getRedirectUri,
  getSession,
  isAuthenticated,
  redirectToSso,
  setSession,
  type LmsSession,
  validateCallbackParams,
} from './auth'

type AppRoute = 'login' | 'callback' | 'dashboard'

function App() {
  const [route, setRoute] = useState<AppRoute>(() => getCurrentRoute())
  const [session, setCurrentSession] = useState<LmsSession | null>(() => getSession())
  const [callbackMessage, setCallbackMessage] = useState('Processing authentication response...')

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getCurrentRoute())
      setCurrentSession(getSession())
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)

    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    if (route === 'login') {
      if (isAuthenticated()) {
        navigateTo('/dashboard')
        return
      }

      redirectToSso()
    }
  }, [route])

  useEffect(() => {
    if (route !== 'callback') {
      return
    }

    if (isAuthenticated()) {
      navigateTo('/dashboard')
      return
    }

    const params = new URLSearchParams(window.location.search)
    const payload = {
      ums_login: params.get('ums_login'),
      username: params.get('username'),
      client_id: params.get('client_id'),
      state: params.get('state'),
    }

    if (validateCallbackParams(payload)) {
      setSession({
        username: payload.username ?? 'Learner',
        client_id: payload.client_id ?? getClientId(),
        authenticatedAt: Date.now(),
      })
      clearPendingState()
      setCurrentSession(getSession())
      navigateTo('/dashboard')
      return
    }

    clearSession()
    setCurrentSession(null)
    setCallbackMessage('Authentication failed or state mismatch. Redirecting to UMS SSO...')

    const timeout = window.setTimeout(() => {
      redirectToSso()
    }, 600)

    return () => window.clearTimeout(timeout)
  }, [route])

  if (route === 'callback') {
    return (
      <StatusScreen
        title="Completing LMS sign-in"
        description={callbackMessage}
        meta={[
          ['Client ID', getClientId()],
          ['Redirect URI', getRedirectUri()],
          ['State', getPendingState() ?? 'No pending state found'],
        ]}
      />
    )
  }

  if (route === 'login') {
    return (
      <StatusScreen
        title="Redirecting to UMS SSO"
        description="Please wait while LMS sends you to the central UMS login page."
        meta={[
          ['Client ID', getClientId()],
          ['Redirect URI', getRedirectUri()],
          ['State', getPendingState() ?? 'Preparing secure login state'],
        ]}
      />
    )
  }

  if (!session || !isAuthenticated()) {
    navigateTo('/login')
    return null
  }

  return <Dashboard session={session} onLogout={() => handleLogout(setCurrentSession)} />
}

function Dashboard(props: { session: LmsSession; onLogout: () => void }) {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Learning Management</p>
          <h1>LMS dashboard is now protected by UMS SSO.</h1>
          <p className="lede">
            This module app uses the shared UMS sign-in page, then returns learners here after the
            Keycloak-backed session is confirmed.
          </p>
        </div>
        <div className="hero-card">
          <span className="card-label">Signed in as</span>
          <strong>{props.session.username}</strong>
          <p>Client: {props.session.client_id}</p>
          <p>Authenticated: {new Date(props.session.authenticatedAt).toLocaleString()}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <p className="panel-kicker">Modules</p>
          <h2>Course Operations</h2>
          <p>
            Manage enrollments, learning tracks, content publishing, and learner access from one
            protected workspace.
          </p>
        </article>

        <article className="panel">
          <p className="panel-kicker">SSO Flow</p>
          <h2>Central Login Active</h2>
          <p>
            LMS now trusts the central UMS SSO page for login and validates the callback using the
            shared `client_id`, `redirect_uri`, and `state` contract.
          </p>
        </article>

        <article className="panel">
          <p className="panel-kicker">Security</p>
          <h2>Session Guard</h2>
          <p>
            If the LMS session is missing or invalid, the app immediately redirects back to the UMS
            login page instead of exposing module content.
          </p>
        </article>
      </section>

      <section className="footer-bar">
        <div>
          <p className="footer-title">Connected application</p>
          <p className="footer-copy">Use the central UMS realm for authentication across module apps.</p>
        </div>
        <button type="button" className="logout-button" onClick={props.onLogout}>
          Logout
        </button>
      </section>
    </main>
  )
}

function StatusScreen(props: {
  title: string
  description: string
  meta: Array<[string, string]>
}) {
  return (
    <main className="status-shell">
      <section className="status-card">
        <p className="eyebrow">UMS Connected App</p>
        <h1>{props.title}</h1>
        <p className="lede">{props.description}</p>

        <div className="meta-grid">
          {props.meta.map(([label, value]) => (
            <div key={label} className="meta-item">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function handleLogout(setCurrentSession: (session: LmsSession | null) => void) {
  clearSession()
  setCurrentSession(null)
  navigateTo('/login')
}

function getCurrentRoute(): AppRoute {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/' || pathname.endsWith('/dashboard')) {
    return 'dashboard'
  }

  if (pathname.endsWith('/auth/callback')) {
    return 'callback'
  }

  return 'login'
}

function navigateTo(routePath: string) {
  const target = new URL(routePath, window.location.origin)
  const currentPath = `${window.location.pathname}${window.location.search}`
  const nextPath = `${target.pathname}${target.search}`

  if (currentPath === nextPath) {
    return
  }

  window.history.replaceState({}, '', nextPath)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default App
