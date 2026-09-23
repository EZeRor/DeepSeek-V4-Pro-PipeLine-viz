import { QUANT_INFO, SPECS, type QuantKey } from '@/data/pipeline'

/** 顶部规格栏 */
export function SpecBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {SPECS.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5" title={s.hint}>
          <span className="text-[11px] text-muted-foreground">{s.label}</span>
          <span className="font-mono text-sm font-semibold text-foreground">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

/** 底部固定量化精度图例 */
export function QuantLegend() {
  const keys: QuantKey[] = ['fp4', 'fp8', 'bf16', 'fp32', 'int', 'mixed']
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-3 py-2">
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">精度图例</span>
        {keys.map((k) => {
          const info = QUANT_INFO[k]
          return (
            <div key={k} className="group relative shrink-0">
              <span className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px]">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: info.hex }}
                />
                {info.label}
              </span>
              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border bg-popover p-2.5 text-[11px] leading-5 text-popover-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                {info.detail}
              </div>
            </div>
          )
        })}
        <span className="shrink-0 text-[10px] text-muted-foreground/70">
          节点徽章颜色 = 该算子的计算 / 存储精度
        </span>
      </div>
    </div>
  )
}
