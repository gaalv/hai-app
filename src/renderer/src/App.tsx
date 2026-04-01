import { useState, useEffect } from 'react'
import { QuickCapture } from './windows/QuickCapture'
import { LoginScreen } from './components/layout/LoginScreen'
import { RepoSetupScreen } from './components/layout/RepoSetupScreen'
import { AppLayout } from './components/layout/AppLayout'
import { ProfileModal } from './components/profile/ProfileModal'
import { useAuthStore } from './stores/auth.store'
import type { GitHubProfile } from './types/auth'

type Screen = 'checking' | 'login' | 'repo-setup' | 'app'
type Tab = 'notes' | 'notebooks' | 'search' | 'tags'

function App(): JSX.Element {
  if (window.location.hash === '#quick-capture') {
    return <QuickCapture />
  }

  const [screen, setScreen] = useState<Screen>('checking')
  const [tab, setTab] = useState<Tab>('notes')
  const [profileOpen, setProfileOpen] = useState(false)
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

        // Background pull to sync latest notes from GitHub
        window.electronAPI.sync.pull().catch(() => {
          // Silently ignore pull errors on startup
        })
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
      <div className="flex items-center justify-center min-h-screen bg-[var(--app-main)] font-sans">
        <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[var(--app-accent)] animate-spin" />
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
    <>
      <AppLayout
        tab={tab}
        setTab={setTab}
        onAvatarClick={() => setProfileOpen(true)}
      />
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}

export default App
