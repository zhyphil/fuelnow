# P6-CROWD-03 — Free/Paid 与实际价格反馈设计

2026-09-07。设计完成，反馈尚未上线；不收付款、不建立订单或商家报价。复用 [价格确认](./crowd-price-confirmation.md) 的隐私、回执和报价版本约束，以及 [操作观察](./crowd-operational-confirmation.md) 的字段级审核。

## 最短路径

详情页“补充费用信息”先选 免费 / 收费 / 不知道。收费不强迫填金额；未填金额保持 null，不是 0。确认免费时追问“所有人还是仅顾客/会员”，不知道条件可以跳过，但该记录不可当作无条件免费。

想补充金额再展开：服务与具体油种/项目、EUR 金额、计价单位、包含时长/次数、税费/会员或顾客限制、观察时间及价牌/已支付来源。仅在用户自愿填写时处理，预览原始含义后再确认提交。此前系统已有值不能默认替用户勾选新观察的条件。

| 文案 | EN | FR | ES |
| --- | --- | --- | --- |
| 问题 | Is this service free or paid? | Ce service est-il gratuit ou payant ? | ¿Este servicio es gratis o de pago? |
| 回答 | Free / Paid / Not sure | Gratuit / Payant / Je ne sais pas | Gratis / De pago / No lo sé |
| 金额 | Amount and billing unit (optional) | Montant et unité de facturation (facultatifs) | Importe y unidad de cobro (opcionales) |
| 条件 | Customers or members only? | Réservé aux clients ou adhérents ? | ¿Solo para clientes o socios? |
| 审核状态 | Reported price — awaiting review | Prix signalé — en attente de vérification | Precio comunicado — pendiente de revisión |

## 拟议契约与字段约束

| 字段组 | 约束 |
| --- | --- |
| 身份 | 公共站点 ID、具体服务、油种/洗车项目/设备范围；不得用商店收费覆盖 Air/Wash |
| 费用状态 | `free` / `paid` / `unknown`，和 `amount` 独立；unknown 可作待审线索，不生成价格事实 |
| 金额 | 以规范十进制字符串接受，不使用浮点原样入库；Fuel 最多 3 位小数，其它本期支持单位最多 2 位，超限要求修正而非静默舍入 |
| 本地输入 | EN/FR/ES 接受单个小数点或逗号后转换预览；禁止混合分隔符、千位歧义、指数、NaN、负数或多个数值，不把 `1,650` 猜成 1,650 欧元 |
| 币种/单位 | 仅 EUR；Fuel 精确 EUR/L 或 EUR/kg，Air 单次 use，Wash 明确 wash_program。单位未知不能进入可比较价表，不从金额猜单位 |
| 复杂计价 | “€2/5 分钟”、多段费率、套餐/最低消费分别保留明确报价范围为待审信息；不能伪装成 EUR/use 或跨项目比较；引入新规范单位须另行扩展契约与测试 |
| 条件 | taxIncluded / membershipRequired / customersOnly 三态；未知不默认为 true/false；会员/顾客价格与普通公众价分开 |
| 证据时间 | 用户观察时间/精度与 receivedAt 分开；小票付款时间不是 OCR 执行时间，不能抓取后冒充新价格 |
| 写权限 | 同一报告幂等，服务端验证范围；不能由客户端写 approved/confidence/verifiedAt 或直接覆盖来源 |

一致性：free + 正金额冲突拒绝；paid + 零金额要求重选/解释，不能把促销当长期免费；free + 金额未填保留原始未知金额，审核确认完全免费且条件已知后才可派生适用范围内的零价。没有金额的 paid 仍是有效费用状态，但不支持 Cheapest。所有金额比较继续经过现有可比性、时效和条件门槛。

Charge 暂不写入现有价格字段：现有 API 价格单位不含 kWh、分钟、启停费等完整费率结构。可以让用户跳过或留下结构化“价格信息待支持”选择，不收任意账单文本、不把 Fuel 单位借给 EV，不因此启用 EV Cheapest。

## 设计验收案例

- Air 免费但仅顾客：展示带条件的待审核观察；不得变成所有人免费。
- Air 收费但金额未知：保存 paid + null，UI 仍未知具体价格。
- Wash 两种项目价格不同：按项目分开，不选最低价格代表全部项目。
- FR 输入 `1,659` diesel EUR/L：明确预览 1.659 EUR/L；不会误当 1659。
- CNG EUR/kg 与 diesel EUR/L：不能合并投票或直接比较金额。
- `€2/5min`、会员折扣或未知税费：保持范围/条件，缺支持的报价不进入 Cheapest。
- 负数、指数或免费/正价格冲突：阻止提交并标注具体字段，无自动纠正。

后续实现需增加表单、严格输入规范化、私有候选存储、审核提升和端到端测试；本任务仅完成设计，不声称收到真实反馈。
