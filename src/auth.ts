const DEFAULT_SSO_LOGIN_URL = 'http://localhost:5173/login'
const SSO_LOGIN_URL = import.meta.env.VITE_UMS_SSO_LOGIN_URL ?? DEFAULT_SSO_LOGIN_URL
const CLIENT_ID = import.meta.env.VITE_LMS_CLIENT_ID ?? 'lms-app'
const SESSION_STORAGE_KEY = 'lms-app-session'
const STATE_STORAGE_KEY = 'lms-app-sso-state'

export type LmsSession = {
  username: string
  client_id: string
  authenticatedAt: number
}

export function getClientId() {
  return CLIENT_ID
}

export function getRedirectUri() {
  const configuredRedirectUri = import.meta.env.VITE_LMS_REDIRECT_URI

  if (configuredRedirectUri) {
    return configuredRedirectUri
  }

  return new URL(buildAppPath('/auth/callback'), window.location.origin).toString()
}

export function createStateValue() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export function setPendingState(state: string) {
  window.localStorage.setItem(STATE_STORAGE_KEY, state)
}

export function getPendingState() {
  return window.localStorage.getItem(STATE_STORAGE_KEY)
}

export function clearPendingState() {
  window.localStorage.removeItem(STATE_STORAGE_KEY)
}

export function getSession(): LmsSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as LmsSession
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function isAuthenticated() {
  const session = getSession()
  return Boolean(session?.username && session?.client_id === CLIENT_ID)
}

export function setSession(session: LmsSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  clearPendingState()
}

export function buildSsoLoginUrl(state: string) {
  const url = new URL(SSO_LOGIN_URL)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', getRedirectUri())
  url.searchParams.set('state', state)
  return url.toString()
}

export function redirectToSso() {
  const state = getPendingState() ?? createStateValue()
  setPendingState(state)
  window.location.assign(buildSsoLoginUrl(state))
}

export function validateCallbackParams(params: {
  ums_login: string | null
  client_id: string | null
  username: string | null
  state: string | null
}) {
  if (params.ums_login !== 'success') {
    return false
  }

  if (params.client_id !== CLIENT_ID) {
    return false
  }

  if (!params.username || !params.state) {
    return false
  }

  return params.state === getPendingState()
}

function buildAppPath(routePath: string) {
  const basePath = getAppBasePath()

  if (!basePath) {
    return routePath
  }

  return `${basePath}${routePath}`
}

function getAppBasePath() {
  const configuredBasePath = normalizeBasePath(import.meta.env.VITE_LMS_BASE_PATH)

  if (configuredBasePath !== null) {
    return configuredBasePath
  }

  const viteBasePath = normalizeBasePath(import.meta.env.BASE_URL)

  if (viteBasePath) {
    return viteBasePath
  }

  return inferBasePath(window.location.pathname)
}

function inferBasePath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const knownRoutes = ['/auth/callback', '/dashboard', '/login']

  for (const routePath of knownRoutes) {
    if (normalizedPathname === routePath) {
      return ''
    }

    if (normalizedPathname.endsWith(routePath)) {
      return normalizedPathname.slice(0, -routePath.length)
    }
  }

  return normalizedPathname === '/' ? '' : normalizedPathname
}

function normalizeBasePath(value: string | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  if (!trimmedValue || trimmedValue === '/') {
    return ''
  }

  return `/${trimmedValue.replace(/^\/+|\/+$/g, '')}`
}
