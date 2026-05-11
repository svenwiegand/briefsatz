import { useEffect, useState } from 'react'

/**
 * Wrap a `Blob` in an object URL with automatic revocation. The URL
 * is recreated whenever `blob` identity changes and revoked on unmount.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}
