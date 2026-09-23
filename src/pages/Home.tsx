import { useEffect, useState } from 'react'
import { Cpu, Database } from 'lucide-react'
import { MODE_INFO, PIPELINE_NODES, type Mode, type PipelineNode } from '@/data/pipeline'
import { NodeCard, Connector } from '@/components/NodeCard'
import { LayerBlock } from '@/components/LayerBlock'
import { DetailPanel } from '@/components/DetailPanel'
import { QuantLegend, SpecBar } from '@/components/Legend'
import { cn } from '@/lib/utils'
import '../App.css'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

/** 主流程节点之间的连线标注 */
const FLOW_LABELS: Record<string, string> = {
  tokenize: '[n] int32',
  embedding: '[n, 7168] BF16',
  'residual-init': '[4, n, 7168] BF16',
  layers: '[4, n, 7168] BF16',
  'hc-head': '[7168] BF16',
  'final-norm': '[7168] BF16',
  'lm-head': '[1, 129280] logits',
  sampling: 'next token id',
  mtp: '接受的 token 流',
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('prefill')
  const [layer, setLayer] = useState(3)
  const [expanded, setExpanded] = useState(true)
  const [selected, setSelected] = useState<PipelineNode | null>(null)
  const isDesktop = useIsDesktop()

  const layersNode = PIPELINE_NODES.find((n) => n.id === 'layers')!
  const modeInfo = MODE_INFO[mode]

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      {/* 顶部：标题 + 模式切换 + 规格栏 */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold leading-6 sm:text-xl">
                DeepSeek-V4-Pro 推理流水线
              </h1>
              <p className="text-xs text-muted-foreground">一个 token 的一生：从输入文本到输出文本</p>
            </div>
            {/* prefill / decode 切换 */}
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              {(
                [
                  { key: 'prefill' as Mode, label: 'Prefill', icon: Cpu },
                  { key: 'decode' as Mode, label: 'Decode', icon: Database },
                ]
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    mode === key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2.5 border-t border-border/60 pt-2">
            <SpecBar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4">
        {/* 当前模式说明 */}
        <section className="mt-4 rounded-lg border bg-card p-3 sm:p-4">
          <h2 className="text-sm font-semibold">{modeInfo.title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
            {modeInfo.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {mode === 'decode' && (
            <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
              Decode 模式下，参与 KV cache 读写的节点已用琥珀色高亮（带 KV 标记）。
            </p>
          )}
        </section>

        {/* 主流水线 */}
        <section className="mx-auto mt-6 max-w-2xl">
          {PIPELINE_NODES.map((node) => {
            if (node.id === 'layers') {
              return (
                <div key={node.id}>
                  <Connector label={FLOW_LABELS['residual-init']} />
                  <LayerBlock
                    layer={layer}
                    onLayerChange={setLayer}
                    expanded={expanded}
                    onToggle={() => setExpanded((v) => !v)}
                    mode={mode}
                    selectedId={selected?.id ?? null}
                    onSelectNode={setSelected}
                    outerNode={layersNode}
                  />
                </div>
              )
            }
            const idx = PIPELINE_NODES.indexOf(node)
            const prev = PIPELINE_NODES[idx - 1]
            return (
              <div key={node.id}>
                {idx > 0 && <Connector label={FLOW_LABELS[prev.id]} />}
                <NodeCard
                  node={node}
                  size="md"
                  kvActive={mode === 'decode' && node.kv}
                  selected={selected?.id === node.id}
                  onClick={() => setSelected(node)}
                />
              </div>
            )
          })}

          {/* 生成循环提示 */}
          <div className="mt-3 rounded-lg border border-dashed bg-card/50 p-3 text-center text-[11px] leading-5 text-muted-foreground">
            自回归循环：采样出的 token 拼回输入、其 KV 写入缓存，重复 decode 直到 eos 或达到输出上限（最大
            384K token）；detokenize 流式还原成文本返回。Prefill 只发生一次，Decode 循环逐 token 进行。
          </div>
        </section>
      </main>

      <QuantLegend />

      <DetailPanel
        node={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        isDesktop={isDesktop}
      />
    </div>
  )
}
