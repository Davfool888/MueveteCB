import { useState, useRef, useCallback } from 'react';

/** Toast state + showToast helper */
export function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    clearTimeout(timerRef.current);
    setToast({ message, visible: true });
    timerRef.current = window.setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      3200
    );
  }, []);

  return { toast, showToast };
}
