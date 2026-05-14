import { useState } from 'react'

const SIZE = 160
const CX = 80
const CY = 80
const R = 56
const STROKE = 15
const C = 2 * Math.PI * R

const LEGENDS = [
  { key: 'total',     label: 'Total',       color: 'var(--mochi-text-muted)' },
  { key: 'done',      label: 'Done',        color: 'var(--mochi-mint-mid)'   },
  { key: 'remaining', label: 'Not started', color: 'var(--mochi-border)'     },
]

export default function TaskProgress({ tasks }) {
  const [filter, setFilter] = useState('total')

  const total     = tasks.length
  const done      = tasks.filter((t) => t.isDone).length
  const remaining = total - done

  const centerValue = filter === 'done' ? done : filter === 'remaining' ? remaining : total
  const centerLabel = filter === 'done' ? 'Done' : filter === 'remaining' ? 'Remaining' : 'Total'

  const doneLen = total > 0 ? (done / total) * C : 0

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full py-1">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Track — represents "not started" */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--mochi-border)"
            strokeWidth={STROKE}
          />
          {/* Done arc */}
          {doneLen > 0 && (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="var(--mochi-mint-mid)"
              strokeWidth={STROKE}
              strokeDasharray={`${doneLen} ${C}`}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--mochi-text)', lineHeight: 1 }}>
            {centerValue}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--mochi-text-muted)', marginTop: '4px' }}>
            {centerLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {LEGENDS.map(({ key, label, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="flex items-center gap-1.5"
            style={{
              fontSize: '11px',
              fontWeight: filter === key ? 700 : 400,
              color: filter === key ? 'var(--mochi-text)' : 'var(--mochi-text-muted)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: color,
                boxShadow: filter === key ? `0 0 0 2px var(--mochi-surface), 0 0 0 3.5px ${color}` : 'none',
              }}
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
