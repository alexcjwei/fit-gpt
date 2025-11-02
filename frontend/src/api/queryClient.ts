import { QueryClient } from '@tanstack/react-query';

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time before cached data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes

      // Time before inactive queries are garbage collected
      gcTime: 1000 * 60 * 30, // 30 minutes

      // Retry failed requests
      retry: 2,

      // Retry delay (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus (useful for web, less for mobile)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations by default
      retry: 1,
    },
  },
});
