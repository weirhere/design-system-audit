'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

interface UseSSEOptions {
  url: string | null;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Event) => void;
}

export function useSSE({ url, onEvent, onError }: UseSSEOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);

  onEventRef.current = onEvent;
  onErrorRef.current = onError;

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = (e) => {
      try {
        const parsed: SSEEvent = JSON.parse(e.data);
        setLastEvent(parsed);
        onEventRef.current?.(parsed);
      } catch {
        // Non-JSON message, treat as plain text
        const event: SSEEvent = { type: 'message', data: { message: e.data } };
        setLastEvent(event);
        onEventRef.current?.(event);
      }
    };

    source.onerror = (e) => {
      onErrorRef.current?.(e);
      if (source.readyState === EventSource.CLOSED) {
        setConnected(false);
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [url]);

  return { connected, lastEvent, disconnect };
}
