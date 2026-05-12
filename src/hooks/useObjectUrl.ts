import { useEffect, useMemo } from 'react'

/**
 * Wrap a `Blob` in an object URL with automatic revocation. The URL
 * is recreated whenever `blob` identity changes and revoked when the
 * URL changes or the component unmounts.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const url = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob],
  )

  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}
