"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  interval: number;
  initialData?: T;
}

interface UsePollingResult<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  lastUpdated: number | null;
  refetch: () => void;
  dataVersion: number;
}

export function usePolling<T>({ fetcher, interval, initialData }: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialData ? Date.now() : null);
  const [dataVersion, setDataVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData((prev) => {
        const newJson = JSON.stringify(result);
        const oldJson = JSON.stringify(prev);
        if (newJson !== oldJson) {
          setDataVersion((v) => v + 1);
          return result;
        }
        return prev;
      });
      setError(null);
      setLastUpdated(Date.now());
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err.message || "Fetch failed");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    doFetch(false);
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;
    doFetch(!initialData);
    const id = setInterval(() => doFetch(false), interval);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [interval, doFetch, initialData]);

  return { data, error, loading, lastUpdated, refetch, dataVersion };
}
