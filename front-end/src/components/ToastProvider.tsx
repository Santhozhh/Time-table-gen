import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (msg: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let counter = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = (id:number)=> setToasts(t=>t.filter(ts=>ts.id!==id));

  const showToast = useCallback((msg: string, type: Toast['type']='info')=>{
    const id = ++counter;
    setToasts(t=>[...t, {id,message:msg,type}]);
    setTimeout(()=>remove(id), 3000);
  },[]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 space-y-2">
        {toasts.map(t=> (
          <div key={t.id} className={`px-4 py-2 rounded shadow text-white animate-fade-in ${t.type==='success'?'bg-green-600': t.type==='error'?'bg-red-600':'bg-gray-700'}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 