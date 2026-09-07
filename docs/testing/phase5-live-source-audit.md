# Phase 5 — 当前官方站点抽查（部分证据）

核对日期：2026-09-07。请求开始时间：`2026-09-07T11:41:54.476Z`。任务：`P5-QA-10`，**尚未完成**。

## 方法与范围

通过官方公开 HTTP 接口重新读取法国 4 个、西班牙 6 个既有抽样站点，以当前代码中的 FranceFuelAdapter / SpainFuelAdapter 转换，再由开发代理逐条核对站点身份、柴油原值与转换值、时间含义和营业时间解析结果。没有使用现场检查、电话确认或人类测试员记录。没有把来源快照写入生产数据库。

来源：

- [法国经济部即时燃油价格数据](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/)；接口查询 `id in (31000001,75001003,66300013,66160001)`。
- [西班牙 MITECO 全国陆地加油站快照](https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/)；返回 `Fecha = 07/09/2026 13:41:54`。这是集合快照时间，不是每个站点的价格观察时间。

这些是官方发布记录，不保证核对时刻加油机上的实际价格或现场营业情况。表中的转换属于 Fuel Now 处理；来源署名和已记录的许可边界见 [来源注册表](../data/source-registry.md)。

## 柴油字段逐项核对

价格均为 EUR/升。法国已发布的日期必须按原始本地墙钟语义处理，不能把门户展示的 `+00:00` 直接当作正确偏移；当前适配器已按 Europe/Paris 转成 UTC。西班牙本次没有关联 XLS 单站观察时间，因此保持 Unknown。

| 国家 / 来源 ID | 公开站点位置                                                                    | 来源柴油原值 | 转换后 EUR/L | 转换后观察时间 UTC   | 新鲜度  |
| -------------- | ------------------------------------------------------------------------------- | ------------ | ------------ | -------------------- | ------- |
| FR 66300013    | Banyuls-dels-Aspres — A9 - AIRE DES VILLAGES CATALANS                           | 2.349        | 2.349        | 2026-09-04T12:00:00Z | stale   |
| FR 31000001    | Toulouse — 328 Route de Saint-Simon                                             | 2.25         | 2.25         | 2026-09-04T19:33:09Z | stale   |
| FR 66160001    | Le Boulou — Route de Perpignan                                                  | 2.208        | 2.208        | 2026-09-07T07:37:00Z | recent  |
| FR 75001003    | Paris — 8,10,10bis Rue Bailleul                                                 | 2.68         | 2.68         | 2026-09-04T19:30:24Z | stale   |
| ES 9020        | BARCELONA — CASANOVA 23                                                         | 1,849        | 1.849        | Unknown              | unknown |
| ES 10912       | PRAT DE LLOBREGAT (EL) — LUGAR AEROPUERTO DEL PRAT JUNTO PARRILLA DE TAXIS, S/N | 1,895        | 1.895        | Unknown              | unknown |
| ES 2332        | LA JONQUERA — AUTOPISTA AP-7 KM. 7                                              | 1,859        | 1.859        | Unknown              | unknown |
| ES 1850        | LA JONQUERA — CARRETERA N-II KM. 774,800                                        | 1,799        | 1.799        | Unknown              | unknown |
| ES 4508        | MADRID — GLORIETA EMBAJADORES, 0                                                | 1,799        | 1.799        | Unknown              | unknown |
| ES 13781       | PINTO — CALLE ARENAS (DE LAS), 2                                                | 1,889        | 1.889        | Unknown              | unknown |

十个站点均无适配器转换 issue，表内十个柴油价格均与原值一致。此结论不外推为所有站点或所有产品质量通过。

## 营业与未知状态核对

- 十个站点的营业计划均解析成功；解析成功不等于现场正在营业。
- 法国 Toulouse `31000001` 的自助支付为 true，但有人值守时间仍单独保留；SP95 价格当前缺失，SP98 明确缺货，不用历史价格填补。
- 法国 Paris `75001003` 的七日 `00.00–00.00` 按已有来源规则解释为全天计划；不据此推断 Air/Wash 服务或设备全天可用。
- 西班牙 Barcelona `9020`、La Jonquera `1850` 为每日 06:00–22:00。
- 西班牙 El Prat `10912` 的 `00:00–23:59` 不扩大成 24H；AP-7 `2332` 与 Pinto `13781` 的 `L-D: 24H` 才是全天计划。
- 西班牙 Madrid `4508` 保留工作日 07:30–22:00、周六 08:00–22:00、周日 09:00–21:00。
- 本次法国记录的 Air/Wash 存在性不提供设备可用性或实际收费证据；这些字段继续 Unknown。未取得 EV 的本轮真实端到端验收证据。

多项价格已不同于 9 月 3 日历史样本，例如 Paris 柴油当前发布 2.68、Le Boulou 2.208、AP-7 1.859。历史 fixture 继续保留原始采集日期和预期值，不为通过测试而改成“今天的数据”。

## 未完成的验收

- [ ] 补齐正式来源采集、统一数据库投影与调度，在测试环境用真实来源走通四服务。
- [ ] 对照测试 API 与手机结果卡/详情核对同一站点 ID、价格、时间和营业状态，保存版本、测试时间和判定。
- [ ] 完成真实设备上的定位权限、地图和外部导航交接检查，并记录人工反馈；不编造到站验证。
- [ ] 在计划 Beta 区域重复抽查；异常记录必须有处理结果，不能将空库或 Unknown 当作质量通过。

下一步前置条件、工程缺口及负责人见 [Phase 5 发布阻塞与恢复清单](phase5-release-prerequisites.md)。本文件仅记录部分进度，不勾选任务完成或 Phase 5 发布门槛。
