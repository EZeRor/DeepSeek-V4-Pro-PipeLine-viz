import { ChevronsDownUp, ChevronsUpDown, Hash, Sparkles } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import {
  LAYER_COUNTS,
  NUM_LAYERS,
  getLayerSummary,
  getVisibleLayerNodes,
  type Mode,
  type PipelineNode,
} from '@/data/pipeline'
import { NodeCard, Connector } from './NodeCard'
import { QuantBadgeRow } from './QuantBadge'
import { cn } from '@/lib/utils'

interface LayerBlockProps {
  layer: number
  onLayerChange: (l: number) => void
  expanded: boolean
  onToggle: () => void
  mode: Mode
  selectedId: string | null
  onSelectNode: (node: PipelineNode) => void
  outerNode: PipelineNode
}

export function LayerBlock({
  layer,
  onLayerChange,
  expanded,
  onToggle,
  mode,
  selectedId,
  onSelectNode,
  outerNode,
}: LayerBlockProps) {
  const summary = getLayerSummary(layer)
  const visibleNodes = getVisibleLayerNodes(layer)
  const kvActive = mode === 'decode'

  const extraFor = (id: string) => {
    if (id === 'compress')
      return (
        <div className="mt-1 text-[11px] font-medium text-sky-300">
          当前层：{summary.compressLabel} → {summary.entries}
        </div>
      )
    if (id === 'attention')
      return (
        <div className="mt-1 text-[11px] font-medium text-sky-300">
          {summary.attention === 'CSA'
            ? 'CSA 稀疏路径：128 头仅对 Top-1024 选中条目注意力'
            : 'HCA 稠密路径：128 头扫视全部压缩条目'}
        </div>
      )
    if (id === 'router')
      return (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-sky-300">
          {summary.router === 'hash' ? <Hash className="size-3" /> : <Sparkles className="size-3" />}
          {summary.routerLabel}
        </div>
      )
    return null
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-2 sm:p-3">
      {/* 可展开/收拢的大节点头 */}
      <div
        className={cn(
          'group relative cursor-pointer rounded-lg border bg-card px-4 py-3 transition-all duration-200',
          'hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10',
          expanded && 'border-primary/50',
          kvActive && 'ring-2 ring-amber-400/30',
        )}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              Transformer Block × 61
              <span className="rounded bg-amber-500/15 px-1 py-px font-mono text-[9px] text-amber-300">KV</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              30 层 CSA + {LAYER_COUNTS.hca} 层 HCA · 每层 = mHC ×2 + 注意力 + SWA + MoE（384 选 6 + 共享）
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">
              {expanded ? '点击收拢单层内部结构' : '点击展开单层内部结构，或点击右侧按钮查看整体详情'}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <QuantBadgeRow quants={outerNode.quant} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {expanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
              {expanded ? '收拢' : '展开'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background/60 p-3 sm:p-4">
          {/* 层选择器 + 当前层摘要 */}
          <div className="mb-3 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">
                第 <span className="font-mono text-lg text-primary">{layer}</span> / {NUM_LAYERS} 层
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 font-mono font-semibold',
                    summary.attention === 'CSA'
                      ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300'
                      : 'border-sky-500/50 bg-sky-500/10 text-sky-300',
                  )}
                >
                  {summary.attention}
                </span>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
                  压缩率 {summary.compressRatio}
                </span>
                {summary.topk && (
                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
                    Top-{summary.topk}
                  </span>
                )}
                <span className="rounded border border-border bg-muted px-1.5 py-0.5">
                  {summary.router === 'hash' ? 'Hash 路由' : '学习路由器'}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground">1</span>
              <Slider
                value={[layer]}
                min={1}
                max={NUM_LAYERS}
                step={1}
                onValueChange={(v) => onLayerChange(v[0])}
                className="flex-1"
              />
              <span className="font-mono text-[10px] text-muted-foreground">{NUM_LAYERS}</span>
              <input
                type="number"
                min={1}
                max={NUM_LAYERS}
                value={layer}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value))
                  if (v >= 1 && v <= NUM_LAYERS) onLayerChange(v)
                }}
                className="w-16 rounded-md border bg-background px-2 py-1 text-center font-mono text-sm"
              />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              排布规则：第 1–2 层与偶数层为 HCA（m′=128，稠密、无 indexer），奇数层 3–61 为 CSA（m=4、
              Lightning Indexer FP4、Top-1024）；前 3 层 Hash 路由，其余学习路由器。（官方 config.json
              compress_ratios / num_hash_layers）
            </div>
          </div>

          {/* 单层内部结构 */}
          <div className="mx-auto max-w-xl">
            {visibleNodes.map((node, i) => {
              const isSwa = node.id === 'swa'
              return (
                <div key={node.id}>
                  {i > 0 && !isSwa && <Connector />}
                  {isSwa && (
                    <div className="my-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <span>∥ 与压缩注意力主分支并行</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className={cn(isSwa && 'ml-6 border-l-2 border-dashed border-border pl-3 sm:ml-10 sm:pl-4')}>
                    <NodeCard
                      node={node}
                      size="sm"
                      kvActive={kvActive && node.kv}
                      selected={selectedId === node.id}
                      extra={extraFor(node.id)}
                      onClick={() => onSelectNode(node)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => onSelectNode(outerNode)}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              查看「Transformer Block ×61」整体说明 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
