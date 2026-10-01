import { Check } from 'lucide-react'

export function CircularProgress({
  value,
  size = 24,
  strokeWidth = 2.5,
  done = false,
  onClick,
  label,
}: {
  value: number
  size?: number
  strokeWidth?: number
  done?: boolean
  onClick?: () => void
  label?: string
}) {
  const clamped = Math.max(0, Math.min(1, value))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group/progress relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? 'var(--color-moss)' : 'var(--color-tomato)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>

      {done && (
        <span className="relative z-10 grid place-items-center text-white">
          <Check size={size * 0.55} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}