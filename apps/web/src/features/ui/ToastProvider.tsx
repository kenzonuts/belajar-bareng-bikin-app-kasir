import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext } from './toast-context';

type ToastItem = { id: number; message: string };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="ui-toast-viewport" aria-live="polite">
          {items.map((item) => (
            <div key={item.id} className="ui-toast">
              {item.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
