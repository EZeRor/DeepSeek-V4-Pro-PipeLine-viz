import type { ReactNode } from 'react'
import { SYMBOLS, type PipelineNode } from '@/data/pipeline'
import { QuantBadgeRow } from './QuantBadge'
import { cn } from '@/lib/utils'

/** 从节点的形状描述里挑出实际出现过的符号，给出对应图例 */
function usedSymbols(node: PipelineNode) {
  const text = [...node.inputs, ...node.outputs].map((t) => t.shape).join(' ')
  return SYMBOLS.filter((s) => text.includes(s.symbol))
}

interface NodeCardProps {
  node: PipelineNode
  selected?: boolean
  /** decode 模式下 KV 相关节点高亮 */
  kvActive?: boolean
  size?: 'lg' | 'md' | 'sm'
  /** 动态附加标注（如当前层注意力类型） */
  extra?: ReactNode
  dimmed?: boolean
  onClick?: () => void
}

export function NodeCard({
  node,
  selected,
  kvActive,
  size = 'md',
  extra,
  dimmed,
  onClick,
}: NodeCardProps) {
  const symbols = usedSymbols(node)
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full rounded-lg border bg-card text-left transition-all duration-200',
          'hover:-translate-y-0.5 hover:scale-[1.015] hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10',
          size === 'lg' && 'px-5 py-4',
          size === 'md' && 'px-4 py-3',
          size === 'sm' && 'px-3 py-2',
          selected && 'border-primary ring-2 ring-primary/40',
          kvActive && 'border-amber-400/60 ring-2 ring-amber-400/30 shadow-[0_0_18px_-4px] shadow-amber-400/40',
          dimmed && 'opacity-45',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                'truncate font-medium text-card-foreground',
                size === 'lg' ? 'text-base' : size === 'md' ? 'text-sm' : 'text-[13px]',
              )}
            >
              {node.label}
              {node.kv && (
                <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px font-mono text-[9px] text-amber-300 align-middle">
                  KV
                </span>
              )}
            </div>
            {node.subtitle && (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{node.subtitle}</div>
            )}
            {extra}
          </div>
          <QuantBadgeRow quants={node.quant} className="shrink-0" />
        </div>
      </button>

      {/* Hover tooltip：输入/输出张量 + 符号图例 */}
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 w-80 max-w-[92vw] -translate-x-1/2',
          'rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl',
          'opacity-0 transition-all duration-150 group-hover:opacity-100',
          'translate-y-1 group-hover:translate-y-0',
        )}
      >
        <div className="mb-1.5 text-xs font-semibold">{node.label}</div>
        <TensorBlock title="输入" tensors={node.inputs} />
        <TensorBlock title="输出" tensors={node.outputs} />
        {symbols.length > 0 && (
          <div className="mt-2 border-t pt-1.5">
            <div className="mb-1 text-[10px] font-medium text-muted-foreground">符号图例</div>
            <div className="space-y-0.5">
              {symbols.slice(0, 5).map((s) => (
                <div key={s.symbol} className="text-[10px] leading-4 text-muted-foreground">
                  <span className="font-mono text-foreground">{s.symbol}</span> = {s.meaning}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-1.5 text-[10px] text-muted-foreground/70">点击查看完整详情</div>
      </div>
    </div>
  )
}

function TensorBlock({
  title,
  tensors,
}: {
  title: string
  tensors: PipelineNode['inputs']
}) {
  return (
    <div className="mt-1">
      <div className="text-[10px] font-medium text-muted-foreground">{title}</div>
      <div className="mt-0.5 space-y-0.5">
        {tensors.map((t, i) => (
          <div key={i} className="rounded bg-muted/50 px-1.5 py-1 text-[10px] leading-4">
            <span className="font-medium">{t.name}</span>{' '}
            <span className="font-mono text-sky-300">{t.shape}</span>{' '}
            <span className="font-mono text-emerald-300">{t.dtype}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 节点之间的纵向连接箭头 */
export function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="h-4 w-px bg-border" />
      {label && (
        <span className="my-0.5 rounded bg-muted px-1.5 py-px font-mono text-[10px] text-muted-foreground">
          {label}
        </span>
      )}
      <svg width="10" height="6" viewBox="0 0 10 6" className="text-border">
        <path d="M0 0 L5 6 L10 0" fill="currentColor" />
      </svg>
    </div>
  )
}
