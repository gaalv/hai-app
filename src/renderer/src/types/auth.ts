export interface GitHubProfile {
  login: string
  name: string | null
  avatar_url: string
  email: string | null
  bio: string | null
}

export interface AuthState {
  token: string | null
  profile: GitHubProfile | null
}
