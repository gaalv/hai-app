/**
 * Hai GitHub App configuration.
 *
 * Set these environment variables before building:
 *   HAI_GITHUB_CLIENT_ID  — OAuth client_id from the Hai GitHub App
 *   HAI_GITHUB_APP_SLUG   — GitHub App slug (e.g. "hai-notes"), used for the install link
 *
 * In development you can create a personal OAuth App at github.com/settings/developers
 * and set HAI_GITHUB_CLIENT_ID in a .env file at the project root.
 */

export const GITHUB_APP_CLIENT_ID: string =
  (process.env.HAI_GITHUB_CLIENT_ID as string | undefined) ?? ''

export const GITHUB_APP_SLUG: string =
  (process.env.HAI_GITHUB_APP_SLUG as string | undefined) ?? 'hai-app'

export const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`
