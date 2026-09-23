import { QUANT_INFO, type QuantKey } from '@/data/pipeline'
import { cn } from '@/lib/utils'

export function QuantBadge({ q, className }: { q: QuantKey; className?: string }) {
  const info = QUANT_INFO[q]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1 py-px font-mono text-[10px] leading-4',
        info.badge,
        className,
      )}
      title={info.label}
    >
      {info.short}
    </span>
  )
}

export function QuantBadgeRow({ quants, className }: { quants: QuantKey[]; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {quants.map((q) => (
        <QuantBadge key={q} q={q} />
      ))}
    </span>
  )
}
