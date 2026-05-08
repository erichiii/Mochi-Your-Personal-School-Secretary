import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="rounded-2xl shadow-xl px-6 py-5 flex flex-col gap-4"
        style={{
          background: 'var(--mochi-surface)',
          border: '1.5px solid var(--mochi-border)',
          width: '320px',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#E0505022', border: '1.5px solid #E0505044' }}
          >
            <Trash2 size={14} style={{ color: '#E05050' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--mochi-text)' }}>{title}</p>
            {message && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>{message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              color: 'var(--mochi-text-soft)',
              border: '1.5px solid var(--mochi-border)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: '#E0505018',
              color: '#E05050',
              border: '1.5px solid #E0505044',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E0505030')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#E0505018')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
