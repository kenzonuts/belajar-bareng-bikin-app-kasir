import { createContext } from 'react';

type ToastContextValue = {
  toast: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
