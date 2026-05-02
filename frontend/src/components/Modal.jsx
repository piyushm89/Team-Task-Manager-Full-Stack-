import { useEffect } from 'react';

// reusable modal component
export default function Modal({ open, onClose, title, children, footer }) {
  // close modal when user presses Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e) {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // don't render if modal is closed
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="card w-full max-w-md p-5">
        {title && (
          <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
        )}
        <div>{children}</div>
        {footer && (
          <div className="mt-4 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
