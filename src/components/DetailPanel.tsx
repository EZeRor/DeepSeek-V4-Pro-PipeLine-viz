import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SOURCE_LABEL, STAGE_META, type PipelineNode } from '@/data/pipeline'
import { QuantBadgeRow } from './QuantBadge'

interface DetailPanelProps {
  node: PipelineNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isDesktop: boolean
}

function TensorTable({ title, tensors }: { title: string; tensors: PipelineNode['inputs'] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</h4>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/50 text-[11px] text-muted-foreground">
              <th className="px-2 py-1.5 font-medium">张量</th>
              <th className="px-2 py-1.5 font-medium">形状</th>
              <th className="px-2 py-1.5 font-medium">dtype / 精度</th>
            </tr>
          </thead>
          <tbody>
            {tensors.map((t, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-2 py-1.5 align-top">{t.name}</td>
                <td className="px-2 py-1.5 align-top font-mono text-sky-300">{t.shape}</td>
                <td className="px-2 py-1.5 align-top font-mono text-emerald-300">{t.dtype}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DetailPanel({ node, open, onOpenChange, isDesktop }: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={
          isDesktop
            ? 'w-full sm:max-w-xl overflow-y-auto'
            : 'max-h-[82vh] overflow-y-auto rounded-t-xl'
        }
      >
        {node && (
          <>
            <SheetHeader className="pr-8">
              <SheetTitle className="text-lg">{node.label}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px]">
                  {STAGE_META[node.stage].label}
                </span>
                {node.kv && (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">
                    KV cache 相关
                  </span>
                )}
                <QuantBadgeRow quants={node.quant} />
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-8">
              <section className="space-y-2.5">
                {node.description.map((p, i) => (
                  <p key={i} className="text-sm leading-6 text-foreground/90">
                    {p}
                  </p>
                ))}
              </section>

              <TensorTable title="输入张量" tensors={node.inputs} />
              <TensorTable title="输出张量" tensors={node.outputs} />

              {node.quantization && (
                <section className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3">
                  <h4 className="mb-1 text-xs font-semibold text-violet-300">量化方案</h4>
                  <p className="text-xs leading-5 text-foreground/85">{node.quantization}</p>
                </section>
              )}

              <section className="rounded-md border bg-muted/40 p-3 text-[11px] leading-5 text-muted-foreground">
                <span className="font-medium text-foreground/80">数据来源：</span>
                {SOURCE_LABEL[node.source]}
                {node.tableRows && <> · 主报告算子速查总表 {node.tableRows}</>}
                。凡「推算」内容已在正文标注；官方未公开处不作编造。
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
