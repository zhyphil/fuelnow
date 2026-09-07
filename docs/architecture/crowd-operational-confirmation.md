# P6-CROWD-02 — 营业与设备快速确认设计

2026-09-07。设计交付完成，未启用公网采集或更改营业/设备状态。复用 [价格确认](./crowd-price-confirmation.md) 的主动入口、安全提示、草稿、幂等、回执与无障碍规则。

## 先分清“谁的状态”

| 范围 | 问题与可选值 | 不能据此推断 |
| --- | --- | --- |
| 站点/商店 | 当时营业吗？open / closed / unsure | 店铺关门不等于自助油泵关停 |
| 某项服务 | Fuel、Air、Wash 当时可使用吗？available / unavailable / unsure | 某服务不可用不等于整个站点关闭 |
| 精确设备/项目 | 我刚使用成功 / 显示故障 / 临时不可使用 / 未确认 | 单个设备的状态不等于整个站所有设备状态 |
| Fuel 油种 | 所选油种可加 / 标明缺货 / 未确认 | 缺货不等于永久不售或站点关闭 |
| EV 指定接口/EVSE | 使用成功 / 故障提示 / 被占用 / 未确认 | 单人观察不是完整可用 EVSE 数，更不是可信实时 API |

若现有数据没有稳定设备 ID，界面只能提交服务级陈述，不能生成虚构 EVSE ID；“一个设备故障”应保留未精确定位的线索，不发布全站 unavailable。暂时关门只能记观察事件，不能自动写 permanently_closed、改整周排班或删除服务点。

## 流程

详情页服务区域提供独立问题，标明“你观察到的时间和范围”。每次仅确认一个字段，允许全部跳过；不默认顺便确认价格/营业/其它服务。营业及设备问题分别提交或以独立字段报告、独立审核结论处理，不能一个“是”同时变更多字段。

时间由用户选择最近观察区间并确认本地时区，存 UTC 观察时刻/精度及服务器 receivedAt，未经核实不标 verifiedAt。没有可确认时间时可提交低可信待审线索，但不得获得时效性正分。不得要求测试者再次启动车辆/设备验证、拍摄他人或提供 GPS 轨迹。

| 用途 | EN | FR | ES |
| --- | --- | --- | --- |
| 营业 | Was this service open when you checked? | Ce service était-il ouvert lors de votre passage ? | ¿Estaba abierto este servicio cuando lo comprobaste? |
| 设备 | Did this equipment work when you used it? | Cet équipement fonctionnait-il lors de votre utilisation ? | ¿Funcionó este equipo cuando lo usaste? |
| 不确认 | I could not check | Je n’ai pas pu vérifier | No pude comprobarlo |
| 结果 | Report received — not yet verified | Signalement reçu — pas encore vérifié | Aviso recibido — aún no verificado |

## 拟议数据与并发规则

将独立 `operational-observations` 写入待审核层，而非复用 `source_records` 的官方写权限。接受公共 servicePointId、service、field、scope、可选已有设备/油种/项目 ID、枚举回答、观察时间/精度、幂等键。每个字段约束合法组合，未知/跨站设备拒绝。客户端不能提供 confidence、verifiedAt、source 权限或完整容量；任意自由文本和外部链接默认不接收。

同提交重试去重；不同时间的 open/closed 可并存为历史事件，不按票数覆盖。与更新的官方/运营证据冲突时进入复核，不自动胜出。人工审核产生独立字段证据及有效期限，UI 必须区分“用户报告，待核对”和“审核通过的观察”，即便通过也不等于现在仍然可用。

EV 众包记录永不自动改写既有法国官方动态资格，也不能给西班牙标 Live；需要独立来源能力评审才能获得新的 availability 能力。照片流程与可信度/到期机制分别在 P6-CROWD-04/05 设计。

## 设计验收案例

- 商店关门但自动油泵正常：站点商店观察与 Fuel 服务观察分开，导航不误封全部服务。
- Air 坏、Wash 正常：只影响 Air 待审证据，不改 Wash 或 Fuel。
- 昨晚关门、今早营业：按时间保留，不能自动认定作弊或永久关闭。
- 一个 EV 接口被占用：只报该接口 observed occupied，不生成 availableUnits/Live。
- 没有设备 ID/准确观察时间：降为未定位/未定时待审线索；不猜设备、不补“刚刚”。
- 两个报告冲突、官方后来更新：待复核且保留来源，不能按最新收到时间覆盖最新观察证据。

以上为设计走查，不是真机或现场验收。接口、私有审核、来源合并、到期任务和实际读屏交互仍需实现后验证。
