import { useEffect, useRef } from 'react'
import { parseGoogleJwt, setGoogleIdentity, clearGoogleIdentity, type GoogleProfile } from '../utils/identity'

interface Props {
  onSignIn: (profile: GoogleProfile) => void
  onSignOut: () => void
  signedIn: boolean
  googleProfile?: GoogleProfile
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string
            callback: (resp: { credential: string }) => void
            auto_select?: boolean
          }) => void
          renderButton: (el: HTMLElement, opts: object) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

export default function GoogleSignInButton({ onSignIn, onSignOut, signedIn, googleProfile }: Props) {
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!CLIENT_ID || signedIn) return

    function init() {
      if (!window.google || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID!,
        callback: (response) => {
          try {
            const profile = parseGoogleJwt(response.credential)
            setGoogleIdentity(profile)
            onSignIn(profile)
          } catch {
            console.error('Failed to parse Google credential')
          }
        },
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'small',
        text: 'signin_with',
        shape: 'pill',
      })
    }

    // Google script may already be loaded
    if (window.google) {
      init()
    } else {
      // Wait for script to load
      const script = document.querySelector('script[src*="accounts.google.com/gsi"]')
      if (script) {
        script.addEventListener('load', init, { once: true })
      }
    }
  }, [CLIENT_ID, signedIn, onSignIn])

  if (!CLIENT_ID) return null

  if (signedIn && googleProfile) {
    return (
      <div className="flex items-center gap-2">
        {googleProfile.picture && (
          <img
            src={googleProfile.picture}
            alt={googleProfile.name}
            className="w-5 h-5 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="font-mono text-[10px] text-void-500 truncate max-w-[120px]">
          {googleProfile.email}
        </span>
        <button
          onClick={() => { clearGoogleIdentity(); onSignOut() }}
          className="font-mono text-[10px] text-void-700 hover:text-red-400 transition-colors"
          title="Sign out from Google"
        >
          sign out
        </button>
      </div>
    )
  }

  return (
    <div ref={btnRef} className="scale-90 origin-left" />
  )
}
