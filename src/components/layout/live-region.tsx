import { useEffect, useState } from 'react'

export function LiveRegion() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setMessage('')
      window.setTimeout(() => setMessage(detail), 20)
    }
    window.addEventListener('marketplace:announce', onAnnounce)
    return () => window.removeEventListener('marketplace:announce', onAnnounce)
  }, [])

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {message}
    </div>
  )
}
