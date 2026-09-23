/**
 * DeepSeek-V4-Pro 推理流水线数据模型
 *
 * 所有技术内容出自《DeepSeek_V4_Pro_推理全流程详解.md》（主报告）
 * 与官方 v4pro_config.json。凡属推算的数据在 source / description 中标注「推算」，
 * 官方未公开的内容不做编造。
 */

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type QuantKey = 'fp4' | 'fp8' | 'bf16' | 'fp32' | 'int' | 'mixed' | 'none'

export type SourceKind = 'official' | 'config' | 'derived'

export type StageKind =
  | 'frontend'
  | 'backbone'
  | 'exit'
  | 'sampling'
  | 'speculative'
  | 'output'

export type LayerAttentionKind = 'CSA' | 'HCA'
export type LayerRouterKind = 'hash' | 'learned'
export type Mode = 'prefill' | 'decode'

export interface TensorSpec {
  name: string
  shape: string
  dtype: string
}

export interface PipelineNode {
  id: string
  label: string
  subtitle?: string
  stage: StageKind
  quant: QuantKey[]
  /** decode 模式下高亮（KV cache 读写相关） */
  kv?: boolean
  /** 报告中「算子速查总表」的行号区间，用于来源标注 */
  tableRows?: string
  source: SourceKind
  description: string[]
  inputs: TensorSpec[]
  outputs: TensorSpec[]
  quantization?: string
}

export interface SymbolDef {
  symbol: string
  meaning: string
}

// ---------------------------------------------------------------------------
// 量化精度图例（报告 §8）
// ---------------------------------------------------------------------------

export interface QuantInfo {
  key: QuantKey
  label: string
  short: string
  detail: string
  /** 徽章背景色（Tailwind 类） */
  badge: string
  /** 图例色块颜色（十六进制，供自定义元素使用） */
  hex: string
}

export const QUANT_INFO: Record<QuantKey, QuantInfo> = {
  fp4: {
    key: 'fp4',
    label: 'FP4 (MXFP4 E2M1)',
    short: 'FP4',
    detail: '路由专家权重与 Lightning Indexer QK 激活。MXFP4：E2M1 编码、1×32 子块、UE8M0 缩放因子；经量化感知训练（QAT）得到。',
    badge: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40',
    hex: '#d946ef',
  },
  fp8: {
    key: 'fp8',
    label: 'FP8 (E4M3, 128×128 块)',
    short: 'FP8',
    detail: '注意力 / 共享专家 / MTP 等大部分权重：E4M3、128×128 块量化、UE8M0 scale，激活动态量化；EP dispatch 通信也用 FP8 省带宽。',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    hex: '#38bdf8',
  },
  bf16: {
    key: 'bf16',
    label: 'BF16',
    short: 'BF16',
    detail: 'embedding / LM head / norm / 路由 gate 等不量化部件；EP combine 与加权合并的累加精度。',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    hex: '#34d399',
  },
  fp32: {
    key: 'fp32',
    label: 'FP32',
    short: 'FP32',
    detail: '对数值最敏感的环节：Sinkhorn 迭代、路由 bias 修正、indexer 分数累加、采样 softmax。',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    hex: '#fbbf24',
  },
  int: {
    key: 'int',
    label: 'int32 / int64',
    short: 'int',
    detail: 'token id（int）与 Hash 路由查表（int64 的 gate.tid2eid），无浮点计算。',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    hex: '#94a3b8',
  },
  mixed: {
    key: 'mixed',
    label: '混合精度',
    short: '混合',
    detail: 'KV cache 压缩条目：RoPE 64 维存 BF16（128 字节）+ 其余 448 维存 FP8（448 字节），每条目共 576 字节（推算）。',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
    hex: '#a78bfa',
  },
  none: {
    key: 'none',
    label: '无数值精度',
    short: '—',
    detail: '纯字符串 / 控制流处理，不涉及浮点数值。',
    badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/40',
    hex: '#71717a',
  },
}

// ---------------------------------------------------------------------------
// 形状符号图例
// ---------------------------------------------------------------------------

export const SYMBOLS: SymbolDef[] = [
  { symbol: 'n', meaning: '序列长度（prefill 阶段为全部输入 token 数；decode 阶段每步为 1）' },
  { symbol: 's', meaning: 'decode 时缓存侧的压缩条目数（CSA 层 s = n/4，HCA 层 s = n/128），indexer 每步对全量 s 个条目重新打分' },
  { symbol: 'm', meaning: 'CSA 压缩率 = 4（重叠式，每个压缩条目由 2m = 8 个原始条目合成）' },
  { symbol: "m′", meaning: 'HCA 压缩率 = 128（不重叠，每 128 个原始 token 合成 1 个条目）' },
  { symbol: 'k', meaning: 'CSA Top-k 稀疏选择的条目数 = 1024（V4-Flash 为 512，勿混淆）' },
  { symbol: 'n_i', meaning: 'MoE 中分配到第 i 个专家的 token 数' },
  { symbol: 'd', meaning: '隐藏维 hidden size = 7168' },
  { symbol: 'd_c', meaning: 'query 低秩潜向量维 = 1536' },
  { symbol: 'c', meaning: '注意力头维 = 512' },
  { symbol: 'c^I', meaning: 'indexer 头维 = 128' },
  { symbol: 'g / d_g', meaning: '输出投影分组数 = 16 / 组内低秩维 = 1024' },
]

// ---------------------------------------------------------------------------
// 顶部规格栏（报告 §3 规格表 + config.json）
// ---------------------------------------------------------------------------

export interface SpecItem {
  label: string
  value: string
  hint?: string
}

export const SPECS: SpecItem[] = [
  { label: '总参数', value: '1.6T', hint: 'GA 版挂载 DSpark 后官方口径 1.7T' },
  { label: '激活参数', value: '49B / token' },
  { label: '层数', value: '61', hint: '30 层 CSA + 31 层 HCA' },
  { label: 'hidden size', value: '7168' },
  { label: '上下文', value: '1M', hint: 'max_position_embeddings = 1048576' },
  { label: '词表', value: '129280' },
  { label: '专家', value: '384 × top-6', hint: '+ 1 个共享专家' },
]

// ---------------------------------------------------------------------------
// 层规则（config.json compress_ratios / num_hash_layers）
// ---------------------------------------------------------------------------

export const NUM_LAYERS = 61

export function getLayerAttention(layer: number): LayerAttentionKind {
  // 第 1–2 层与偶数层 4–60 为 HCA（压缩率 128）；奇数层 3–61 为 CSA（压缩率 4）
  if (layer <= 2) return 'HCA'
  return layer % 2 === 1 ? 'CSA' : 'HCA'
}

export function getLayerRouter(layer: number): LayerRouterKind {
  // config: num_hash_layers = 3 → 前 3 层 Hash 路由（gate.tid2eid 查表）
  return layer <= 3 ? 'hash' : 'learned'
}

export function getLayerCompressRatio(layer: number): number {
  return getLayerAttention(layer) === 'CSA' ? 4 : 128
}

export const LAYER_COUNTS = {
  csa: 30, // 奇数层 3..61
  hca: 31, // 第 1–2 层 + 偶数层 4..60
  hash: 3,
  learned: 58,
}

// ---------------------------------------------------------------------------
// 主流水线节点（报告 §13 速查总表为骨架）
// ---------------------------------------------------------------------------

export const PIPELINE_NODES: PipelineNode[] = [
  {
    id: 'tokenize',
    label: 'Tokenizer',
    subtitle: '文本 → token id',
    stage: 'frontend',
    quant: ['int'],
    tableRows: '#1',
    source: 'official',
    description: [
      '模型不认字，只认整数。tokenizer 把输入文本按 129280 条目的词表切成子词单元，每个单元对应一个整数 id，输出形状 [n] 的整数张量，n 为 token 数。config 中 bos_token_id=0、eos_token_id=1，序列以 bos 开头。',
      '英文单词平均约 0.7–1 个 token，中文汉字通常 1 字 1 token 上下，代码则因缩进与符号密度波动很大——同样「一百万上下文」，装小说和装代码仓库的实际容量感受完全不同。',
      '服务侧的坑：vLLM 为该模型提供专用 tokenizer 模式参数 --tokenizer-mode deepseek_v4，说明 tokenizer 有自定义逻辑，不能简单套用通用 BPE 加载器。',
    ],
    inputs: [{ name: 'text', shape: '字符串', dtype: '—' }],
    outputs: [{ name: 'token ids', shape: '[n]', dtype: 'int32' }],
    quantization: '无浮点计算。词表大小 129280（config: vocab_size）。',
  },
  {
    id: 'embedding',
    label: 'Embedding 查表',
    subtitle: 'id → 7168 维向量',
    stage: 'frontend',
    quant: ['bf16'],
    tableRows: '#2',
    source: 'official',
    description: [
      '整数 id 本身没有语义。模型用它去形状 [129280, 7168] 的巨型查找表中取出对应行，得到 [n, 7168] 的浮点张量，这是 token 在模型眼里的「初始表示」。语义相近的 token 在这张表里的向量也相近。',
      '查表不是计算而是内存读取，几乎不耗 FLOPs，但占显存：129280×7168×2 字节 ≈ 1.85 GB（BF16）。decode 每步只读 1 行（14336 字节），prefill 读 n 行。',
      'config 中 tie_word_embeddings=false：输入 embedding 与输出 LM head 是两张独立的表，合计约 3.7 GB BF16，多卡部署时每个 rank 都要复制一份。',
    ],
    inputs: [{ name: 'token ids', shape: '[n]', dtype: 'int32' }],
    outputs: [{ name: 'hidden states', shape: '[n, 7168]', dtype: 'BF16' }],
    quantization: '权重 BF16，不在 FP8/FP4 量化范围内（config: torch_dtype=bfloat16）。',
  },
  {
    id: 'residual-init',
    label: '残差流初始化 ×4',
    subtitle: '1 路 → 4 路 mHC 残差',
    stage: 'frontend',
    quant: ['bf16'],
    tableRows: '§4 第三步',
    source: 'official',
    description: [
      '查表得到的 [n, 7168] 并不直接进第一层 block。mHC（流形约束超连接）要求 4 路残差流（hc_mult=4），入口处把单向量扩展成 4×7168 的初始残差态。',
      '此后 61 层里流转的「主数据」始终是这 4 路 7168 维向量，每个子层看到的只是 mHC 混合出来的 1 路。代价是 activation 内存翻 4 倍，但相对 KV cache 与权重仍是小头。',
      '入口扩展的具体形式（四路完全相同还是有初始化差异）官方报告未在正文展开、称以开源代码为准，属于官方未详细公开的环节，此处不妄测。',
    ],
    inputs: [{ name: 'hidden states', shape: '[n, 7168]', dtype: 'BF16' }],
    outputs: [{ name: 'residual stream', shape: '[4, n, 7168]', dtype: 'BF16' }],
    quantization: 'BF16。初始化形式官方未公开（以开源代码为准）。',
  },
  {
    id: 'layers',
    label: 'Transformer Block ×61',
    subtitle: '30 CSA + 31 HCA，点击展开单层结构',
    stage: 'backbone',
    quant: ['fp4', 'fp8', 'bf16'],
    kv: true,
    tableRows: '#3–#22',
    source: 'official',
    description: [
      '主干是 61 层结构完全同构的 Transformer block，隐藏维 7168。每层包含注意力子层与 MoE 子层，但接线方式与经典 Transformer 不同：残差连接被 mHC 取代，残差流扩宽成 4 条并行通道，每个子层开工前由 mHC 混合出 1 路输入，干完活再写回 4 路——X_{l+1} = B·X_l + C·F(A·X_l)。',
      '注意力按层交替：第 1–2 层 HCA（压缩率 128），第 3 层起 CSA（m=4）与 HCA 严格逐层交替，共 30 层 CSA + 31 层 HCA（config.json compress_ratios 逐项核对）。每层还并行一个窗口 128 的 SWA 滑窗分支，兜住最近 token 的局部保真。',
      '61 层全部是 MoE：1 个共享专家 + 384 个路由专家，每个 token 选 6 个（top-6）。前 3 层用 Hash 路由（按 token id 查表确定性指派），其余 58 层用学习路由器（Sqrt(Softplus) 打分）。',
      '参数分布上 MoE 是绝对大头：384 专家 × 约 6600 万参数 × 61 层 ≈ 1.5T，占总量九成以上——这是部署必须用大规模专家并行（EP）的根因。',
    ],
    inputs: [{ name: 'residual stream', shape: '[4, n, 7168]', dtype: 'BF16' }],
    outputs: [{ name: 'residual stream', shape: '[4, n, 7168]', dtype: 'BF16' }],
    quantization: '注意力/共享专家权重 FP8，路由专家权重 FP4 (MXFP4)，KV cache 混合精度（RoPE 维 BF16 + 其余 FP8）。',
  },
  {
    id: 'hc-head',
    label: 'hc_head 坍缩',
    subtitle: '4 路 → 1 路',
    stage: 'exit',
    quant: ['bf16'],
    tableRows: '#23',
    source: 'official',
    description: [
      '走完 61 层后，4 路残差流由 hc_head 加权坍缩回 1 路 7168 维向量。外挂的 MTP 模块有自己独立的 hc_head。',
      '这是 mHC 体系的「出口」：把 4 条并行残差通道的信息汇合，为最终的 logits 计算提供单向量表示。',
    ],
    inputs: [{ name: 'residual stream', shape: '[4, 7168]', dtype: 'BF16' }],
    outputs: [{ name: 'hidden', shape: '[7168]', dtype: 'BF16' }],
    quantization: 'BF16（decode 单 token 视角；prefill 时只有最后位置需要坍缩）。',
  },
  {
    id: 'final-norm',
    label: '最终 RMSNorm',
    subtitle: '数值归一化',
    stage: 'exit',
    quant: ['bf16'],
    tableRows: '#24',
    source: 'official',
    description: [
      '坍缩后的 7168 维向量经最后一道 RMSNorm（eps=1e-6）归一化，再进 LM head。',
      'RMSNorm 是 FP8/FP4 混合精度链路里的数值护栏：低精度下激活分布一旦漂移，归一化层是最后一道防线。norm 权重保持 BF16/FP32 不量化。',
    ],
    inputs: [{ name: 'hidden', shape: '[7168]', dtype: 'BF16' }],
    outputs: [{ name: 'hidden (normed)', shape: '[7168]', dtype: 'BF16' }],
    quantization: 'norm 权重不量化（BF16/FP32），config: rms_norm_eps=1e-6。',
  },
  {
    id: 'lm-head',
    label: 'LM Head',
    subtitle: '算 129280 维 logits',
    stage: 'exit',
    quant: ['bf16'],
    tableRows: '#25',
    source: 'official',
    description: [
      '归一化后的向量乘以 LM head 矩阵 [7168, 129280]（BF16，与 embedding 不共享权重），得到 129280 维 logits——对词表中每个候选 token 的打分。',
      'decode 阶段形状为 [1, 7168] × [7168, 129280] → [1, 129280]，单次约 1.86 GFLOPs，是整个 decode 步里少有的「实打实的大 GEMM」。prefill 阶段通常只对最后一个位置（或采样需要的位置）计算，避免为中间位置白算 129280 维输出。',
    ],
    inputs: [{ name: 'hidden (normed)', shape: '[1, 7168]', dtype: 'BF16' }],
    outputs: [{ name: 'logits', shape: '[1, 129280]', dtype: 'BF16' }],
    quantization: 'LM head 权重 BF16 不量化；decode 单次约 1.86 GFLOPs。',
  },
  {
    id: 'sampling',
    label: 'Softmax + 采样',
    subtitle: 'logits → 下一个 token',
    stage: 'sampling',
    quant: ['fp32'],
    tableRows: '#26',
    source: 'official',
    description: [
      'logits 经温度缩放后 softmax 成总和为 1 的概率分布，再按采样策略选 token：贪婪（温度 0）取 argmax；温度大于 0 时配合 top-k / top-p 截断后随机采样。logits 是模型与「随机性」的分界线：之前全是确定性矩阵运算，之后才引入随机。',
      '这一步在 CPU 或 GPU 上都是微秒级，但它决定输出是确定性的还是创作性的。V4 官方专门做了 batch-invariant 确定性 kernel（双 kernel 策略规避 wave-quantization 效应），保证相同输入在不同 batch 组成下逐比特可复现。',
    ],
    inputs: [{ name: 'logits', shape: '[129280]', dtype: 'BF16' }],
    outputs: [{ name: 'next token id', shape: '[1]', dtype: 'int32' }],
    quantization: 'softmax 在 FP32 下计算，保证数值稳定。',
  },
  {
    id: 'mtp',
    label: 'MTP / DSpark 草稿验证',
    subtitle: '投机解码，一次前向出多个 token',
    stage: 'speculative',
    quant: ['fp8', 'bf16'],
    tableRows: '#27',
    source: 'official',
    description: [
      'decode 每步只出 1 个 token，GPU 算力大量闲置。投机解码用便宜的「草稿员」先猜几个 token，主模型一次前向并行验证，从第一个猜错的位置截断，猜对的部分一次性接受——数学上与逐 token 解码严格等价，输出分布无损。',
      'MTP 模块沿用 V3 设计未做修改：深度 1（num_nextn_predict_layers=1），含 e_proj/h_proj 投影、enorm/hnorm 归一化、一个完整 Transformer block 及独立 hc_head；config 的 compress_ratios 第 62 项为 0 就对应它。第三方实测（温度 0）：MTP(3) 平均接受长度 2.93、加速 2.25 倍；官方未公布原生 MTP 接受率。',
      '0813 GA 版挂载 DSpark 草稿模块（dspark_target_layer_ids=[58,59,60]，block_size=5，markov_rank=512）：半自回归草稿（并行主干 + 轻量串行 Markov 头）加置信度调度验证（闲时拉满、忙时裁剪）。官方生产实测：等吞吐下 Pro 用户生成速度提升 57–78%；数学/代码任务接受长度约 5.1–5.6。',
    ],
    inputs: [{ name: 'draft tokens', shape: '草稿 k 个', dtype: 'int32' }],
    outputs: [{ name: 'accepted tokens', shape: '接受 ≤ k+1 个', dtype: 'int32' }],
    quantization: '草稿与验证与主干同精度（MTP 权重 FP8）；接受长度与提速数字为官方口径 / 第三方实测，均已标注。',
  },
  {
    id: 'detokenize',
    label: 'Detokenize',
    subtitle: 'id 流 → 文本流',
    stage: 'output',
    quant: ['none'],
    tableRows: '#28',
    source: 'official',
    description: [
      '采样得到的 token id 流式地经 tokenizer 反向映射回文本片段返回客户端。',
      '中文和代码场景下一个 UTF-8 字符可能由多个 token 拼成，流式 detokenize 需要处理「半个字符」的缓冲——先攒住不完整的字节序列、凑齐再发——处理不当就会在流式输出里看到乱码闪烁。',
    ],
    inputs: [{ name: 'token ids', shape: 'id 流', dtype: 'int32' }],
    outputs: [{ name: 'text', shape: '字符串流', dtype: '—' }],
    quantization: '无浮点计算。',
  },
]

// ---------------------------------------------------------------------------
// 单层内部节点（视图按层号动态标注 CSA / HCA 与路由方式）
// ---------------------------------------------------------------------------

export const LAYER_NODES: PipelineNode[] = [
  {
    id: 'mhc-pre',
    label: 'mHC 混合（注意力前）',
    subtitle: '4 路残差 → 1 路子层输入',
    stage: 'backbone',
    quant: ['bf16', 'fp32'],
    tableRows: '#3–#4',
    source: 'official',
    description: [
      '经典残差连接只有一条「高速公路」，mHC（流形约束超连接，hc_mult=4）把它扩宽成 4 路：A 把 4 路压成 1 路喂给子层、B 在 4 路之间混合、C 把子层输出写回——X_{l+1} = B·X_l + C·F(A·X_l)。',
      'A/B/C 不是静态权重，而是逐 token 动态生成：把 4×7168 残差态展平成 28672 维 → RMSNorm → 三个小投影矩阵 W^pre/W^res/W^post 加静态偏置、乘小初始化门控因子 α → 得到 Ã、B̃、C̃；对 B̃ 取 exp 后做 Sinkhorn-Knopp 迭代（交替行/列归一化共 20 次，hc_sinkhorn_iters=20）收敛到双随机矩阵。',
      '双随机约束（Birkhoff 多面体）带来数学保证：谱范数 ≤ 1，残差混合永不放大信号；任意多层复合仍在流形上；混合本质是各流特征的凸组合。社区反馈 20 次迭代的轴向顺序与次数是「承重的」，复现时不可省略。整个流程的 FLOPs 相对 49B 激活参数可忽略。',
    ],
    inputs: [{ name: 'residual stream', shape: '[4, n, 7168] → 展平 [n, 28672]', dtype: 'BF16' }],
    outputs: [
      { name: 'A / B / C', shape: '[n,1,4] / [n,4,4] / [n,4,1]', dtype: 'BF16（Sinkhorn 迭代 FP32）' },
      { name: 'sublayer input', shape: '[n, 7168]', dtype: 'BF16' },
    ],
    quantization: '主体 BF16；Sinkhorn-Knopp 20 次迭代在 FP32 下进行（eps=1e-6）。',
  },
  {
    id: 'kv-proj',
    label: 'KV 投影',
    subtitle: '生成逐 token 原始条目',
    stage: 'backbone',
    quant: ['fp8', 'bf16'],
    tableRows: '#5',
    source: 'official',
    description: [
      'hidden 张量 H 乘投影矩阵生成逐 token 的原始 KV 条目（每条 512 维，即头维 c），以及决定压缩合成中「发言权」的压缩权重 Z。',
      'CSA 层是双路投影：C^a = H·W^{aKV}、C^b = H·W^{bKV}，两路交替供给重叠压缩，保证每个原始 token 恰好参与两个相邻压缩条目、边界信息不丢失。HCA 层是单路：C = H·W^KV、Z = H·W^Z，结构更简。',
    ],
    inputs: [{ name: 'H (sublayer input)', shape: '[n, 7168]', dtype: 'BF16/FP8' }],
    outputs: [
      { name: 'C^a, C^b（CSA）/ C（HCA）', shape: '[n, 512] ×1–2', dtype: 'BF16' },
      { name: 'Z（压缩权重）', shape: '[n, 512] ×1–2', dtype: 'BF16' },
    ],
    quantization: '投影权重 FP8（E4M3, 128×128 块），激活 BF16/FP8。',
  },
  {
    id: 'compress',
    label: '压缩合成',
    subtitle: '序列维度压缩（动态压缩率）',
    stage: 'backbone',
    quant: ['fp8', 'mixed'],
    kv: true,
    tableRows: '#6–#7',
    source: 'official',
    description: [
      '这是 V4 相对 V3 MLA 的范式转移：从「表示维度压缩」转向「序列维度压缩」——条目本身 512 维不小，但条目数大幅减少。合成权重来自对 [Z+B] 做行 softmax（B 为可学习位置偏置），再与对应条目逐元素乘后求和；不是平均池化，每个位置维度有独立可学习权重。',
      'CSA（m=4）重叠式压缩：第 i 个压缩条目由 2m=8 个原始条目合成（当前块 4 个 C^a + 上一块 4 个 C^b），净压缩率 1/4，1M token 压成 262144 个条目。HCA（m′=128）不重叠：每 128 个 token 合成 1 个条目，1M token 只留 8192 个——压缩率是 CSA 的 32 倍。',
      '压缩条目在写入缓存前已完成位置编码与合成，MLA 那套解耦 RoPE + 吸收技巧整套机制都不再需要。条目以「RoPE 64 维 BF16 + 其余 448 维 FP8」的混合精度写入分页 KV cache，每 128 个原始 token 一块（含 32 个 CSA 条目 + 1 个 HCA 条目）。',
    ],
    inputs: [
      { name: '原始条目 C', shape: '每块 2m×512（CSA）/ 128×512（HCA）', dtype: 'FP8' },
      { name: '压缩权重 Z + 位置偏置 B', shape: '每块 2m 维 / 128 维', dtype: 'BF16' },
    ],
    outputs: [{ name: '压缩条目', shape: '[n/m, 512]（CSA m=4 → n/4；HCA m′=128 → n/128）', dtype: '混合：RoPE 维 BF16 + 其余 FP8' }],
    quantization: '激活 FP8；写入 KV cache 时 RoPE 64 维 BF16（128 字节）+ 其余 448 维 FP8（448 字节），每条目共 576 字节（推算，官方未公布绝对字节数）。',
  },
  {
    id: 'indexer',
    label: 'Lightning Indexer + Top-1024',
    subtitle: 'CSA 层专属：FP4 稀疏选择',
    stage: 'backbone',
    quant: ['fp4', 'fp32', 'bf16'],
    kv: true,
    tableRows: '#10–#11',
    source: 'official',
    description: [
      '回答「262144 个压缩条目里，当前 query 该看哪 1024 个」。先用同一压缩算子生成压缩 indexer key（每条目 128 维）；query 侧从 1536 维潜向量投出 64 个 indexer 头（每头 128 维）；打分是对 64 个头加权的 ReLU 点积和，逐头权重 w^I 由 hidden 经小投影动态生成；为保因果只给当前块之前的历史块打分。',
      '然后 Top-k 选出 1024 个压缩条目（V4-Flash 为 512，勿混）。选择粒度是「压缩条目」，每条目覆盖 4 个原始 token——比 V3.2 DSA 的逐 token 选择粗一档。decode 时每步只有 1 个 query，但 indexer 仍要对缓存侧全量 s = n/4 个条目重新打分。',
      'indexer 的 QK 路径经 FP4 量化感知训练，激活以 FP4 缓存、加载、计算；分数先在 FP32 下累加再降到 BF16 供 top-k——官方称 top-k 提速 2 倍，KV 条目召回率保持 99.7%，降精度几乎不牺牲「选对条目」的能力。HCA 层没有这一步：压完只剩 8192 个条目，直接全局稠密注意力。',
    ],
    inputs: [
      { name: 'indexer query', shape: 'q^I [64 头, 128]', dtype: 'FP4' },
      { name: '压缩 indexer key', shape: 'K^I [s, 128]，s = n/4', dtype: 'FP4' },
    ],
    outputs: [
      { name: 'indexer 分数', shape: '[s]', dtype: 'FP32 累加 → BF16' },
      { name: '选中条目索引', shape: '1024 个索引', dtype: 'int' },
    ],
    quantization: 'QK 全程 FP4（QAT 训练）；分数 FP32 累加后降 BF16 供 top-k，提速 2×、召回 99.7%（官方口径）。',
  },
  {
    id: 'attention',
    label: '主注意力（Shared-KV MQA）',
    subtitle: '128 头 × 512 维，稀疏或稠密',
    stage: 'backbone',
    quant: ['mixed', 'bf16'],
    kv: true,
    tableRows: '#8–#9, #12–#13',
    source: 'official',
    description: [
      '128 个 query 头（每头 512 维）共享同一份 key/value（MQA，num_key_value_heads=1）；更激进的是被选中的压缩条目同时充当 key 和 value（Shared-KV）——缓存里每个条目只存一份 512 维向量，K、V 合一。CSA 层只对 indexer 选出的 1024 个条目做稀疏注意力；HCA 层对全部 n/128 个条目做稠密注意力（压完约等于处理 8K 上下文，负担得起）。',
      'query 走低秩投影：先压到 d_c=1536 的潜向量 c^Q = h·W^DQ（[7168, 1536]），再升维到各头，省去 7168×65536 的巨型矩阵。位置编码为 partial RoPE：只对 query 与压缩条目末 64 维施加旋转（qk_rope_head_dim=64），其余 448 维不带位置信息；注意力输出末 64 维再施加「位置 −i 的反向 RoPE」抵消绝对位置，使输出只含相对位置信息——精巧的「加了再减」。',
      'CSA 层提供「细节挑选」（按需精确检索局部原文），HCA 层提供「全局骨架」（极低成本扫视全文粗摘要），两者功能互补。注意力打分中还加入 attention sink——少量永远可见的锚点位置，让 softmax 分母在稀疏注意力下不退化。',
    ],
    inputs: [
      { name: 'query（低秩投影 + partial RoPE）', shape: 'q [128 头, 512]，潜向量 [n, 1536]', dtype: 'BF16' },
      { name: '选中/全部压缩条目', shape: 'CSA: 1024×512；HCA: [n/128, 512]', dtype: '混合：RoPE 维 BF16 + 其余 FP8' },
    ],
    outputs: [{ name: '注意力输出（末 64 维反向 RoPE）', shape: '[128 头, 512] → [n, 65536]', dtype: 'BF16' }],
    quantization: 'KV 条目 FP8/BF16 混合存储，注意力计算 BF16；FlashMLA V4 专用融合核把 norm+RoPE+attn+反向 RoPE+cast 融成单个 kernel。',
  },
  {
    id: 'o-proj',
    label: '分组输出投影',
    subtitle: '65536 → 16384 → 7168',
    stage: 'backbone',
    quant: ['fp8', 'bf16'],
    tableRows: '#14',
    source: 'official',
    description: [
      '注意力输出维度高达 128 头 × 512 维 = 65536，直接投影回 7168 需要 65536×7168 矩阵（约 4.7 亿参数），代价过高。',
      'V4 采用分组输出投影：128 头分 g=16 组，每组 4096 维先压到 d_g=1024 维，16 组拼成 16384 维后再投影回 7168，把输出投影的参数量与计算量削去约四分之三。',
    ],
    inputs: [{ name: '注意力输出', shape: '[n, 65536]', dtype: 'BF16' }],
    outputs: [{ name: '注意力子层输出', shape: '[n, 7168]', dtype: 'BF16（中间 [n, 16384]）' }],
    quantization: '投影权重 FP8（E4M3, 128×128 块），激活 BF16。',
  },
  {
    id: 'swa',
    label: 'SWA 滑窗分支',
    subtitle: '窗口 128，局部保真',
    stage: 'backbone',
    quant: ['mixed'],
    kv: true,
    tableRows: '#15',
    source: 'official',
    description: [
      '所有层在压缩注意力主分支之外，还带一个窗口 128 的滑动窗口注意力分支，负责「最近 128 个 token 的保真细节」——压缩条目是有损合成，新近上下文经不起压缩损失，SWA 用定长缓存兜住局部精确性。',
      '显存开销是定值（128 token × 61 层），不随上下文增长。官方透露未压缩 SWA 条目体积约为压缩条目的 8 倍，这是把窗口限制在 128 的经济学原因。工程上 SWA 条目放入定长 state cache（约 4.5 MB，推算），与不足一个压缩块的未压缩尾部一起管理。',
    ],
    inputs: [{ name: '最近 128 个 token 的 KV', shape: '窗口内逐 token 条目', dtype: '未压缩条目（约为压缩条目体积的 8 倍）' }],
    outputs: [{ name: 'SWA 注意力输出', shape: '与主分支合并', dtype: 'BF16' }],
    quantization: 'SWA state 定长缓存（128 token × 576 字节 × 61 层 ≈ 4.5 MB，推算）；SGLang 可用 bf16 进一步压缩 state 池。',
  },
  {
    id: 'mhc-post',
    label: 'mHC 写回 + 再混合（MoE 前）',
    subtitle: '子层输出写回 4 路残差',
    stage: 'backbone',
    quant: ['bf16', 'fp32'],
    tableRows: '#3–#4',
    source: 'official',
    description: [
      '注意力子层输出经 C 映射写回 4 路残差流：X = B·X + C·F(A·X)，其中 B 是 Sinkhorn 迭代 20 次得到的双随机矩阵——混合永不放大信号，这是 61 层深度下数值稳定的关键。',
      '随后进入 MoE 子层前，mHC 再执行一次同样的「生成 A/B/C → Sinkhorn → 混合出 1 路输入」流程。每个 block 内 mHC 共运行两次（注意力前、MoE 前），速查表中记为「每层 ×2」。',
    ],
    inputs: [
      { name: '注意力子层输出', shape: '[n, 7168]', dtype: 'BF16' },
      { name: 'residual stream', shape: '[4, n, 7168]', dtype: 'BF16' },
    ],
    outputs: [
      { name: 'residual stream (updated)', shape: '[4, n, 7168]', dtype: 'BF16' },
      { name: 'MoE sublayer input', shape: '[n, 7168]', dtype: 'BF16' },
    ],
    quantization: 'BF16 主体，Sinkhorn 迭代 FP32；FLOPs 相对 49B 激活参数可忽略（mHC 论文报告训练时间仅增加 6.7%）。',
  },
  {
    id: 'router',
    label: '路由器（Hash / 学习）',
    subtitle: '384 选 6',
    stage: 'backbone',
    quant: ['int', 'fp32', 'bf16'],
    tableRows: '#16–#18',
    source: 'official',
    description: [
      '第 1–3 层是 Hash 路由（config: num_hash_layers=3）：不经过学习路由器，按预定义 hash 函数对 token id 确定性指派专家（Hash routing, Roller et al. 2021），checkpoint 里这 3 层存 gate.tid2eid 整数查表（int64）——零打分开销，同一个 token id 永远去同一个专家。注意：V4 取消了 V3 的 first_k_dense_replace=3，61 层全是 MoE，「前 3 层稠密」是误解。',
      '第 4–61 层用学习路由器：亲和度打分函数是 Sqrt(Softplus)（config: scoring_func=sqrtsoftplus），替代 V3 的 Sigmoid——它是路由打分函数而非专家 MLP 的激活函数（专家内部仍是 SiLU/SwiGLU）。官方未解释选它的动机；合理推测是 Softplus 开方在 logit 较大时近似线性、不像 Sigmoid 饱和，改善打分动态范围（此为推测，非官方结论）。',
      '384 个亲和度分数加可学习 bias 后取 Top-6（topk_method=noaux_tc）：bias 只影响「选谁」不进组合权重，按负载误差符号以固定步长 0.001 更新，无需辅助损失即维持均衡；V4 另加权重 0.0001 的轻微 sequence-wise 平衡损失。选出的 6 个权重归一化（norm_topk_prob=true）后乘 routed_scaling_factor=2.5 放大。',
    ],
    inputs: [{ name: 'hidden / token id', shape: '[n, 7168]（58 层）/ [n]（前 3 层）', dtype: 'BF16 / int32' }],
    outputs: [{ name: '6 个专家 id + 组合权重', shape: '[n, 6] ×2', dtype: 'int64（id）+ FP32→BF16（权重）' }],
    quantization: 'gate 权重 BF16/FP32 不量化；bias 修正与归一化在 FP32 下进行；Hash 查表为 int64。',
  },
  {
    id: 'dispatch',
    label: 'EP dispatch',
    subtitle: 'token 发往专家所在卡',
    stage: 'backbone',
    quant: ['fp8'],
    tableRows: '#19',
    source: 'official',
    description: [
      'MoE 参数占模型九成以上，必须专家并行（EP）摊开部署：384 个专家分到多卡，token 按路由结果经 all-to-all 通信发往目标专家所在卡（dispatch），算完再收回（combine）。路由本身就是「按专家分片」，与 EP 拓扑天然同构。',
      'dispatch 用 FP8 传输省带宽，combine 用 BF16 保累加精度（DeepEP 通信精度）。V4 的细粒度 wave 调度把 MoE 层拆成 Dispatch → Linear-1 → Linear-2 → Combine 四段流水，三路并发把通信藏进计算里，官方验证通用推理加速 1.50–1.73 倍。',
      '通信账（官方口径）：每 token-expert 对需 6hd FLOPs 计算对 3h 字节通信，通信可完全隐藏的条件是算力带宽比 C/B ≤ 2d = 6144 FLOPs/Byte。',
    ],
    inputs: [{ name: 'token 激活 + 路由结果', shape: '[n, 7168]', dtype: 'BF16 → FP8 传输' }],
    outputs: [{ name: '分卡分块的 token', shape: '[n_i, 7168] per expert', dtype: 'FP8' }],
    quantization: 'DeepEP dispatch FP8、combine BF16；normal 内核服务 prefill、low-latency 纯 RDMA 内核服务 decode。',
  },
  {
    id: 'experts',
    label: '路由专家 SwiGLU ×6',
    subtitle: 'FP4 权重，clamp ±10',
    stage: 'backbone',
    quant: ['fp4', 'bf16'],
    tableRows: '#20',
    source: 'official',
    description: [
      '每个专家是一个 SwiGLU 结构的小 FFN：输入 7168 维，门/升两支投影到中间维 3072，SiLU 门控逐元素相乘后降回 7168——单专家约 6600 万参数（moe_intermediate_size=3072），384 个 × 61 层合计约 1.5T，占模型总量九成以上。',
      '路由专家是全模型唯一以 4 bit 存储的部件：FP4（MXFP4，E2M1 编码，1×32 子块配 UE8M0 缩放因子，config: expert_dtype=fp4），经后训练量化感知训练（QAT）得到。关键技巧：FP32 主权重先量化到 FP4、再无损反量化回 FP8 做前向计算——E4M3 比 E2M1 多 2 位指数位，细粒度 scale 能被 FP8 动态范围完全吸收；推理阶段则直接使用原生 FP4 权重。',
      'SwiGLU 带 clamping：linear 分量钳制到 [−10, 10]、gate 分量上限 10（config: swiglu_limit=10.0），为防训练期数值爆炸而设，推理时保留在前向公式里，是结构的一部分。',
    ],
    inputs: [{ name: '分配到专家的 token', shape: '[n_i, 7168]', dtype: 'BF16（dispatch 后）' }],
    outputs: [{ name: '专家输出', shape: '[n_i, 7168]', dtype: 'BF16' }],
    quantization: '路由专家权重 FP4 (MXFP4 E2M1, 1×32 子块, UE8M0 scale)，激活 BF16；FP4×FP8 峰值算力与 FP8×FP8 相同（现有硬件）。',
  },
  {
    id: 'shared-expert',
    label: '共享专家 SwiGLU',
    subtitle: '永远激活的公共专家',
    stage: 'backbone',
    quant: ['fp8', 'bf16'],
    tableRows: '#21',
    source: 'official',
    description: [
      '每个 token 除了 6 个路由专家，还永远经过 1 个共享专家（n_shared_experts=1），结构同为 SwiGLU（7168 → 3072 → 7168）。',
      '共享专家捕获跨 token 的公共知识，让路由专家可以专注于差异化的专门知识——这是 DeepSeek 系 MoE 从 V2 起沿用至今的设计。',
    ],
    inputs: [{ name: 'MoE sublayer input', shape: '[n, 7168]', dtype: 'BF16' }],
    outputs: [{ name: '共享专家输出', shape: '[n, 7168]', dtype: 'BF16' }],
    quantization: '共享专家权重 FP8（E4M3, 128×128 块），激活 BF16。',
  },
  {
    id: 'combine',
    label: 'EP combine + 加权合并',
    subtitle: '7 份输出 → 1 份',
    stage: 'backbone',
    quant: ['bf16'],
    tableRows: '#22',
    source: 'official',
    description: [
      '6 个路由专家的输出按归一化后 ×2.5 的组合权重加权求和，再与共享专家输出相加，得到 MoE 子层最终输出 [n, 7168]。随后 mHC 将其写回 4 路残差，本层结束。',
      'combine 阶段的 all-to-all 通信用 BF16 保累加精度（dispatch 用 FP8 省带宽、combine 用 BF16 保精度，分工明确）。',
    ],
    inputs: [{ name: '6 份路由专家输出 + 1 份共享专家输出', shape: '7 × [n, 7168]', dtype: 'BF16' }],
    outputs: [{ name: 'MoE 子层输出', shape: '[n, 7168]', dtype: 'BF16 累加' }],
    quantization: 'BF16 累加；组合权重 FP32 归一化后转 BF16。',
  },
]

// ---------------------------------------------------------------------------
// 视图辅助：按层号过滤/标注单层节点
// ---------------------------------------------------------------------------

export function getVisibleLayerNodes(layer: number): PipelineNode[] {
  const attn = getLayerAttention(layer)
  return LAYER_NODES.filter((n) => {
    if (n.id === 'indexer') return attn === 'CSA'
    return true
  })
}

export function getLayerSummary(layer: number) {
  const attn = getLayerAttention(layer)
  return {
    layer,
    attention: attn,
    compressRatio: attn === 'CSA' ? 4 : 128,
    compressLabel: attn === 'CSA' ? 'm = 4（重叠式，Top-1024 稀疏）' : "m′ = 128（无重叠，稠密）",
    entries: attn === 'CSA' ? 'n/4 个压缩条目' : 'n/128 个压缩条目',
    router: getLayerRouter(layer),
    routerLabel:
      getLayerRouter(layer) === 'hash'
        ? 'Hash 路由（gate.tid2eid 查表，int64）'
        : '学习路由器（Sqrt(Softplus) + bias Top-6）',
    topk: attn === 'CSA' ? 1024 : null,
  }
}

// ---------------------------------------------------------------------------
// prefill / decode 模式说明（报告 §2、§12）
// ---------------------------------------------------------------------------

export const MODE_INFO: Record<Mode, { title: string; bullets: string[] }> = {
  prefill: {
    title: 'Prefill 阶段：并行处理 n 个 token，算力密集',
    bullets: [
      '整个输入（n 个 token）一次性并行算完，产出第一个输出 token；n×7168 的大矩阵乘能把 GPU 算力跑满。',
      'KV cache 写入：原始条目攒满一个压缩块（CSA 4 个 / HCA 128 个）即压缩合成，以混合精度写入分页 KV（每 128 原始 token 一块）。',
      'LM head 只对最后一个位置（或采样需要的位置）计算 129280 维 logits，避免为中间位置白算。',
      '长输入工程上分段处理（chunked prefill / 上下文并行）以控制激活显存。',
    ],
  },
  decode: {
    title: 'Decode 阶段：每步 1 个 token，访存密集',
    bullets: [
      '每步只输入 1 个新 token、产出 1 个新 token；要把激活的 49B 参数权重（FP4/FP8）与命中的 KV 条目从显存完整搬一遍，算力大量闲置，TPOT 基本由 HBM 带宽决定。',
      'KV cache 读写：每层 indexer 对这 1 个 query 从缓存侧全量 s 个压缩条目里选 Top-1024（CSA）或扫全部条目（HCA）；新 token 的原始条目攒满一个块就压缩写入缓存——高亮的节点都参与 KV 读写。',
      'KV cache 规模（推算）：CSA 层约 160 字节/token/层、HCA 层约 4.5 字节/token/层，全模型约 4.9–5.4 KB/token，1M 上下文约 5–5.5 GB（官方只公布相对比例：V3.2 的 10%、GQA-8 基线的约 2%）。',
      'MTP/DSpark 在此阶段发力：草稿模块先猜几个 token，主模型并行验证，把「单 token 延迟」换成「验证算力」。',
    ],
  },
}

// ---------------------------------------------------------------------------
// 阶段元数据
// ---------------------------------------------------------------------------

export const STAGE_META: Record<StageKind, { label: string }> = {
  frontend: { label: '前端' },
  backbone: { label: '主干（61 层）' },
  exit: { label: '出口' },
  sampling: { label: '采样' },
  speculative: { label: '投机解码' },
  output: { label: '输出' },
}

export const SOURCE_LABEL: Record<SourceKind, string> = {
  official: '官方技术报告',
  config: '官方 config.json',
  derived: '推算',
}
