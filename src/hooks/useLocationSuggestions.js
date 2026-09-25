import { useCallback, useEffect, useState } from 'react';
import {
  getLocalLocationSuggestions,
  searchLocations,
} from '../services/geocodingService';

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export default function useLocationSuggestions(query, { enabled = true } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const normalizedQuery = String(query || '').trim();

    if (!enabled || normalizedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setError('');

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      const localResults = getLocalLocationSuggestions(normalizedQuery);
      if (localResults.length > 0) {
        setSuggestions(localResults);
      }

      try {
        const results = await searchLocations(normalizedQuery, {
          signal: controller.signal,
          limit: 6,
        });

        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      } catch (requestError) {
        if (requestError?.name !== 'AbortError' && !controller.signal.aborted) {
          setSuggestions([]);
          setError('No pudimos buscar ubicaciones. Revisa tu conexión e inténtalo nuevamente.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, requestVersion]);

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    suggestions,
    isSearching,
    error,
    retry,
  };
}
