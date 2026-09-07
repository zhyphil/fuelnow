# P6-CROWD-01 — “价格正确吗？”快速确认设计

2026-09-07。设计交付完成；没有上线反馈按钮、写入接口、众包数据表或远程采集。启用须经过 Phase 5 发布/隐私审查及本设计后续实现验收。

## 入口与交互

放在服务点详情的具体价格证据下，标明服务、油种/项目、金额、EUR 单位、会员/税费条件及观察时间。列表和导航主操作不被拦截；不在打开地图后自动弹窗，也不宣称已知道用户到站。提示“请停车后操作”，无需登录、无需定位权限。

1. 用户主动点“价格正确吗？”打开轻量面板，重新显示所核对的那一条价格及来源。
2. 选“与我看到的一致”“不一致”“不确定/跳过”；不预选，不把关闭面板当否定。
3. 一致：选择观察时间范围，确认是在现场价牌还是收费凭证看到，检查会员/税费条件；金额/条件不完整或不是同油种/项目时转入“补充价格”设计（P6-CROWD-03），不做一致性投票。
4. 不一致：可只报差异，或自愿进入补充价格流程；不强迫拍照。没有具体新金额时只记录“有争议”，不推断上涨/下降。
5. 提交前显示最小字段清单、用途与私有处理说明；用户明确提交后，服务端确认入队才显示“已收到，待核对”。失败保留本次内存草稿并可重试；离开可丢弃，未授权不离线持久化。

## 三语主要文案

| 用途 | EN | FR | ES |
| --- | --- | --- | --- |
| 安全提示 | Please stop safely before responding. | Arrêtez-vous en sécurité avant de répondre. | Detente en un lugar seguro antes de responder. |
| 问题 | Is this price correct? | Ce prix est-il correct ? | ¿Es correcto este precio? |
| 一致 | Matches what I saw | Correspond à ce que j’ai vu | Coincide con lo que vi |
| 不一致 | Different price | Prix différent | Precio diferente |
| 跳过 | Not sure / skip | Pas sûr / ignorer | No lo sé / omitir |
| 完成 | Received — awaiting review | Reçu — en attente de vérification | Recibido — pendiente de revisión |

使用已有三语即时切换、52 点操作区、明确选中/错误状态和读屏标签；错误不得仅靠颜色；显示金额与单位时不强制缩小字体。

## 拟议写入边界（尚未实现）

未来 `POST /v1/feedback/price-confirmations` 接受不超过 8 KiB 的白名单对象；只有事先批准启用后才提供路由。客户端不能直接修改 canonical 价格、来源或 confidence。

| 字段 | 规则 |
| --- | --- |
| `servicePointId` | 已存在的公共站点 UUID；不可跨不存在/已合并失效身份猜关联 |
| `service` / `product` | fuel+精确油种、air+单次使用、wash+具体项目；Charge 无合格价格时不展示一致确认 |
| `offerReference` | 服务端签发/可验证的原价格版本引用，绑定站点/产品/单位/条件；现有 API 尚无该字段，需后续扩展 |
| `answer` | match / mismatch；skip 不发送 |
| `observedAt` / `observationBasis` | 用户报告时间及 sign / receipt；时间不当作服务端验证时间，非法/未来时间拒绝或要求重选 |
| `idempotencyKey` | 每次明确提交创建随机键；重试沿用，服务端绑定规范化内容摘要；同键不同内容返回冲突 |

不接受 origin、路径、广告/设备 ID、任意 URL、文本日志；默认不收自由文本、账户或联系方式。服务端重建白名单，未知字段拒绝；认证/滥用/保留由 P6-CROWD-05 统一设计，不能把匿名当无限制写权限。

并发规则：收到时重新核对 offerReference。若源价格已改变，返回过期引用，提示当前价格并由用户再次确认；不能把对旧价格的“正确”投票应用到新价格。报告与被确认的历史值绑定保存为候选证据，审核前不影响 Cheapest/Best。

## 设计验收案例（逐项走查）

| 场景 | 期望 |
| --- | --- |
| EUR/L diesel 正确；会员条件一致 | 可提交 match，入待审队列，不立即加可信分 |
| diesel 与汽油或 EUR/kg 混淆 | 不接受一致投票；要求选对产品/单位 |
| 无价格、Charge 无价格能力 | 不问“是否正确”；只可走补充信息设计 |
| 旧价格已被来源更新 | 明确 stale reference，用户重核，不静默改绑 |
| 断网后同一提交重试 | 最多一个逻辑报告；状态未知时查回执，不显示假成功 |
| 用户跳过/撤回草稿 | 不发送、不变更可信度，导航继续可用 |

待实现：版本化 offer 引用、反馈接口/草稿 UI、私有审核与撤回回执、端到端及真机验收。设计完成不代表上述服务已运行。
