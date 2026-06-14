import { usePathname, useSearchParams } from 'next/navigation';

export function useEventId() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Next.js build-time pre-rendering safety check
  if (!pathname) {
    return searchParams ? (searchParams.get('eventId') || 'default') : 'default';
  }

  // 1. Extract from the first segment of the pathname (e.g., /sws2026 -> sws2026)
  const segments = pathname.split('/').filter(Boolean);
  const reservedPaths = ['register', 'my-dashboard', 'poster', 'dashboard', 'admin'];

  if (segments.length > 0) {
    const firstSegment = segments[0];
    if (!reservedPaths.includes(firstSegment)) {
      return firstSegment;
    }
  }

  // 2. Fallback to the search query parameter if present
  return searchParams ? (searchParams.get('eventId') || 'default') : 'default';
}
