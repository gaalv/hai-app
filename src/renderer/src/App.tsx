import { useState, useEffect } from 'react'
import { QuickCapture } from './windows/QuickCapture'
import { LoginScreen } from './components/layout/LoginScreen'
import { RepoSetupScreen } from './components/layout/RepoSetupScreen'
import { AppLayout } from './components/layout/AppLayout'
import { useAuthStore } from './stores/auth.store'
import type { GitHubProfile } from './types/auth'

type Screen = 'checking' | 'login' | 'repo-setup' | 'app'
type Tab = 'notebooks' | 'search' | 'tags' | 'pins'

function App(): JSX.Element {
  if (window.location.hash === '#quick-capture') {
    return <QuickCapture />
  }

  const [screen, setScreen] = useState<Screen>('checking')
  const [tab, setTab] = useState<Tab>('notebooks')
  const { setProfile, logout } = useAuthStore()

  useEffect(() => {
    async function init(): Promise<void> {
      try {
        const token = await window.electronAPI.auth.getToken()
        if (!token) {
          setScreen('login')
          return
        }

        const profile = await window.electronAPI.auth.getProfile()
        if (!profile) {
          setScreen('login')
          return
        }
        setProfile(profile)

        const repoConfig = await window.electronAPI.repo.getConfig()
        if (!repoConfig) {
          setScreen('repo-setup')
          return
        }

        setScreen('app')
      } catch {
        setScreen('login')
      }
    }

    init()

    // Listen for auth changes (e.g. logout from another window)
    window.electronAPI.onAuthChanged((event) => {
      if (event === 'logout') {
        logout()
        setScreen('login')
      }
    })
  }, [])

  function handleLogin(profile: GitHubProfile): void {
    setProfile(profile)
    // After login, check if repo is configured
    window.electronAPI.repo.getConfig().then((repoConfig) => {
      setScreen(repoConfig ? 'app' : 'repo-setup')
    }).catch(() => {
      setScreen('repo-setup')
    })
  }

  function handleLogout(): void {
    window.electronAPI.auth.logout()
    logout()
    setScreen('login')
  }

  if (screen === 'checking') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--app-main)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--app-accent)',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      </div>
    )
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (screen === 'repo-setup') {
    return <RepoSetupScreen onSetup={() => setScreen('app')} />
  }

  return (
    <AppLayout
      tab={tab}
      setTab={setTab}
      onLogout={handleLogout}
    />
  )
}

export default App
