# Fuel Now — V1 项目任务清单

> 项目：France + Spain Driver Decision Engine  
> 需求来源：[france_spain_driver_decision_engine_project.md](./france_spain_driver_decision_engine_project.md)  
> 当前状态：本机测试环境已实现，新增 17 tests、全量 990 tests 通过，双平台开发包编译和临时库清理验证通过；Phase 5 为 10/21 主任务及 18 个子项；Phase 6 为 5/13 主任务及 8 个准备子项；未发布，小时任务保持暂停
> 当前阶段：本机真机测试进行中（华为基础列表已通过；Phase 5/6 均未整体验收）
> 下一项任务：照片确认华为字体超大、粗细标准，四服务卡与下方按钮可见；下一步实测四入口选中及语言按钮能否打开，然后恢复用户原字体档位。Combustible 在未选中卡片中也词内断行，继续待优化，未将显示核对等同整体大字体/无障碍通过。地图持续空白及 Fuel 详情油品上下文仍待修复，原连接故障根因及 USB 长期稳定性未确认。iPhone LAN 测试暂不可用，App 安装仍待处理；发布条件未关闭，见 [真机测试说明](./docs/development/local-phone-testing.md)
> 最后更新：2026-09-07

## 使用方法

- `[ ]`：尚未开始
- `[x]`：已经完成并通过对应验收
- `进行中`：在任务文字末尾追加 `— 进行中`
- `阻塞`：在任务文字末尾追加 `— 阻塞：原因`
- 完成任务时，在该任务下补充完成日期、结果或相关文件/API 链接。
- 只有满足阶段验收条件后，才进入下一阶段。
- 每次完成工作后，同时更新文档顶部的“当前状态”“当前阶段”“下一项任务”和“最后更新”。
- 每个完成项单独提交并推送到 `origin/main`；提交格式遵循 `type(frontend|backend|fullstack): description`。

---

## 项目目标

为法国和西班牙司机提供一个列表优先的即时汽车服务决策产品。用户选择 Fuel、Charge、Air 或 Wash 后，系统根据当前位置直接给出：

- Nearest：最近或最快到达
- Cheapest：价格最低
- Open now：当前营业
- Best：综合价格、ETA、绕路、可用性、数据新鲜度和可信度的最佳选择

V1 的核心验收结果是：

> 输入法国或西班牙支持区域内的 GPS，可以稳定返回真实、可追溯、有更新时间的汽车服务结果，并让用户在约 10 秒内选定地点并开始导航。

## V1 范围

### 包含

- France + Spain
- Fuel、Charge、Air、Wash
- Nearest、Cheapest、Open now、Best
- 列表优先，地图为第二层
- FR / ES / EN 本地化就绪
- 外部地图导航
- 数据来源、更新时间、新鲜度和可信度

### 暂不包含

- Parking、AdBlue、Tyre/Puncture、Battery
- Garage 实时空位和预约
- Roadside Assistance 实时 ETA
- AI 故障诊断
- 支付、保险和完整车辆档案
- 全欧洲支持

---

# Phase 0 — 开工决策

目标：明确会影响数据、架构和客户端实现的必要决策，但不在这一阶段过度设计。

- [x] `P0-00` 初始化本地 Git 仓库、连接 GitHub 并建立 `main` 分支跟踪（2026-09-03）
- [x] `P0-01` 确定 V1 首发客户端形态：React Native + Expo + TypeScript，首发 iOS/Android（2026-09-03；[ADR 0001](./docs/decisions/0001-client-platform.md)）
- [x] `P0-02` 确定后端技术栈、包管理方式和运行环境：Node.js 24 LTS + TypeScript + Fastify + pnpm workspace + Docker Compose（2026-09-03；[ADR 0002](./docs/decisions/0002-backend-stack.md)）
- [x] `P0-03` 确定数据库方案：PostgreSQL 18 + PostGIS 3.6，使用 geography(Point, 4326)、GiST 与 SQL-first migrations（2026-09-03；[ADR 0003](./docs/decisions/0003-geospatial-database.md)）
- [x] `P0-04` 确定地图、路径规划和 ETA 服务：后端 Mapbox Matrix API，客户端 react-native-maps，外部 App 完成导航（2026-09-03；[ADR 0004](./docs/decisions/0004-maps-routing-provider.md)）
- [x] `P0-05` 确定首批验证城市和跨境测试区域：Paris、Toulouse、Carcassonne、Perpignan、La Jonquera、Girona、Barcelona、Madrid（2026-09-03；[ADR 0005](./docs/decisions/0005-validation-geographies.md)）
- [x] `P0-06` 确定 V1 账号策略：核心搜索和导航完全免登录，偏好保存在设备本地（2026-09-03；[ADR 0006](./docs/decisions/0006-account-policy.md)）
- [x] `P0-07` 明确位置权限、隐私、数据保存和 GDPR 工程边界：仅前台按需定位、支持手动位置、默认不持久化精确出发点（2026-09-03；[ADR 0007](./docs/decisions/0007-location-privacy.md)）
- [x] `P0-08` 明确数据来源署名方式：API provenance、结果卡、详情页和全局来源/许可证注册表四层展示（2026-09-03；[ADR 0008](./docs/decisions/0008-source-attribution.md)、[来源注册表](./docs/data/source-registry.md)）
- [x] `P0-09` 定义 Live、Verified、Recent、Stale、Unknown 的时间标准，并将 freshness 与 confidence 分离（2026-09-03；[ADR 0009](./docs/decisions/0009-freshness-confidence.md)）
- [x] `P0-10` 定义 Fuel、Charge、Air、Wash 的搜索准入字段、必需可空字段、可选字段和缺失值语义（2026-09-03；[V1 字段契约](./docs/product/v1-service-fields.md)）
- [x] `P0-11` 确定发布范围：全国数据能力 + Toulouse–Barcelona 走廊区域 Beta，Paris/Madrid 作为强制异地回归市场（2026-09-03；[ADR 0010](./docs/decisions/0010-beta-launch-scope.md)）
- [x] `P0-12` 核对决策记录并建立 ADR 索引（2026-09-03；[决策索引](./docs/decisions/README.md)）

## Phase 0 验收门槛

- [x] 首发平台、后端、数据库和路线服务均已确定
- [x] 数据新鲜度与可信度规则有明确书面定义
- [x] 已确定数据验证区域和 V1 发布边界

---

# Phase 1 — Data Feasibility Spike

目标：先验证真实数据能否支撑产品。在本阶段通过之前，不开发完整 App 界面。

## 1.1 France Fuel

- [x] `P1-FR-01` 找到并验证法国官方 Fuel 实时 v2 数据集、Records API 与 CSV/JSON/GeoJSON 导出（2026-09-03；[调查记录](./docs/data/france-fuel-source.md)）
- [x] `P1-FR-02` 核实 Licence Ouverte 2.0 的商业使用、缓存、再分发和署名要求（2026-09-03；[核验记录](./docs/data/france-fuel-licence.md)）
- [x] `P1-FR-03` 保存 Toulouse 原始 API 样本并记录 47 个官方字段定义（2026-09-03；[样本与字段字典](./docs/data/france-fuel-fields.md)）
- [x] `P1-FR-04` 验证 9,804 条记录的站点 ID、地址、坐标、品牌/名称缺失与营业时间结构（2026-09-03；[验证报告](./docs/data/france-fuel-basic-fields-validation.md)）
- [x] `P1-FR-05` 验证六种燃料、32,574 个价格项、France-local 时间语义及缺货一致性（2026-09-03；[验证报告](./docs/data/france-fuel-price-validation.md)）
- [x] `P1-FR-06` 验证整站关闭不可得、24/24 自动付款语义及 Air/Wash 服务字段覆盖（2026-09-03；[验证报告](./docs/data/france-fuel-status-services-validation.md)）
- [x] `P1-FR-07` 编写并测试 `FranceFuelAdapter`，覆盖字段归一化、时区、缺货、营业时间及 Air/Wash 语义（2026-09-03；7 tests）
- [x] `P1-FR-08` 实现 GPS 直线距离查询并返回 Toulouse 中心 10 km 内 70 个真实 Fuel 结果（2026-09-03；[验证报告](./docs/data/france-fuel-nearby-validation.md)；12 tests）
- [x] `P1-FR-09` 验证 Paris、Toulouse、Blagnac 郊区/机场和 A9 高速服务区真实样本（2026-09-03；[验证报告](./docs/data/france-fuel-geography-validation.md)；17 tests）

## 1.2 Spain Fuel

- [x] `P1-ES-01` 找到并验证 MITECO 全国 REST JSON、区域过滤/参考列表与 XLS 快照（2026-09-03；[调查记录](./docs/data/spain-fuel-source.md)）
- [x] `P1-ES-02` 核实 CC BY 4.0 商业使用、缓存、改编、再分发和署名要求，并记录旧通用声明差异（2026-09-03；[核验记录](./docs/data/spain-fuel-licence.md)）
- [x] `P1-ES-03` 保存 Pinto 市级 17 条原始响应并记录 41 个字符串字段定义（2026-09-03；[样本与字段字典](./docs/data/spain-fuel-fields.md)）
- [x] `P1-ES-04` 验证全国 11,475 个站点的身份、地址、名称/品牌边界、坐标异常和营业时间语法（2026-09-03；[验证报告](./docs/data/spain-fuel-basic-fields-validation.md)）
- [x] `P1-ES-05` 验证 23 个产品价格列、42,619 个价格值、9 个 V1 映射、升/公斤单位及快照时间语义（2026-09-03；[验证报告](./docs/data/spain-fuel-price-validation.md)）
- [x] `P1-ES-06` 验证 11,475 行 XLS 的单站时间、5,194 个 24/7 站点、服务方式及关闭/Air/Wash 缺失边界（2026-09-03；[验证报告](./docs/data/spain-fuel-status-services-validation.md)）
- [x] `P1-ES-07` 实现并测试 `SpainFuelAdapter`、营业时间解析、9 种燃料映射、XLS 补充匹配及异常隔离（2026-09-03；[验证报告](./docs/data/spain-fuel-adapter-validation.md)；29 tests）
- [x] `P1-ES-08` 实现 GPS 直线距离查询并返回 Madrid 中心 10 km 内 219 个真实 Fuel 结果（2026-09-03；[验证报告](./docs/data/spain-fuel-nearby-validation.md)；33 tests）
- [x] `P1-ES-09` 验证 Madrid、Barcelona、El Prat 郊区/机场和 La Jonquera AP-7 高速真实样本（2026-09-03；[验证报告](./docs/data/spain-fuel-geography-validation.md)；38 tests）

## 1.3 Fuel 统一验证

- [x] `P1-FUEL-01` 将两国 Fuel 数据转换为统一模型并提供 country-discriminated 公共入口（2026-09-03；[验证报告](./docs/data/unified-fuel-model-validation.md)；40 tests）
- [x] `P1-FUEL-02` 支持统一模型按直线距离进行附近粗筛、边界包含和 Fuel 准入（2026-09-03；[验证报告](./docs/data/unified-fuel-distance-validation.md)；44 tests）
- [x] `P1-FUEL-03` 支持统一 Nearest 排序、全局 ID 决胜和无副作用排序（2026-09-03；[验证报告](./docs/data/unified-fuel-nearest-validation.md)；49 tests）
- [x] `P1-FUEL-04` 支持按指定燃料 Cheapest 排序、Stale/Unknown/不可用价格降级及单位安全（2026-09-03；[验证报告](./docs/data/unified-fuel-cheapest-validation.md)；55 tests）
- [x] `P1-FUEL-05` 支持跨时区 Open now 筛选、关闭/未知分区、跨午夜及 Fuel 24/7 自助语义（2026-09-03；[验证报告](./docs/data/unified-fuel-open-now-validation.md)；64 tests）
- [x] `P1-FUEL-06` 每个结果返回可追溯 source、source URL 和来源命名空间（2026-09-03；[验证报告](./docs/data/unified-fuel-source-attribution-validation.md)；66 tests）
- [x] `P1-FUEL-07` 每个结果返回有依据的 source updated_at、依据类型及独立系统 fetched_at（2026-09-03；[验证报告](./docs/data/unified-fuel-source-timestamps-validation.md)；69 tests）
- [x] `P1-FUEL-08` 明确并实现价格未知/Stale/过期、缺货、关闭及 Unknown 的显示和决策规则（2026-09-03；[验证报告](./docs/data/unified-fuel-decision-state-validation.md)；78 tests）
- [x] `P1-FUEL-09` 验证 Perpignan–La Jonquera–Girona 边境查询合并两国结果且不丢弃更近跨国站点（2026-09-03；[验证报告](./docs/data/cross-border-fuel-search-validation.md)；80 tests）
- [x] `P1-FUEL-10` 人工对照 10 个真实站点的价格、单位、营业/自助和临时/永久缺货语义（2026-09-03；[审计记录](./docs/data/manual-fuel-sample-audit.md)；82 tests）

## 1.4 Air 和 Wash 数据验证

- [x] `P1-AIR-01` 验证法国 `Station de gonflage` 字段、单值/数组结构及仅 presence 语义（2026-09-03；[验证报告](./docs/data/france-air-field-validation.md)；84 tests）
- [x] `P1-AIR-02` 验证西班牙 REST/XLS 无 Aire y agua、充气或设备字段，且服务方式不得误映射（2026-09-03；[验证报告](./docs/data/spain-air-field-validation.md)；86 tests）
- [x] `P1-AIR-03` 统计两国 Air 来源确认覆盖率：法国 55.59%，西班牙当前来源能力不可用（2026-09-03；[覆盖率报告](./docs/data/air-coverage-validation.md)）
- [x] `P1-AIR-04` 评估 Air 免费/收费/金额覆盖：法国 5,450 个 Air 记录价格 100% Unknown，西班牙不可测（2026-09-03；[评估报告](./docs/data/air-price-coverage-validation.md)）
- [x] `P1-AIR-05` 评估 Air 设备可用/损坏状态：法国 5,450 条 100% Unknown，西班牙不可测（2026-09-03；[评估报告](./docs/data/air-equipment-status-coverage-validation.md)）
- [x] `P1-WASH-01` 验证法国自动/手动洗车服务字段，严格保留来源标签且不把 `Laverie` 误判为洗车（2026-09-03；[验证报告](./docs/data/france-wash-field-validation.md)；88 tests）
- [x] `P1-WASH-02` 验证西班牙 REST/XLS 无 Lavado、Wash 类型、价格或设备字段，且服务方式不得误映射（2026-09-04；[验证报告](./docs/data/spain-wash-field-validation.md)；90 tests）
- [x] `P1-WASH-03` 统计两国 Wash 来源确认覆盖率：法国 41.33%，西班牙当前来源能力不可用（2026-09-04；[覆盖率报告](./docs/data/wash-coverage-validation.md)；90 tests）
- [x] `P1-WASH-04` 评估 Wash 类型与价格覆盖：法国详细类型和价格均 0% known，西班牙不可测（2026-09-04；[评估报告](./docs/data/wash-type-price-coverage-validation.md)；90 tests）
- [x] `P1-AW-01` 决定使用 OpenStreetMap 补充 Air/Wash POI 与 presence；保持独立来源、禁用客户端直连公共 Overpass，公开 Beta 前完成 ODbL 合并数据库审查（2026-09-04；[ADR 0011](./docs/decisions/0011-osm-air-wash-supplement.md)；[可行性报告](./docs/data/osm-air-wash-feasibility.md)）

## 1.5 EV 数据验证

- [x] `P1-EV-FR-01` 验证法国 IRVE/QualiCharge 静态数据源，选择 PAN Beta consolidation 为唯一静态主清单并记录质量隔离规则（2026-09-04；[验证报告](./docs/data/france-ev-static-source.md)；[固定 profile/sample](./fixtures/france-ev/)）
- [x] `P1-EV-FR-02` 验证法国动态 availability 与价格：PAN 匹配 61.13% 静态 PDC，但仅 5.43% 在 60 分钟内；动态价格 0%（2026-09-04；[验证报告](./docs/data/france-ev-dynamic-coverage.md)；[固定 profile/sample](./fixtures/france-ev/)）
- [x] `P1-EV-ES-01` 验证西班牙 RIPREE 公共充电静态数据源，确认 43,610 个连接器行、36,465 个 PDC 和 12,214 个安装点，并记录三级身份、解析及异常隔离规则（2026-09-04；[验证报告](./docs/data/spain-ev-static-source.md)；[固定 profile/sample](./fixtures/spain-ev/)）
- [x] `P1-EV-ES-02` 验证西班牙 Reve/SGV 动态 availability 与价格：平台内 95.90% EVSE 为 OCPI 动态来源，价格筛选覆盖 91.48% 地点；记录 API key、5 次/小时及逐点精确状态限制（2026-09-04；[验证报告](./docs/data/spain-ev-dynamic-coverage.md)；[固定 profile/sample](./fixtures/spain-ev/)）
- [x] `P1-EV-01` 验证并统一两国 EV 的 service point → EVSE → connector 层级、接口/功率/运营商映射及状态优先级，容量和 availability 均按 EVSE 计数（2026-09-04；[验证报告](./docs/data/unified-ev-fields-validation.md)；[机器映射](./fixtures/ev/unified-field-mapping.json)）
- [x] `P1-EV-02` 记录各 EV 数据源更新频率、时间戳、商用/缓存/再分发、署名及生产门槛；Reve/SGV 因商用授权和 API 配额保持阻塞（2026-09-04；[政策报告](./docs/data/ev-source-licence-update-policy.md)；[机器策略](./fixtures/ev/source-policy.json)）
- [x] `P1-EV-03` 决定 V1 不承诺两国全国 EV 实时 availability/price；法国仅对满足 5 分钟与健康/关联门槛的单 EVSE 显示 Live，西班牙保持 Unknown，两国 Charge Cheapest 暂停（2026-09-04；[ADR 0012](./docs/decisions/0012-v1-ev-realtime-scope.md)；[机器规则](./fixtures/ev/v1-realtime-scope.json)）

## 1.6 数据可行性报告

- [x] `P1-RPT-01` 输出 France/Spain Fuel、Charge、Air、Wash 全部选定来源到统一模型的字段映射、派生规则、不可用边界及机器可读清单（2026-09-04；[字段映射报告](./docs/data/source-field-mapping-report.md)；[机器映射](./fixtures/reports/source-field-mapping.json)）
- [x] `P1-RPT-02` 汇总 Fuel 全国来源规模/目标区域密度、Air/Wash 来源确认率与 OSM 候选、EV 静态密度及动态关联/新鲜覆盖，并严格区分不可比较分母（2026-09-04；[覆盖率报告](./docs/data/service-coverage-report.md)；[机器汇总](./fixtures/reports/service-coverage.json)）
- [x] `P1-RPT-03` 输出两国四类服务的价格、排班营业状态和当前 availability 已知/缺失率，区分原始字段、决策级可用性与不可测分母（2026-09-04；[缺失率报告](./docs/data/decision-field-missingness-report.md)；[机器汇总](./fixtures/reports/decision-field-missingness.json)）
- [x] `P1-RPT-04` 输出 Fuel 价格、EV 动态状态、静态修改时间及 OSM 编辑时间分布，并建立时区、过期值、坐标、重复 ID、功率、未来时间、关联与标签冲突异常目录（2026-09-04；[新鲜度/异常报告](./docs/data/freshness-anomaly-report.md)；[机器汇总](./fixtures/reports/freshness-anomaly-summary.json)）
- [x] `P1-RPT-05` 输出每个数据/路线依赖的风险、直接与运营成本、容量预算、监控、故障降级矩阵及不可自动关闭的发布门槛（2026-09-04；[风险/成本/降级报告](./docs/data/source-risk-cost-degradation-report.md)；[机器策略](./fixtures/reports/source-risk-cost-degradation.json)）
- [x] `P1-RPT-06` 根据真实数据保留四个服务入口，但收缩为能力感知 V1：Fuel 支持完整决策模式；Charge/Air/Wash 禁止无依据的 Cheapest/Available now，保留可信静态发现与明确 Unknown（2026-09-04；[ADR 0013](./docs/decisions/0013-v1-scope-after-data-feasibility.md)；[能力矩阵](./fixtures/reports/v1-scope-after-phase1.json)）

## Phase 1 验收门槛

- [x] 给定法国或西班牙 GPS，可在全部固定城市/郊区/机场/高速场景返回 10 km 内真实 Fuel Top 10（数据不足 10 条时不得填充；当前最少场景为 10 条）
- [x] Fuel 已支持统一 Nearest、Cheapest 和 scheduled Open now，并覆盖跨时区/跨午夜/Unknown 降级
- [x] 每项归一化 Fuel 结果均包含来源、来源 URL、source updated_at 依据及独立 fetched_at
- [x] Air/Wash 实际覆盖率、价格与设备状态缺失已量化
- [x] EV 静态密度、动态关联、新鲜度、价格与许可证/API 能力已量化
- [x] 产品范围已根据真实数据能力重新确认为能力感知 V1

---

# Phase 2 — 项目骨架与统一数据层

目标：把验证脚本演进为可维护、可扩展的正式后端。

## 2.1 工程基础

- [x] `P2-ENG-01` 将仓库初始化为 pnpm monorepo，建立 `apps/api`、`apps/mobile`、`packages/contracts`、`packages/config` 和现有 `packages/data-core` 的稳定职责/依赖边界（2026-09-04；[结构说明](./docs/architecture/repository-structure.md)）
- [x] `P2-ENG-02` 定义 development/test/production 三环境的解析优先级、隔离、安全默认值、API/worker 角色边界与 release-test 生产一致性，并提供共享解析器和 5 项测试（2026-09-04；[环境说明](./docs/architecture/environments.md)；95 tests）
- [x] `P2-ENG-03` 提供安全默认的根 `.env.example`，区分 API/worker/mobile 公开与服务端变量，所有同步/付费功能默认关闭、密钥留空，并验证真实 `.env*` 被 Git 忽略（2026-09-04；[配置与密钥说明](./docs/architecture/configuration-and-secrets.md)）
- [x] `P2-ENG-04` 配置 Prettier、ESLint、TypeScript 与 Vitest 的统一 `pnpm check` 质量门槛，锁定工具版本并提供自动格式化命令（2026-09-04；95 tests）
- [x] `P2-ENG-05` 配置 GitHub Actions，在 PR 和 `main` 推送时以 Node.js 24、锁定的 pnpm 和冻结 lockfile 执行同一 `pnpm check`，使用只读权限、测试环境和同步禁用安全边界（2026-09-04；[CI 说明](./docs/architecture/continuous-integration.md)）
- [x] `P2-ENG-06` 编写 Node.js 24/pnpm 10.28.2 首次安装、环境模板、统一质量门槛、workspace 命令、来源安全、逐任务提交流程和故障排查说明，并明确应用可执行入口的后续任务边界（2026-09-04；[本地开发指南](./docs/development/local-development.md)）

## 2.2 统一模型

- [x] `P2-MOD-01` 以 TypeBox 建立共享 `ServicePointSchema` 及派生 TypeScript 类型，覆盖身份、国家、非空服务分类、可空显示信息、WGS84 坐标、结构化地址、时区和 UTC 生命周期字段，并以 7 项运行时契约测试拒绝非法/未声明数据（2026-09-04；[契约说明](./docs/architecture/service-point-contract.md)）
- [x] `P2-MOD-02` 建立 Fuel point/offer/price/discount TypeBox 契约及派生类型，区分未知价格与零价、availability/缺货/原因/观测时间，并以语义校验保证 Fuel capability、燃油唯一性及 liter/kilogram 单位一致（2026-09-04；7 项新测试；[Fuel 契约说明](./docs/architecture/fuel-contract.md)）
- [x] `P2-MOD-03` 建立 ServicePoint → EVSE → connector → tariff 的 TypeBox 契约，支持静态未知与逐 EVSE 动态状态，以语义校验固定 EVSE 容量、动态观测时间、ID 唯一性和 availability 汇总一致性（2026-09-04；8 项新测试；[EV 契约说明](./docs/architecture/ev-contract.md)）
- [x] `P2-MOD-04` 建立 Air presence/working/free/price/access/verification/location/source evidence 契约，以语义校验要求 Air capability 与正向来源证据、已知设备状态时间，并拒绝 free/price 冲突（2026-09-04；6 项新测试；[Air 契约说明](./docs/architecture/air-contract.md)）
- [x] `P2-MOD-05` 建立 Wash presence/working/type/starting price/program/vacuum/interior/verification/source evidence 契约，以语义校验禁止 unknown 与已知类型混用、要求 program 类型声明并保持 starting price 为最低已知套餐价（2026-09-04；7 项新测试；[Wash 契约说明](./docs/architecture/wash-contract.md)）
- [x] `P2-MOD-06` 将四类服务统一为 Live/Verified/Recent/Stale/Unknown freshness 与 high/medium/low confidence/0–100 分数，要求每个 ServicePoint 携带来源/许可/独立 observed-published-fetched-computed 时间及可选字段级 provenance，并用语义校验禁止时间冒充、依据错配与分数错档（2026-09-04；8 项新测试；[来源质量契约](./docs/architecture/source-quality-contract.md)）
- [x] `P2-MOD-07` 将 FR/ES、EUR、WGS84 经纬度与结构化可空地址提取为四类服务共享 Schema，校验有限范围、地址非空信息、禁止 null/undefined 字面量、地址国家与站点国家一致及已知时区匹配（2026-09-04；7 项新测试；[地域与币种契约](./docs/architecture/geography-currency-contract.md)）
- [x] `P2-MOD-08` 将 service/fuel/EV connector 的不可变语言无关代码表、TypeBox Schema 与派生类型集中为唯一来源，适配器保留原标签且未知 connector 不得满足筛选、不得按功率猜类型（2026-09-04；5 项新测试；[枚举说明](./docs/architecture/canonical-enums.md)）
- [x] `P2-MOD-09` 建立规范化七日营业排班、当前状态/评估时间/临时关闭优先级和共享 availability assessment/unknown reason 契约，规定未知不等于 false/closed/unavailable/free/zero，并收紧 Fuel 库存与 EVSE operational 跨字段一致性（2026-09-04；10 项新测试；[营业与可用性契约](./docs/architecture/opening-availability-contract.md)）

## 2.3 数据库与同步

- [x] `P2-DB-01` 建立 PostgreSQL 18/PostGIS 3.6 SQL-first 数据库结构，覆盖 canonical 站点、四类服务、来源证据与同步记录；锁定本地镜像，提供可重复迁移和结构检查命令，并在真实 PostgreSQL 18.6/PostGIS 3.6 上连续执行两次迁移通过（2026-09-04；17 tables；164 tests；[数据库结构说明](./docs/architecture/database-schema.md)）
- [x] `P2-DB-02` 建立 1 个 PostGIS GiST 位置索引和 8 个国家/服务/状态/Fuel/EV 常用筛选索引，迁移执行器按编号顺序发现并跳过已记录版本；真实 PostgreSQL 验证索引 ready/valid，`EXPLAIN` 确认半径、服务类型和最新 Fuel 价格查询分别使用目标索引（2026-09-04；167 tests；[索引说明](./docs/architecture/database-indexes.md)）
- [x] `P2-DB-03` 以 `(source_id, source_record_id)` 保存并唯一约束来源原始身份，提供防旧数据覆盖的事务 upsert；真实数据库验证相同输入不变、较新输入原地更新、过时输入不覆盖且始终只有一条身份记录（2026-09-04；170 tests；[来源幂等说明](./docs/architecture/source-record-idempotency.md)）
- [x] `P2-DB-04` 建立 provider-neutral 分页原始数据导入与 PostgreSQL 增量 checkpoint，逐页事务原子提交 raw records + cursor/high watermark，支持恢复、取消、最大页数、停滞和时间倒退保护；真实数据库验证 checkpoint 推进后完整回滚（2026-09-04；178 tests；[增量导入说明](./docs/architecture/incremental-source-import.md)）
- [x] `P2-DB-05` 建立可解释的跨来源站点匹配与字段合并规则：仅可信共同 ID 或 100 m 内强地址一致可自动匹配，禁止仅凭距离/跨国/门牌冲突合并，近分候选进入 review；持久化版本化决定与理由并按时间+可信度合并字段（2026-09-04；190 tests；[去重合并说明](./docs/architecture/service-point-deduplication.md)）
- [x] `P2-DB-06` 以非破坏生命周期区分完整快照缺失、显式删除、来源撤回、临时/永久关闭与 Fuel 缺货/未知；较新重现可恢复 missing/deleted，撤回来源禁止继续写入，三类事件表保留历史且 RESTRICT 阻止硬删除（2026-09-04；201 tests；[生命周期说明](./docs/architecture/source-lifecycle.md)）
- [x] `P2-DB-07` 为每次 full/incremental 同步记录开始/完成时间、毫秒耗时、已提交页/记录数、失败页及限长脱敏错误；同一来源只允许一个 running run，终态不可重复完成，worker 失败后保留原错误供重试（2026-09-04；208 tests；[同步可观测性说明](./docs/architecture/sync-run-observability.md)）
- [x] `P2-DB-08` 建立可配置且有界的同步失败策略：临时错误采用带 jitter 的指数退避，永久/取消错误不重试，耗尽或永久失败写入去重告警 outbox；数据库原子记录失败决定、重试父子链与 due time，阻止提前/重复领取，并检测 stale run、追踪告警投递（2026-09-04；221 tests；[重试与告警说明](./docs/architecture/sync-retry-alerting.md)）
- [x] `P2-DB-09` 建立按国家+服务作用域的 PostgreSQL 查询缓存：只存 SHA-256 key、应用与数据库共同限制 TTL≤1 小时，以 generation token 防止计算/失效竞态；来源页仅在真实变化时于同一事务推进已登记 scope，旧代际立即不可读且可批量清理（2026-09-04；229 tests；[缓存失效说明](./docs/architecture/query-cache-invalidation.md)）
- [x] `P2-DB-10` 建立全合成、固定时钟与保留 ID 的可重复 PostgreSQL fixture，覆盖 FR/ES、Fuel/Charge/Air/Wash、关闭/缺货/Unknown、EVSE availability、新旧价格和跨境场景；标准数据库验证连续加载两次、核对精确行数与语义后完整回滚（2026-09-04；233 tests；[fixture 说明](./docs/testing/database-integration-fixture.md)）

## Phase 2 验收门槛

- [x] 两国 Adapter 可通过统一接口执行
- [x] 数据能重复同步且不会制造重复记录
- [x] 数据库可按位置、服务类型和状态高效查询
- [x] 同步失败可被发现、重试和追踪

---

# Phase 3 — 搜索、路线与决策引擎

目标：实现“直接告诉用户去哪”的核心能力。

## 3.1 搜索与路线

- [x] `P3-SEA-01` 使用 PostGIS geography + GiST 按经纬度、1 m–100 km 半径和 canonical service 粗筛候选，返回精确米制直线距离与目标坐标并稳定排序；默认/最大候选 200/500，排除永久关闭但保留临时关闭与 Unknown 给后续决策，应用和数据库双重校验且不持久化 origin（2026-09-04；241 tests；[候选搜索说明](./docs/architecture/service-point-candidate-search.md)）
- [x] `P3-SEA-02` 以可配置倍数逐级扩大候选半径，达到最少候选立即停止；默认上限 50 km、绝对上限 100 km，最终尝试钳制到上限，候选仍不足时返回真实部分结果及明确 stop reason，不填充且不持久化位置（2026-09-04；246 tests；[扩圈搜索说明](./docs/architecture/expanding-candidate-search.md)）
- [x] `P3-SEA-03` 按直线距离稳定选取 Top N，通过 provider-neutral 1×N Matrix 计算驾车距离和 ETA，并按 canonical ID 安全合并；实现 Mapbox adapter，显式限制 traffic 请求为 1 origin + 最多 9 destinations，返回计算时间、profile、traffic/cache metadata，未进入 Top N 的候选保留且明确标记未请求（2026-09-04；252 tests；[Top N 路线说明](./docs/architecture/top-candidate-routing.md)）
- [x] `P3-SEA-04` 建立不持久化精确 origin 的单目的地路线缓存：三位小数 origin cell 仅进入 SHA-256 key，TTL 默认 5 分钟/最大 15 分钟；只为 cache miss 原子预留月度 Matrix elements，预算 0 禁止付费 miss，持久记录 request/reserved/success/failed 且结算不可重复，单次最多 9 elements（2026-09-04；264 tests；[路线缓存与预算说明](./docs/architecture/route-cache-budget.md)）
- [x] `P3-SEA-05` 将 Mapbox null matrix cell 标记为单目的地 unreachable；2.5 秒默认/10 秒最大超时、HTTP 429 reset、网络/HTTP 和非法响应均映射为脱敏 reason code，预算拒绝不发请求；无论 partial 或整体失败均保留全部候选与直线距离，ETA/road distance 保持 null，不盲目重试或伪造值（2026-09-04；268 tests；[路线失败降级说明](./docs/architecture/route-failure-degradation.md)）
- [x] `P3-SEA-06` 实现不可变、稳定的 Nearest 排名：有有效路线时按 ETA、road distance、直线距离、canonical ID 排序；unreachable/unavailable/not requested 候选保留 reason 并在其后按直线距离+ID 降级排序，每项明确标记 driving_eta 或 straight_line_distance，拒绝不一致路线与重复 ID（2026-09-04；273 tests；[Nearest 排名说明](./docs/architecture/nearest-ranking.md)）
- [x] `P3-SEA-07` 实现 capability-aware Cheapest：仅当 Fuel 的指定 canonical fuel 存在 current、EUR、正确单位、非缺货且非会员专属的可比较价格时启用；stale/unknown/missing/unavailable 不获得价格优势，Charge/Air/Wash 返回 `price_not_available_for_service`，Fuel 无合格价格返回 `no_eligible_fuel_price`，共享契约固定 capability 状态与可本地化 reason code（2026-09-04；288 tests；[Cheapest 说明](./docs/architecture/capability-aware-cheapest.md)）
- [x] `P3-SEA-08` 实现 capability-aware Open now：数据库分别保存并查询站点与服务专属排班状态；Fuel 仅使用站点证据，Charge/Air/Wash 仅在当前结果含服务专属证据时以 conditional 启用；Open/Closing soon 通过，Closed/Opening soon/Unknown 不通过，临时关闭始终覆盖排班（2026-09-04；300 tests；[Open now 说明](./docs/architecture/capability-aware-open-now.md)）
- [x] `P3-SEA-09` 处理无结果、价格未知和状态未知：共享 SearchOutcome 契约区分半径内无站点、无可比价格、全部排班 Unknown、已知但全部关闭、能力不可用和其他无匹配；Unknown 价格/营业/设备/ETA 以精确计数和本地化 warning 保留，分别给出 expand radius 或 show Nearest 安全回退并拒绝矛盾计数（2026-09-04；315 tests；[结果状态说明](./docs/architecture/search-empty-and-unknown-outcomes.md)）

## 3.2 营业时间

- [x] `P3-OPEN-01` 将法国 `horaires` 内嵌 JSON/`HH.mm`/关闭标记与西班牙 `Horario` 文本/西语星期/范围统一到同一 country-aware 解析入口；两国 Adapter 移除重复解析代码，保留来源字段、partial warning、法国自助 Fuel 标记与西班牙未证明日期 Unknown 边界（2026-09-04；322 tests；[解析器说明](./docs/architecture/source-opening-hours-parser.md)）
- [x] `P3-OPEN-02` 固化两国 24/7、跨午夜、分段营业及开门含/关门不含边界：仅法国 `00.00–00.00` 与西班牙 `24H` 可声明全天，24/7 标记必须由 7 个完整日期支撑；跨日延续至次日本地关门时刻，分段区间去重稳定排序，非零点同开同关降级而不误判全天（2026-09-04；329 tests；[高级营业时间说明](./docs/architecture/advanced-opening-hours.md)）
- [x] `P3-OPEN-03` 所有排班按服务点 IANA 时区求值：法国固定 `Europe/Paris`、西班牙固定 `Europe/Madrid`，覆盖冬/夏 UTC 偏移、UTC 跨日本地星期、春季跳时与秋季重复小时；国家与时区不匹配、未知或不支持时即使有 24/7 自助标记也降级 Unknown（2026-09-04；334 tests；[时区说明](./docs/architecture/opening-hours-timezones.md)）
- [x] `P3-OPEN-04` 增加 regular/public holiday/unknown 日历上下文与 `holiday_hours_unknown` 共享提示/计数：普通周排班在节假日或日历未知时不宣称营业，并单独统计 holiday Unknown；明确临时关闭优先于排班、站点 24/7 和无人 Fuel 24/7，后者可在无关闭证据时作为更强全天证据（2026-09-04；339 tests；[节假日与临时关闭说明](./docs/architecture/holiday-and-temporary-closure.md)）
- [x] `P3-OPEN-05` 区分缺失、部分可解析与完全无法解析的营业时间：空/畸形/重复法国日期和错误西班牙类型均输出稳定 warning，未知排班不误判 Open/Closed，防御性求值拒绝结构异常且保留服务点其他数据（2026-09-04；347 tests；[无法解析营业时间降级说明](./docs/architecture/unparseable-opening-hours.md)）

## 3.3 Best 排名

- [x] `P3-BEST-01` 定义 0–1 PriceScore：最低可比价得 1，其余按最低价/当前价计分，Unknown 得 0，覆盖免费价格、并列、异常数值、重复 ID 与高价离群值稳定性，输出可解释 basis 和比较基准（2026-09-04；354 tests；[PriceScore 说明](./docs/architecture/best-price-score.md)）
- [x] `P3-BEST-02` 定义 0–1 DistanceScore 与 TravelTimeScore：全量候选统一按最近直线距离/当前距离计分，真实路线候选按最快 ETA/当前 ETA 计分，未知 ETA 得 0 且不伪造，覆盖并列、零值、空集、异常输入与离群值稳定性（2026-09-04；362 tests；[距离与 ETA 评分说明](./docs/architecture/best-distance-travel-time-scores.md)）
- [x] `P3-BEST-03` 定义 OpenScore 与 AvailabilityScore：Open=1、Closing soon=0.75、Opening soon=0.25，Closed/Unknown=0 且临时关闭强制覆盖；仅明确 Available 获得可用性正分，其他 canonical 状态均不推断可用，并保留解释 basis（2026-09-04；378 tests；[营业与可用性评分说明](./docs/architecture/best-open-availability-scores.md)）
- [x] `P3-BEST-04` 定义 FreshnessScore 与 ReliabilityScore：Live/Verified/Recent=1、Stale=0.5、Unknown=0；复用既有 0–100 confidenceScore 归一化并强制 high/medium/low 区间一致，避免重复应用来源质量惩罚且不将分数表述为准确率（2026-09-04；388 tests；[数据质量评分说明](./docs/architecture/best-data-quality-scores.md)）
- [x] `P3-BEST-05` 定义可版本化 `fuel-best-v1`：Price 30%、Distance 10%、TravelTime 20%、Open 15%、Availability 10%、Freshness 7.5%、Reliability 7.5%，输出逐项贡献；目标燃油未提供、明确不可用或站点关闭硬排除，其他 Unknown 保留但无对应正分，并固定稳定决胜顺序（2026-09-04；395 tests；[Fuel Best 公式](./docs/architecture/fuel-best-formula.md)）
- [x] `P3-BEST-06` 将预计购买量、同单位车辆百公里消耗、总额外绕路距离与统一参考燃油价组合为 PurchaseCost + DetourCost，并将完整总成本接入 Fuel PriceScore；不猜默认油耗/加油量，缺失项逐一返回 Unknown，覆盖零绕路与 CNG/LNG kilogram 单位（2026-09-04；403 tests；[Fuel 购买与绕路成本模型](./docs/architecture/fuel-trip-cost-model.md)）
- [x] `P3-BEST-07` 定义 price-free `ev-best-v1`：Distance 15%、TravelTime 25%、兼容额定功率 25%、Open 15%、Availability 10%、Freshness 5%、Reliability 5%，输出逐项贡献；完整 Time-to-Solution 必须同时具备 Driving ETA、Queue Wait、Charging Duration，否则明确 incomplete 且总时长为 null（2026-09-04；411 tests；[EV Best 与 Time-to-Solution 公式](./docs/architecture/ev-best-time-to-solution-formula.md)）
- [x] `P3-BEST-08` 将真实 ETA、精确 connector 兼容及相对兼容额定功率接入 `ev-best-v1`；法国 availability 仅在 QualiCharge 来源、身份、同步/观测新鲜度、冲突隔离与 connector live 状态全部合格时得正分，西班牙保持 Unknown；等待时间、实际充电时长和价格继续为 null/不启用（2026-09-04；421 tests；[EV Best 证据门槛](./docs/architecture/ev-best-evidence-gates.md)）
- [x] `P3-BEST-09` 定义 `limited-service-best-v1`：Air 仅使用 Distance、服务专属 Open、明确 public Access 与来源 Reliability，Wash 仅使用 Distance、服务专属 Open 与 Reliability；不可用因子在整个结果集统一重分权重，单个候选 Unknown 得零且不因缺失获益，若只剩 Distance 则明确 `nearest_equivalent`；价格、实时设备可用性及 Wash 类型不参与并返回降级原因（2026-09-04；430 tests；[Air/Wash Best 降级规则](./docs/architecture/air-wash-best-degradation.md)）
- [x] `P3-BEST-10` 建立字段级 Best 证据质量策略：Missing、Expired、freshness/confidence Unknown 均无正分，stale Price/Availability 无决策优势，普通 stale 因子减半，medium/low confidence 再按最终 0–100 分数缩减；EV Power/Open/Availability 与 Air/Wash 服务营业/访问已接入，并输出稳定 disposition/reason 供解释层复用（2026-09-04；444 tests；[Best 证据质量降权](./docs/architecture/best-evidence-quality-adjustment.md)）
- [x] `P3-BEST-11` 建立共享 RecommendationReason 契约与 Best 解释生成器：按加权贡献稳定选择最多 3 个正向理由，成本/价格/距离/ETA/可用 EVSE 数/兼容额定功率/可信分均携带类型匹配的具体数值，同时去重返回能力缺失、Nearest 降级、TTS incomplete、stale/expired/low-confidence 等限制；原因码不含硬编码语言，可由 FR/ES/EN 客户端直接本地化（2026-09-04；460 tests；[Best 推荐解释](./docs/architecture/best-recommendation-explanations.md)）
- [x] `P3-BEST-12` 完成 Nearest、Cheapest、Open now、Fuel/EV/Air/Wash Best 的跨规则边界矩阵，新增 13 项空集/端点/Unknown/稳定并列/非法数字与枚举/重复身份/不变性/硬排除测试；同时修复 Nearest 非法直线距离、Cheapest 关闭站低价与非法 freshness、Open now 非法状态及 EV TTS 安全整数溢出问题（2026-09-04；473 tests；[排序边界测试矩阵](./docs/testing/ranking-boundary-matrix.md)）

## 3.4 后端 API

- [x] `P3-API-01` 建立可运行 Fastify 应用与 `GET /v1/nearby`：经可注入 CandidateSearchPort 调用 PostGIS 候选搜索并按 10 km→50 km 有界扩圈，返回最多 50 个基础 canonical 服务点及完整扩圈元数据；TypeBox 拦截缺失/越界/未知参数，精确 origin 不回显、不持久化，生产入口启动前校验监听与数据库配置（2026-09-04；479 tests；[附近搜索 API](./docs/architecture/nearby-search-api.md)）
- [x] `P3-API-02` 实现 `GET /v1/service-points/:id`：通过可注入 ServicePointDetailPort 与参数化 PostgreSQL 主键查询返回 canonical 身份、服务类型、坐标/结构化地址、时区、营业和生命周期详情；非法 UUID 在数据访问前返回 400，未知 UUID 返回带 requestId 和稳定代码的 404，数据库映射拒绝损坏字段；价格、设备状态与来源质量保留给 P3-API-06（2026-09-04；485 tests；[服务点详情 API](./docs/architecture/service-point-detail-api.md)）
- [x] `P3-API-03` 为 `GET /v1/nearby` 建立完整基础控制：country 可选且省略时保留跨境搜索，service 必填，radius 为 1–50,000 m 的显式硬边界且不越界扩圈，sort 支持 nearest/cheapest/open_now/best 并默认 Nearest；Nearest 稳定排序、Open now 使用正确范围的营业证据，尚待 Fuel/EV 筛选与完整证据的 Cheapest/Best 明确降级到 Nearest 并返回原因；迁移 0013 在 PostGIS 内参数化过滤国家（2026-09-04；490 tests；[附近搜索控制](./docs/architecture/nearby-search-controls.md)）
- [x] `P3-API-04` 为 `GET /v1/nearby` 增加可选 canonical fuelType：仅允许与 Fuel 服务组合并在数据访问前拒绝未知枚举/跨服务参数，PostGIS 参数化 EXISTS 只保留明确匹配的 fuel_offer；临时缺货与 Unknown 仍作为可解释候选，permanent_non_offering 不满足筛选；响应回显目标油品，Cheapest 在 P3-API-06 接入可比价格前明确以 decision_evidence_unavailable 降级（2026-09-04；494 tests；[Fuel 类型过滤](./docs/architecture/nearby-fuel-filter.md)）
- [x] `P3-API-05` 为 `GET /v1/nearby` 增加可独立或组合使用的 connectorType 与 minimumPowerKw（1–1,000 kW）：仅允许 Charge 服务并在数据访问前拒绝 unknown/非法接口、越界功率与跨服务组合；PostGIS 参数化 EXISTS 要求同一 operational connector 同时满足所有条件，避免跨设备拼接类型和功率，同时保留 operational Unknown 候选；响应回显有效筛选，Best 在完整证据接入前明确降级（2026-09-04；500 tests；[EV connector 过滤](./docs/architecture/nearby-ev-filter.md)）
- [x] `P3-API-06` 为附近结果和详情页接入同一批量证据读取/响应契约，返回独立营业与服务状态、可空价格、按 country+service 选择的 source/许可/时间、请求时重算 freshness、非伪造 confidence 及四服务专属字段；Fuel Cheapest 仅在当前可比价格存在时启用，stale/expired/Unknown/会员价无低价优势，无合格价格明确降级，Charge price/live availability 保持政策性 Unknown；真实 Node/pg + 全新 PostgreSQL/PostGIS 四服务 fixture 查询通过（2026-09-04；509 tests；[API 服务证据](./docs/architecture/api-service-evidence.md)）
- [x] `P3-API-07` 统一所有 API 错误为 requestId/code/message/retryable 契约，区分 schema、筛选组合、未知路由/站点与脱敏内部错误；附近搜索同时返回请求 capability、实际 appliedSort 与共享 SearchOutcome，精确表达空结果、Nearest 回退及价格/营业/设备/路线 Unknown 计数，避免把降级结果伪装成请求模式成功（2026-09-04；513 tests；[API 错误与结果](./docs/architecture/api-errors-and-outcomes.md)）
- [x] `P3-API-08` 在既有 TypeBox 严格输入校验上增加显式 CORS 白名单、每客户端 60/min 默认限流（含未知路由）、16 KiB 默认 body 上限、Helmet/no-store 响应头与生产 HTTPS 门槛；只信任显式 IP/CIDR 代理，默认忽略伪造 Forwarded headers；关闭含精确坐标 URL 的内置日志并仅记录 route template，固定 Fastify 5 兼容插件版本，同时声明多实例发布前需共享 limiter store（2026-09-04；521 tests；[API 输入与安全边界](./docs/architecture/api-input-rate-security.md)）
- [x] `P3-API-09` 从运行时 TypeBox schema 生成并提供 OpenAPI 3.0 契约，记录附近搜索、详情、筛选兼容性、能力降级、统一错误与安全限制；四份 JSON 响应示例由自动测试持续校验，防止文档和接口漂移（2026-09-04；523 tests；[API 文档](./docs/api/README.md)）
- [x] `P3-API-10` 将批量证据与有预算的 Top N 路线并行接入统一附近接口，公开安全 ETA/道路距离和 Fuel/Charge/Air/Wash 的版本化 Best 分数及推荐理由；Mapbox 未配置、超预算、超时或失败时保留直线距离结果；50 候选请求固定为 1 次搜索+1 次批量证据+最多 9 个路线目的地，20 次暖机后请求满足 500 ms p95 回归上限；干净 PostgreSQL 18/PostGIS 3.6 全迁移与 fixture 验证通过（2026-09-07；Node.js 24 全量 530 tests；[集成与性能验收](./docs/testing/api-integration-performance.md)）

## Phase 3 验收门槛

- [x] 四类服务均可通过统一 API 搜索
- [x] Nearest、Cheapest、Open now、Best 均按 ADR 0013 capability matrix 返回明确一致的 enabled/conditional/unavailable 行为
- [x] Best 结果包含可理解的推荐理由
- [x] 数据缺失或第三方服务失败时仍能提供合理降级结果

---

# Phase 4 — V1 客户端

目标：让用户能在约 10 秒内从打开产品到开始导航。

## 4.1 基础体验

- [x] `P4-APP-01` 建立 Expo SDK 57 + React Native 0.86 + Expo Router 客户端骨架，固定兼容依赖；提供公开环境配置、生产 HTTPS 校验、从 OpenAPI 自动生成的请求/响应类型及超时/取消/脱敏错误通信层；CI 纳入生成契约漂移检查、客户端测试和双平台 bundle 导出（2026-09-07；Node.js 24 全量 548 tests、Expo 依赖检查和 iOS/Android bundle 导出通过；[客户端说明](./apps/mobile/README.md)、[ADR 0014](./docs/decisions/0014-mobile-foundation.md)）
- [x] `P4-APP-02` 实现用户主动触发的前台位置授权和内存会话，接受近似定位，覆盖拒绝/永久拒绝/系统关闭/超时/取消；退出后台清除位置并忽略迟到响应，原生声明不含后台/Always/运动权限（2026-09-07；全量 563 tests、双平台 bundle、原生权限配置检查通过；[验收记录](./docs/testing/mobile-location.md)）
- [x] `P4-APP-03` 实现离线城市搜索与坐标输入，八个 ADR 0005 城市中心明确标注为搜索基点；支持负经度和逗号小数，无权限也可选择，手动选择取消迟到 GPS 覆盖且不存储输入（2026-09-07；全量 573 tests、双平台 bundle 通过；[验收记录](./docs/testing/mobile-location.md)）
- [x] `P4-APP-04` 实现 EN/FR/ES 设备语言匹配、即时切换、本地偏好保存与清除；所有已实现页面及弹窗共用类型化三语目录，iOS 权限文案本地化；处理迟到读取、连续写入和存储失败（2026-09-07；全量 580 tests、双平台 bundle 及原生语言配置检查通过；[验收记录](./docs/testing/mobile-localization.md)）
- [x] `P4-APP-05` 实现首页 Fuel、Charge、Air、Wash 四个入口 — 2026-09-07：四服务三语入口、会话内选择和标准搜索参数；586 tests 与双平台 bundle 通过

## 4.2 搜索结果

- [x] `P4-RES-01` 实现列表优先的结果页 — 2026-09-07：真实 API 列表、三语状态、取消与重试；603 tests 和双平台 bundle 通过
- [x] `P4-RES-02` 实现 capability-aware Nearest/Cheapest/Open now/Best 切换，隐藏或解释不可用能力 — 2026-09-07：四排序、燃油选择、服务器能力/原因三语解释；622 tests 和双平台 bundle 通过
- [x] `P4-RES-03` 显示名称、地址、距离和 ETA — 2026-09-07：同一候选 SQL 查询读取地址，无 N+1；路线/直线距离和未知 ETA 明示；624 tests、双平台 bundle 通过
- [x] `P4-RES-04` 显示价格、营业状态和服务状态 — 2026-09-07：价格单位、税费/会员条件及新鲜度展示；营业与设备状态分离；626 tests、类型/格式检查通过
- [x] `P4-RES-05` 显示数据更新时间、来源和可信度 — 2026-09-07：来源观察/发布时间与抓取时间分别显示，保留归属和许可信息，可信度三语显示；627 tests 通过
- [x] `P4-RES-06` 显示 Fuel 类型、价格和缺货信息 — 2026-09-07：已列油种、所选油种/油价时间和三态缺货展示；628 tests 通过
- [x] `P4-RES-07` 显示 EV 功率、接口、条件可用数量；价格不可比较或西班牙动态未启用时明确显示 Unknown — 2026-09-07：额定功率/接口/EVSE 数展示；法国可用数量须满足五分钟时效和一致性，西班牙动态与充电价格明确未知；全量 629 tests 及修订后 99 客户端测试通过
- [x] `P4-RES-08` 显示 Air 免费/收费/未知和设备状态 — 2026-09-07：免费/收费/未知、设备故障及顾客限制分别展示；102 客户端测试和类型检查通过
- [x] `P4-RES-09` 显示 Wash 类型和价格 — 2026-09-07：七类洗车项目、设备状态和原有单位化价格展示，空类型/无价格保持未知；103 客户端测试和类型检查通过
- [x] `P4-RES-10` 显示 Best 推荐理由 — 2026-09-07：22 个后端理由码完整三语映射，保留限制和指标单位，无推荐对象时不编造理由；635 tests 与双平台 bundle 通过
- [x] `P4-RES-11` 实现服务点详情页 — 2026-09-07：UUID 详情路由、真实多服务资料、来源证据、营业原文与生命周期；通用可取消请求复用；637 tests 和双平台 bundle 通过
- [x] `P4-RES-12` 实现地图第二层视图 — 2026-09-07：与列表同批标记/详情选择，无位置层；Apple/Google 平台配置与缺 key 降级；639 tests 和双平台 bundle 通过；Android 发布密钥与真机地图留在 Phase 5

## 4.3 导航与异常状态

- [x] `P4-NAV-01` 一键打开 Apple Maps/Google Maps 等导航 — 2026-09-07：列表/详情使用 Apple/Google HTTPS 导航链接，只含公共目的地；禁止关闭/无效目的地，提供失败反馈；643 tests 通过
- [x] `P4-NAV-02` 记录搜索曝光、选择和导航点击事件 — 2026-09-07：默认关闭的会话 opt-in，曝光去重、结果选择、导航点击/交接事件；白名单无坐标/地址/上传、100 条/15 分钟清除；645 tests 通过；ADR 0015 记录远程统计未开启
- [x] `P4-ERR-01` 实现加载和刷新状态 — 2026-09-07：区分首次加载/刷新，提供下拉刷新、取消和取消后重新搜索；不把旧结果显示为新结果；115 客户端测试和类型检查通过
- [x] `P4-ERR-02` 实现无位置权限状态 — 2026-09-07：结果页内提供重新定位/手动位置入口；拒绝与永久拒绝均可继续四服务搜索，清理后不保留起点；117 客户端测试通过
- [x] `P4-ERR-03` 实现无网络和服务异常状态 — 2026-09-07：断网/超时/限流/服务错误/404/无效数据分型三语提示；从后端 schema 静态生成全响应校验器并纳入漂移 CI，无运行时编译；654 tests 和双平台 bundle 通过
- [x] `P4-ERR-04` 实现附近无结果状态 — 2026-09-07：六类空结果三语原因，明确搜索半径；Nearest/扩大范围仅在有用且不超过 50 km 时提供，保留手动换位置/筛选；126 客户端测试通过
- [x] `P4-ERR-05` 实现数据过期或状态未知提示 — 2026-09-07：字段级陈旧/未知/低可信度提示，营业/可用状态观察时间分离；统一时钟使过期充电状态退回未知；128 客户端测试通过
- [x] `P4-A11Y-01` 检查大按钮、颜色对比和基本无障碍 — 2026-09-07：52 点操作按钮、显式选中/展开语义、文字/边框对比度和三语组件交互；144 客户端测试、类型与 lint 通过；设备读屏/大字体验收保留 Phase 5；见 docs/testing/mobile-accessibility.md

## Phase 4 验收门槛

- [x] 用户可通过四个入口完成搜索 — 四服务 × 三语言组件流程通过
- [x] 首屏直接给出列表式决策结果 — 默认 FlatList，无自动地图；筛选/完整证据二级展开
- [x] 用户能识别结果的价格、状态和可信度 — 独立字段、单位/条件、未知/过期提示及三语组件测试通过
- [x] 用户可从任一有效结果开始外部导航 — 列表/详情安全目的地链接通过；真实系统交接留作 Phase 5 设备验收
- [x] FR、ES、EN 三种语言结构完整且无硬编码遗漏 — 类型化目录与十二条三语组件流程通过，品牌/来源原文及规范单位保留

2026-09-07：687 tests、全量质量门槛、iOS/Android bundle 和四服务真实 PostGIS 地址读取通过；详见 [Phase 4 验收记录](./docs/testing/phase4-acceptance.md)。真机、发布密钥、上线数据与合规属于 Phase 5，未冒充已完成。

---

# Phase 5 — 测试、合规与发布准备

## 5.1 自动化与数据质量

- [x] `P5-QA-01` 为所有 Adapter 编写单元测试 — 2026-09-07：2 个正式 Adapter 与西班牙补充关联覆盖；新增 20 项边界/自动库存测试，data-core 160 tests 与类型检查通过；EV/OSM 正式采集缺口详见 docs/testing/phase5-adapter-matrix.md
- [x] `P5-QA-02` 为统一字段转换编写测试 — 2026-09-07：新增 8 项国家身份/单位/缺失证据边界，修复法国未提供自助支付标志被误映射为 false；168 data-core + 83 contract tests 通过；见 docs/testing/phase5-field-conversion.md
- [x] `P5-QA-03` 为排序和 Best 评分编写测试 — 2026-09-07：新增 11 项、两组 64 候选排序不变性/有界分数/贡献核对/单调性与 Air/Wash 降级测试；306 API tests 与类型检查通过；见 docs/testing/phase5-ranking-regression.md
- [x] `P5-QA-04` 为营业时间和时区编写测试 — 2026-09-07：新增 6 项含两时区 2,928 个全年边界断言；修复来源时间在夏令时缺失/重复小时被猜测为确定时刻；174 data-core tests 与类型检查通过；见 docs/testing/phase5-calendar-regression.md
- [x] `P5-QA-05` 建立价格异常检测 — 2026-09-07：新增显式命令审计最新燃油价格/单位/未来时间/同单位日内突变；12 项检测测试，318 API tests、类型与 lint 通过；真实空库返回 coverage=empty/exit 2，不误报通过；见 docs/testing/price-anomaly-audit.md
- [x] `P5-QA-06` 建立错误坐标和重复站点检测 — 2026-09-07：新增 9 项非法/交换/零坐标、地域边界和强身份重复测试；183 data-core tests、API 类型和 lint 通过；真实空库 exit 2；不自动合并/修复，最大 2,000 点显式范围；见 docs/testing/geography-duplicate-audit.md
- [x] `P5-QA-07` 测试城市、郊区、高速和跨境区域 — 2026-09-07：六个城市/郊区/高速场景新增半径单调性/稳定排序/范围检查，既有 La Jonquera 21 FR + 67 ES 跨境精确矩阵通过；189 data-core tests；仅历史来源样本，非实时上线验收；见 docs/testing/phase5-geographic-regression.md
- [x] `P5-QA-08` 测试弱网、无网、来源中断和路线 API 失败 — 2026-09-07：客户端对不响应取消的 headers/body 增加强制截止，来源断点恢复和四类路线故障保留结果；全量 765 tests、质量门槛和双平台 bundle 通过；见 docs/testing/phase5-failure-recovery.md
- [x] `P5-QA-09` 进行接口负载与响应时间测试 — 2026-09-07：独立临时库应用 15 项迁移，四服务四排序、4/8 并发各 160 请求零错误，p95 6.12/7.90 ms；临时库已删除；全量 771 tests 与质量门槛通过；本地小样本非生产 SLA；见 docs/testing/phase5-local-load.md
- [ ] `P5-QA-10` 人工抽查真实站点、价格和营业状态 — 进行中：当前来源 40 个站点、两国四服务 API 联合工程核对已完成；原生端/现场价格与营业人工验收未完成，见 [联合证据](./docs/testing/phase5-joint-live-services.md)
  - [x] `P5-QA-10a` 补齐 France/Spain Fuel 到 canonical 字段的可测试投影，保留来源/单位/未知与时效语义（2026-09-07；稳定 UUID、共享契约校验、8 项投影测试；[设计说明](./docs/architecture/canonical-source-import.md)）
  - [x] `P5-QA-10b` 实现统一库事务写入、来源关联和重复导入/失败恢复验证，不覆盖未经核实的其他来源证据（2026-09-07；0016 migration、来源所有权、当前价格指针、13 类真实临时库检查；全量 827 tests 通过）
  - [x] `P5-QA-10c` 接通已批准公开 Fuel 来源的有界采集、显式执行开关和同步记录（2026-09-07；16 项新增测试，全量 843 tests；法国 1 站、西班牙 17 站当前数据在临时库通过来源→SQL→API 检查；不是全国生产同步或真机验收）
  - [x] `P5-QA-10d` 补齐获准开发的 EV/OSM 来源链路，严格保留许可证与动态能力限制（2026-09-07；下列四个细项完成；仅限有界开发验证，动态数据、全国生产快照、生产 OSM 提供方及公开 Beta 许可并未批准）
    - [x] `P5-QA-10d1` France PAN / Spain RIPREE 静态字段与站点/EVSE/连接器层级投影，异常隔离及联系人字段最小化（2026-09-07；12 项测试；静态信息不产生实时状态或价格）
    - [x] `P5-QA-10d2` 补充来源独立身份、事务写入及四服务 SQL 回归（2026-09-07；通用 canonical 写入器、4 项边界测试，真实临时库四服务 API/EV 层级/动态证据保护通过）
    - [x] `P5-QA-10d3` 官方 EV 快照有界读取、完整站点分组、更新/失败报告与原始内容摘要（2026-09-07；12 项解析/网络门禁测试；当前 FR 167,383 行、ES 43,610 行，所选站点 47/13 EVSE 实际临时库验证；全量 871 tests 通过；不是全国生产发布）
    - [x] `P5-QA-10d4` OSM 正面标签投影及开发导入，保留 ODbL 边界，不开启每次用户搜索的公共 Overpass 请求（2026-09-07；10 项测试，Toulouse 21 / Barcelona 20 个当前元素通过真实临时库与 Air/Wash API 检查）
  - [x] `P5-QA-10e` 在隔离数据库用当前官方数据跑通四服务 API 并核对真实站点，未支持字段保持 Unknown（2026-09-07；五类来源、40 个 canonical 站点，同一临时库验证 FR/ES × 四服务 × 四排序，32 搜索 + 8 详情请求全部通过；[联合证据](./docs/testing/phase5-joint-live-services.md)）
  - [ ] `P5-QA-10f` 取得实际原生设备及人工抽查证据后关闭整项，不用 fixture 替代

## 5.2 隐私与合规

- [ ] `P5-LEG-01` 完成隐私政策 — 阻塞：待确认运营主体、公开联系邮箱及实际部署处理方
- [ ] `P5-LEG-02` 完成使用条款和免责声明
- [ ] `P5-LEG-03` 确认位置数据采集遵守 GDPR 最小化原则 — 进行中：原生配置工程检查完成，最终安装包/真机与处理方审查待完成
  - [x] `P5-LEG-03a` 移除多余 Android 权限、关闭备份并建立双平台生成配置 CI 检查 — 2026-09-07：11 个新增测试，170 mobile tests、类型、lint 与真实 introspect 通过；见 docs/testing/phase5-location-minimization.md
- [ ] `P5-LEG-04` 检查所有数据源署名和许可证要求
  - [x] `P5-LEG-04a` 增加三语来源许可目录及结果卡默认可见署名/许可链接（2026-09-07；目录、链接失败与三语导航回归；不代表 OSM 合库或 MITECO 最终法律复核通过；见 docs/testing/phase5-source-notices.md）
- [ ] `P5-LEG-05` 检查第三方地图与路线服务展示条款
  - [x] `P5-LEG-05a` 核对当前地图/外部导航技术边界并修复不受支持的单元素路线请求（2026-09-07；3 项新增回归，网络与预算预留前降级，账户条款/缓存许可/真机署名仍待最终验证；见 docs/testing/phase5-map-provider-review.md）
- [x] `P5-LEG-06` 确认监控与分析不记录不必要的精确位置 — 2026-09-07：当前应用范围通过；移除任意异常文本/名称，SQL reporter 二次白名单过滤，9 项隐私回归及 337 API tests 通过；部署网关/未来 SDK 须在 REL-02 重验，见 docs/testing/phase5-log-privacy.md

## 5.3 发布准备

- [ ] `P5-REL-01` 建立测试和生产部署流程 — 进行中：容器工程包完成；实际测试/生产环境、域名与部署验证待确认
  - [x] `P5-REL-01a` 固定运行镜像、生产依赖与无网络只读容器 CI 冒烟 — 2026-09-07：本地构建与 200/400 API 冒烟通过，不含生产数据或部署验收；见 docs/testing/phase5-portable-runtime.md
  - [x] `P5-REL-01b` 离线发布配置预检及生产 TLS/代理信任保护（2026-09-07；14 新测试，451 API tests 与类型检查通过；未知配置留空，不连接部署环境；见 docs/testing/phase5-deployment-preflight.md）
- [ ] `P5-REL-02` 建立错误监控、性能监控和数据同步告警 — 进行中：只读运行检查完成，常驻采集/调度、通知投递及真实告警演练待完成
  - [x] `P5-REL-02a` 聚合运行检查与空库/同步/重试/告警积压检测 — 2026-09-07：14 项新增测试，361 API tests，真实空库 exit 2 与独立非空 fixture SQL/HTTP 验证通过；见 docs/testing/phase5-operational-checks.md
  - [x] `P5-REL-02b` 隐私安全告警投递、强制超时、持久重试间隔与并发锁（2026-09-07；10 新测试，461 API tests；真实隔离 SQL + 本地接收函数验证；外部投递/调度仍待资料；见 docs/testing/phase5-alert-dispatch.md）
  - [x] `P5-REL-02c` 隐私安全运行日志错误率/限流/延迟分位数汇总（2026-09-07；9 新测试，空样本/无效输入不误报健康、固定端点维度与资源限制；真实平台采集/通知待配置；见 docs/testing/phase5-api-log-metrics.md）
- [ ] `P5-REL-03` 准备 Beta 发布说明和反馈渠道
  - [x] `P5-REL-03a` 准备三语 Beta 说明草稿和隐私安全反馈表（2026-09-07；不发布构建、不创建 issue；实际渠道/责任人与私密支持仍待确认；见 docs/testing/beta-release-notes.md）
- [ ] `P5-REL-04` 完成核心用户流程回归测试
  - [x] `P5-REL-04a` 移动端真实请求/状态控制/三语展示到 HTTP/PostGIS 跨层回归（2026-09-07；48 搜索 + 12 详情、跨境与 400/404/429，共 65 次 HTTP 请求通过；不是原生设备验收；见 docs/testing/phase5-mobile-http-integration.md）
  - [x] `P5-REL-04b` 独立临时库、模拟数据、API/Expo 统一启动与停止/重置、三语测试提示及模拟导航保护；本机四服务/详情/价格与双平台开发包验证通过（2026-09-07；[真机测试说明](./docs/development/local-phone-testing.md)）；用户确认两台手机浏览器后端均可达；华为底层 Android 版本未显示，客户端安装及 App 端到端验收仍待确认
- [ ] `P5-REL-05` 完成上线检查和回滚方案 — 进行中：清单检查器、运行手册和本地临时库恢复完成；实际部署平台的备份/权限/恢复目标与版本回退演练未完成
  - [x] `P5-REL-05a` 建立拒绝不完整验收的发布检查器与回滚运行手册 — 2026-09-07：10 项新增测试、347 API tests 通过；实际清单返回 10/21、4 门槛未完成，exit 2；见 docs/testing/phase5-release-runbook.md
  - [x] `P5-REL-05b` 在独立临时库执行备份恢复并加入 CI（2026-09-07；7 项保护测试，40 个表/序列、结构摘要及四服务 8 次 API 请求通过；拒绝恢复覆盖非空库，不代表生产 RPO/RTO；见 docs/testing/phase5-local-recovery.md）

## Phase 5 验收门槛

- [ ] 法国和西班牙代表性地区均已通过测试
- [ ] 数据来源、位置隐私和第三方服务要求均已检查
- [ ] 关键错误与同步失败均有监控
- [ ] V1 可以安全地交给小规模真实用户测试

## 缺信息先跳过（待填栏保持空白）

| 所需资料 | 待填 | 仍未完成的工作 |
| --- | --- | --- |
| 运营主体与公开联系邮箱 |  | LEG-01/02 最终政策、条款与免责声明 |
| 测试/生产平台、数据库、区域与域名 |  | REL-01/02/05 实际部署、持续同步、监控和回退 |
| 通知渠道、接收责任人和处理方 |  | REL-02 外部投递、去重确认和告警演练 |
| 数据/地图来源最终许可审查证据 |  | LEG-04/05、正式来源发布/OSM 生产提供方 |
| 可信节假日日历及适用地区覆盖 |  | QA-10 请求时间营业求值；缺证据继续 Unknown |
| Beta 签名构建、设备和测试安排 | iPhone 15 Pro Max / iOS 26.6.1；华为 Mate 20 HMA-L29 / EMUI 12.0.0，底层 Android 版本未显示；两台浏览器后端均可达，签名客户端与 App 验收待填 | QA-10f、LEG-03、REL-03/04 真机与人工验收 |

2026-09-07：按用户要求跳过，不猜填、不签约、不启用付费或分发；已有独立工程证据不能替代这些未完成项。全国 staging/原子快照/last-known-good 与持续调度仍是后续工程，不能误写为已上线。

---

# Phase 6 — Beta、指标与数据闭环

- [ ] `P6-MET-01` 统计 Search → Navigation Rate
  - [x] `P6-MET-01a` 本地 opt-in 搜索/曝光/点击/交接归因、去重比例与三语诊断展示；仅工程验收，真实 Beta 统计未完成（2026-09-07；[指标口径](./docs/testing/phase6-metrics.md)）
- [ ] `P6-MET-02` 统计 Time-to-Decision
  - [x] `P6-MET-02a` 本地请求至首次导航时长、中位数/p95/未决策数；App 启动时间未采集，真实原指标留空（2026-09-07；[口径与限制](./docs/testing/phase6-metrics.md)）
- [ ] `P6-MET-03` 统计无结果率和搜索失败率
  - [x] `P6-MET-03a` 成功/空结果/失败/取消/未结束独立口径，固定错误分类、按服务汇总与三语展示（2026-09-07；[指标口径](./docs/testing/phase6-metrics.md)）
- [ ] `P6-MET-04` 统计 Live、1h、24h 和 Stale 数据比例
  - [x] `P6-MET-04a` 首次结果展示的来源观察年龄五桶与国家/服务切片；Unknown 不排除，抓取时间不代替观察时间（2026-09-07；[口径](./docs/testing/phase6-metrics.md)）
- [ ] `P6-MET-05` 统计价格、availability 和营业状态缺失率
  - [x] `P6-MET-05a` 原始字段缺失与用户可见 Unknown 双口径、独立分母和国家/服务切片；保留 EV 能力边界（2026-09-07；[口径](./docs/testing/phase6-metrics.md)）
- [ ] `P6-MET-06` 分析用户切换排序和放弃搜索的行为
  - [x] `P6-MET-06a` 显式排序方向、返回首页未导航与未观测结果独立统计；不把后台/取消/静默推测为放弃（2026-09-07；[口径](./docs/testing/phase6-metrics.md)）
- [ ] `P6-BEST-01` 根据真实导航行为调整 Best 权重
  - [x] `P6-BEST-01a` 基线核对、预注册/分层/偏差/证据护栏与灰度回滚设计；不调整权重，真实实验字段留空（2026-09-07；[校准准备](./docs/testing/phase6-best-calibration.md)）
- [x] `P6-CROWD-01` 设计“价格正确吗？”快速确认（2026-09-07；[流程/三语/版本冲突/验收案例](./docs/architecture/crowd-price-confirmation.md)；设计完成，尚未上线采集）
- [x] `P6-CROWD-02` 设计“仍营业/设备可用吗？”快速确认（2026-09-07；[字段范围/三语/冲突与验收](./docs/architecture/crowd-operational-confirmation.md)；设计完成，未改线上状态）
- [x] `P6-CROWD-03` 设计 Free/Paid 和实际价格反馈（2026-09-07；[单位/条件/三语与输入规则](./docs/architecture/crowd-fee-feedback.md)；设计完成，复杂计价不伪装可比价格）
- [x] `P6-CROWD-04` 设计照片上传、OCR 与人工审核流程（2026-09-07；[隔离/脱敏/不可信 OCR/人工审核/删除](./docs/architecture/crowd-photo-review.md)；方案和供应商待填区完成，未接入外部服务）
- [x] `P6-CROWD-05` 设计众包可信度、防滥用和过期机制（2026-09-07；[状态/权限/防刷/TTL/撤回](./docs/architecture/crowd-trust-expiry.md)；设计完成，实际审核和到期链路门槛仍未通过）
- [ ] `P6-RPT-01` 输出 Beta 结果及是否扩大区域的结论
  - [x] `P6-RPT-01a` 完成真实指标/实验/结论空白模板、工程证据与恢复依赖顺序，未预填产品效果或扩区结论（2026-09-07；[模板与交接](./docs/testing/phase6-beta-report.md)）

2026-09-07 执行边界：本轮 5 项设计和 8 项准备交付已验证；剩余 8 个主任务依赖真实 Beta 观测/实验/结论，四门槛保持未勾选。正式统计采集及众包审核/到期闭环尚需实施与验收，不只是补资料；不能将本地工具和设计文档称为已上线服务。缺资料栏继续留空，不启用自动化或 Phase 7。

## Phase 6 验收门槛

- [ ] 可以持续观测核心产品和数据质量指标
- [ ] Best 排名已开始依据真实行为校准
- [ ] 用户确认数据具有审核、可信度和过期机制
- [ ] 已决定正式发布、继续区域 Beta 或调整范围

---

# Phase 7 — V2/V3 待办池

这些任务不阻塞 V1，未经重新排期不要提前实施。

- [ ] `BACKLOG-01` Parking
- [ ] `BACKLOG-02` AdBlue
- [ ] `BACKLOG-03` Tyre/Puncture
- [ ] `BACKLOG-04` Battery
- [ ] `BACKLOG-05` Garage
- [ ] `BACKLOG-06` Roadside Assistance
- [ ] `BACKLOG-07` 自然语言汽车需求识别
- [ ] `BACKLOG-08` “胎压低了”到 Air/Tyre/Roadside 的连续决策流程
- [ ] `BACKLOG-09` 商家后台与实时 availability
- [ ] `BACKLOG-10` 预约、支付和交易佣金
- [ ] `BACKLOG-11` 商家/品牌实时数据合作
- [ ] `BACKLOG-12` B2B 统一汽车服务 API
- [ ] `BACKLOG-13` Italy/Germany/Switzerland/Sweden Country Adapter

---

# V1 最终验收清单

## Fuel

- [ ] 法国和西班牙均能返回附近站点
- [ ] 显示正确燃料类型、价格和更新时间
- [ ] 支持 Nearest、Cheapest、Open now、Best
- [ ] 正确处理缺货、关闭和价格未知

## Air

- [ ] 返回带充气服务的站点
- [ ] 显示距离、ETA、营业状态和来源
- [ ] 价格已知时显示，未知时明确标记
- [ ] 设备状态已知时显示，不伪造实时性

## Wash

- [ ] 返回带洗车服务的站点
- [ ] 显示类型、距离、ETA、营业状态和来源
- [ ] 价格已知时显示，未知时明确标记

## Charge

- [ ] 返回附近充电点
- [ ] 显示功率、接口和运营商
- [ ] availability/price 有数据时显示
- [ ] 缺少动态数据时明确说明数据能力

## 通用

- [ ] 所有结果都有来源与更新时间
- [ ] 所有结果都有 freshness/confidence
- [ ] Best 推荐有可理解的原因
- [ ] 可以一键导航
- [ ] 地图不是首屏的唯一交互方式
- [ ] FR / ES / EN 本地化就绪
- [ ] 用户可在约 10 秒内完成选择

---

# 决策记录

2026-09-07 本地测试授权：用户提供 iPhone 15 Pro Max 和华为 Mate 20；采用本机 Docker 独立临时数据库 + 真实 API + 局域网 Expo 的模拟环境，不覆盖原库/配置、不启用真实来源/付费/公网隧道。Expo SDK 57 手机运行时安装单独核对，不擅自降级项目或开通签名/云构建账户。

2026-09-07：用户授权 Phase 6 连续迭代，先做无外部依赖工程及五项众包设计；这不豁免 Phase 5 门槛，不开启分析上传，不用测试数据调 Best 或给出扩区结论。每项验证后独立 commit/push，缺信息项留空。

在这里记录会影响实现和范围的决定，避免后续反复讨论。

| 日期       | 决策                   | 选择                                                                                                          | 理由                                                                                                         | 影响的任务                     |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 2026-09-03 | 首发客户端             | React Native + Expo + TypeScript；首发 iOS/Android，Web 不纳入 V1                                             | 单一移动代码库适合定位、导航与跨平台 MVP；保留未来 Web 路径                                                  | P0-01                          |
| 2026-09-03 | 后端技术栈             | Node.js 24 LTS、TypeScript、Fastify、pnpm workspace；本地 Docker Compose、生产 OCI 容器                       | 与客户端共享 TypeScript 契约；适合 Adapter、API 与 Worker；保持部署平台中立                                  | P0-02                          |
| 2026-09-03 | 地理数据库             | PostgreSQL 18 + PostGIS 3.6；geography(Point, 4326) + GiST                                                    | 支持米制范围查询、空间索引、关系约束与可追溯数据同步                                                         | P0-03                          |
| 2026-09-03 | 地图、路线与 ETA       | 后端 Mapbox Matrix；客户端 react-native-maps；外部导航 App                                                    | 列表和排名不绑定地图 SDK；小规模 1×N Matrix 符合 Top N ETA 计算；HERE 为首选备选                             | P0-04                          |
| 2026-09-03 | 数据与搜索验证区域     | Paris、Toulouse、Carcassonne、Perpignan、La Jonquera、Girona、Barcelona、Madrid                               | 同时覆盖两国大城市、区域城市、跨境走廊和不同站点密度                                                         | P0-05                          |
| 2026-09-03 | V1 账号策略            | 核心搜索与导航免登录；偏好保存在设备本地                                                                      | 降低紧急场景使用阻力，避免在数据验证前引入账号、恢复与身份数据范围                                           | P0-06                          |
| 2026-09-03 | 位置与隐私边界         | 仅前台按需定位；支持手动输入；精确出发点默认不落库、不进日志和分析                                            | 遵循目的限制、数据最小化和保存期限原则；避免形成位置历史                                                     | P0-07                          |
| 2026-09-03 | 数据来源署名           | API、结果卡、详情页、全局来源/许可证注册表四层展示；保留字段级 provenance                                     | 兼顾用户可信度判断、多来源合并和不同许可证的署名要求                                                         | P0-08                          |
| 2026-09-03 | 新鲜度与可信度         | 按字段计算 Live/Verified/Recent/Stale/Unknown；confidence 独立为 high/medium/low                              | 不让新抓取的旧值伪装成实时数据，并对不同服务使用不同有效期                                                   | P0-09                          |
| 2026-09-03 | V1 服务字段            | 按搜索准入、必需可空、可选和查询派生字段定义 Fuel/Charge/Air/Wash                                             | 让未知值保持透明，避免用 0、false、closed 或 free 代替缺失数据                                               | P0-10                          |
| 2026-09-03 | 首发区域               | 全国数据导入与实验性搜索；首轮公开 Beta 质量承诺聚焦 Toulouse–Barcelona 走廊；Paris/Madrid 强制回归           | 先验证跨境核心价值，并将人工验证与运营支持控制在可管理范围                                                   | P0-05、P0-11                   |
| 2026-09-03 | 西班牙 Fuel 价格与单位 | 9 个明确产品映射到 V1；液体按 EUR/升，GNC/GNL 按 EUR/公斤；`Fecha` 是当前价格快照断言而非单站提交时间         | 避免混合单位比较和夸大更新时间；保持跨端展示一致                                                             | P1-ES-05、P1-ES-07、P1-FUEL-04 |
| 2026-09-03 | 西班牙 REST/XLS 组合   | REST `IDEESS` 保持主身份；只对确定的一对一 XLS 行补充 `Toma de datos` 和 `Tipo servicio`，不按行序关联        | REST 缺少单站时间/服务方式，XLS 缺少稳定 ID；同址重复站会造成歧义                                            | P1-ES-06、P1-ES-07             |
| 2026-09-04 | EV 统一层级与容量      | 统一为 service point → EVSE → connector；availability 和容量按 EVSE 计算，connector 只表达兼容接口            | 法国按 EVSE 行给 connector flags，西班牙按 connector 行重复 EVSE；直接数 connector 会夸大可同时充电数量      | P1-EV-01                       |
| 2026-09-04 | EV 来源许可与更新政策  | 法国 PAN/QualiCharge 与西班牙 RIPREE 可用于受控开发；Reve/SGV 在书面商用授权、可用配额和再分发条款确认前禁用  | 公开数据许可允许前三类来源缓存、转换和展示；Reve 通用条款不构成 Fuel Now 商用授权                            | P1-EV-02                       |
| 2026-09-04 | V1 EV 实时能力边界     | 不承诺两国全国实时 availability/price；法国仅逐 EVSE 条件显示 Live，西班牙动态与两国 Charge Cheapest 默认禁用 | 实测法国 5 分钟内状态占全国静态 PDC 不足 1%，西班牙 Reve 未获商用/API 条件；避免把部分或旧数据包装成全国实时 | P1-EV-03                       |
| 2026-09-04 | Phase 1 后 V1 范围     | 保留 France/Spain 四入口；Fuel 完整决策，Charge/Air/Wash 按来源能力启用、条件启用或明确不可用                 | 实测数据支持静态发现，但不能支持所有服务的价格/实时状态；能力矩阵同时保留产品价值和真实性                    | P1-RPT-06                      |
| 2026-09-07 | 连续执行与外部边界 | 按用户要求暂停小时任务，当前任务逐项验证、commit、push；运营/部署/分发另行处理 | 不擅自配置收费、签约或分发，已完成工程不重复执行 | Phase 5 |
| 2026-09-07 | Matrix 最小元素 | 至少两个未命中路线元素才允许新请求；不足时在网络和预算预留前降级 | 官方 Matrix 不支持单元素，不能虚构目的地或 ETA；全缓存单条命中仍可读 | LEG-05a |

# 风险与阻塞记录

2026-09-07 真机：已验证本机服务/双平台编译及停机清理；Mac 工具访问 LAN 地址曾超时，回环 Metro 正常，随后用户确认两台手机浏览器均可访问后端并看到 Toulouse / Barcelona / La Jonquera，未更改防火墙。后端浏览器检查不能代替 Expo 8081、SDK 57 客户端安装及 App 功能验收。华为仅显示 EMUI 12.0.0，不推断 Android 版本；先尝试兼容客户端安装，若报错再诊断。

2026-09-07 Phase 6：尚无已授权的真实 Beta 采集、参与者样本、部署及现场验收；六项真实指标、真实行为权重校准、Beta 结论与四项阶段门槛不能仅凭本地测试关闭。

| 日期       | 风险或阻塞                                                                                                                            | 严重度 | 应对方式                                                                                                                            | 状态                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-09-03 | Air/Wash 价格与设备状态覆盖不足                                                                                                       | 高     | V1 限为 presence discovery；价格、设备状态、服务专属营业时间保持 Unknown，不启用 Cheapest/Available now                             | 已验证，能力已缩减                        |
| 2026-09-04 | OSM Air/Wash 补充的生产获取方式与 ODbL 合并数据库义务未关闭                                                                           | 高     | Phase 2 使用区域 extract/自建/合规托管服务；保持来源分离；公开 Beta 前完成数据库分类、署名和提供义务审查                            | 开发可继续，发布受阻                      |
| 2026-09-04 | 法国 PAN Charge 为 Beta 且存在重复 ID、坐标、功率和未来时间异常                                                                       | 高     | staging 全量校验、异常隔离、原子发布与 last-known-good；PAN dynamic 保持 shadow-only                                                | 开发可继续，需实现监控                    |
| 2026-09-03 | 西班牙 EV 实时 availability/price 虽在 Reve 内覆盖高，但通用条款未授予商用复用，外部 API 还需审批密钥、限 5 次/小时且精确状态逐点读取 | 高     | 不依赖匿名 UI API；取得书面商用缓存/转换/展示授权、正式访问与生产配额，并完成 RIPREE 全量身份关联，在此之前不接入生产或承诺全国实时 | 已验证，生产接入受阻                      |
| 2026-09-03 | Best 初始权重尚未由真实导航行为校准                                                                                                   | 中     | Phase 3 使用已版本化的可解释规则和逐项贡献；Phase 6 根据导航行为校准时发布新公式版本并回归验证                                      | 初始规则已定义，待 Phase 6 校准           |
| 2026-09-03 | 路线 API 会带来成本和限流                                                                                                             | 中     | Top N 分批计算，增加缓存、用量指标、预算告警和无 ETA 降级；Beta 前复核价格                                                          | 应对方案已定义，待实现                    |
| 2026-09-03 | 法国 Fuel 门户的 typed datetime 偏移与原始 France-local 墙钟语义不一致                                                                | 高     | 从原始 `@maj/@debut` 按 `Europe/Paris` 解析，保留原值，隔离未来时间，并用夏/冬令时测试保护                                          | 已在 `FranceFuelAdapter` 缓解，待持续监控 |
| 2026-09-03 | 当前开发机 Node.js 22 低于项目锁定的 Node.js 24 LTS                                                                                   | 中     | `.nvmrc` 和 `engines` 固定 Node 24；当前兼容性测试通过，CI/发布环境必须使用 Node 24                                                 | 发布环境待落实                            |
| 2026-09-03 | MITECO 现代资源的 CC BY 4.0 与旧政府通用声明的“不得更改内容/元数据”措辞存在解释差异                                                   | 高     | 保留原始数据、明确标记 Fuel Now 转换、完整署名；公开 Beta 前由法务复核当时有效条款                                                  | 技术开发获准，发布门槛未关闭              |
| 2026-09-03 | MITECO 全国 Fuel 快照中存在 3 个零坐标和 1 个疑似经纬度互换记录                                                                       | 中     | 对西班牙服务区域做地理边界校验并隔离异常；不自动交换坐标                                                                            | 已在 `SpainFuelAdapter` 缓解，待持续监控  |
| 2026-09-03 | 西班牙 XLS 有 134 个站点的 `Toma de datos` 超过 7 天，另有 2 个 REST/XLS 补充关联无法消歧                                             | 高     | 超过截止时间或无法安全关联的价格不获得 Cheapest/Best 优势；持续监控旧值和关联失败数量                                               | 适配器与匹配索引已缓解，正式同步待监控    |
| 2026-09-07 | 有界真实来源到 canonical/API 已闭合，但全国原子发布、持续同步、请求时间营业求值与原生人工验收仍缺失；原业务库未填充 | 高 | 按实际部署/许可及日历证据落实后续生产工程，见发布前置条件；40 站临时库不当全国覆盖 | 有界工程完成，生产/发布未完成 |
| 2026-09-07 | 运营主体/公开联系邮箱、部署环境和 Beta 分发/设备安排尚未确认                                                                          | 高     | 用户提供必要决定；不编造政策身份、开付费服务或假称设备通过；见 docs/testing/phase5-release-prerequisites.md                         | 等待用户输入，自动迭代暂停                |

2026-09-07 执行顺序补充：用户暂缓运营主体/邮箱/部署/分发决定，授权继续独立工程工作；QA-10、LEG-01/02 及实际部署/设备门槛保留未完成。先完成 LEG-03 工程子项，再检查 LEG-06 日志与分析；许可和发布门槛不得自动勾选。

# 完成记录

2026-09-07 华为超大字体首页显示核对：设置照片确认超大字号、标准粗细，App 照片覆盖四服务卡及滚动后的搜索/语言/来源按钮，可见卡片内无文字重叠或字母缺失。Combustible 未选中时仍词内断行，保留自适应布局问题；未测精确缩放值，不把屏幕滚动边缘裁去的内容误记为控件内截断。完成的是可见内容核对，不是整体大字体验收，四入口/语言按钮交互及原字体恢复仍待确认。文档差异检查通过，仅提交文字，不上传照片或改应用/设备设置。

2026-09-07 华为系统语言模式重开保留验收：用户按重开项目并查看语言弹窗的步骤，确认仍勾选使用设备语言，关闭本次模式保留子项，不仅凭显示法语推断。手机系统语言动态变化、系统重启等尚未验证。下一步进行既有 Phase 5 大字体任务的首页检查；文档差异检查通过，仅提交文字记录，未修改应用或设备设置。

2026-09-07 华为跟随设备语言选择验收：用户照片确认系统模式带勾而非手动 Français，界面显示法语。只读设备语言列表确认顺序为简体中文、繁体中文、法语；代码匹配首个受支持 EN/FR/ES，因此法语符合当前规则，不能将中文系统菜单等同只配置中文，也不是强制默认法语。即时模式选择子项通过，跨重开保留仍待验。文档差异检查通过，仅提交文字记录，未修改系统设置或应用。

2026-09-07 华为 English 覆盖旧偏好及重开保留验收：用户明确确认选择英语后首页立即切换，关闭并重开同一项目后仍为英语。完成本次新偏好覆盖旧西班牙语与重开保留子项，不延伸为全部语言、手机重启或系统跟随通过。下一步检查 Use device language 选中状态；文档差异检查通过，仅提交文字记录，不修改应用或手机系统设置。

2026-09-07 华为西班牙语重开保留验收：用户按关闭并重新打开同一项目的步骤反馈“重新打开还是西班牙语”，完成本次偏好保留子项；未独立验证进程终止，不延伸为手机重启、重装或全部语言场景通过。下一步验证 English 覆盖旧语言选择及重开保留。文档差异检查通过，仅提交文字记录，不改代码或设备设置。

2026-09-07 华为西班牙语详情可见区域验收：两张照片确认主站详情顶部返回、模拟导航保护、站点状态/营业时间/更新字段，以及 Air 卡片价格、免费/公共访问、设备状态、未知字段、低置信度、时间和来源标签均为西班牙语。只完成照片覆盖区域，不推断未拍到的 Fuel/Wash 或全部许可内容通过；已知燃油详情数据缺口保持未修复。下一步测同一项目重开后的语言偏好。文档差异检查通过，仅提交文字记录，不上传照片或修改应用。

2026-09-07 华为西班牙语燃油结果页展示验收：三张照片覆盖 Gasóleo、2 个最近排序结果、四排序标签、ETA 缺失说明、主站 1,659 EUR/litro 含税近期报价及高置信度，以及第二站关闭/不可用/价格未知和低置信度提示；导航保护和操作按钮均显示西班牙语。站名和测试来源保留原文，不算界面漏译。仅关闭已拍摄区域展示子项，不扩展为详情、排序点击或持久化通过；同步设备汇总，文档差异检查通过，只提交文字记录。

2026-09-07 华为西班牙语首页切换验收：照片确认首页标题、四服务入口与描述、已选服务说明为西班牙语，完成可见首页即时切换子项。选中燃油卡 Combustible 在单词内部换行，另记布局待优化，不标记为全页面三语/无障碍/重启持久化已通过。下一步检查西班牙语燃油结果页，地图及 Fuel 详情问题保持未完成。文档差异检查通过，仅提交文字记录，不上传照片或修改应用。

2026-09-07 华为空白地图返回路径验收：用户明确确认点击 Retour 能回到原来的 2 个 DEMO 结果，仅关闭返回列表子项，地图加载、标记和真实导航仍未通过。下一步转测不依赖地图的西班牙语即时切换，不将地图问题静默关闭。文档差异检查通过，只提交文字记录，未修改应用或设备设置。

2026-09-07 华为地图持续空白复查与诊断记录（非通过）：用户确认等待后仍无地图内容。只读检查已授权 USB 连接和当前 Expo Go 的有限近期日志，确认 Google 地图组件输出 Play 服务/渲染器版本；未取得足以确定鉴权、网络或渲染根因的证据，不能简单归因于华为缺少 Google 服务。地图验收继续未完成，返回列表能力仍待用户确认。文档差异检查通过，仅提交脱敏文字记录，不上传原始日志、不改应用或设备设置。

2026-09-07 华为地图空白问题记录（非验收通过）：用户照片显示地图页 Retour、提供方/隐私说明和 Google 标识，但没有底图或站点标记，保留地图验收未完成。只读代码核对确认 Expo Go 的 Android 地图启用路径和当前缺少地图就绪/超时状态跟踪；未获得足以确定空白根因的运行证据。下一步确认等待后状态及返回列表能力。完成的是问题记录，不是地图修复；文档差异检查通过，仅提交文字，不上传照片或修改应用/设备配置。

2026-09-07 华为空结果后列表恢复验收：用户按指引从 Paris 空结果切回 Toulouse / Fuel / Gazole，反馈重新出现 2 个 DEMO 结果，完成城市切换后的列表恢复子项。仅记录实际反馈，不推断报价、新鲜度或间歇网络问题已修复。下一步在同批结果上检查地图第二层视图及返回；文档差异检查通过，仅提交文字记录，未修改应用。

2026-09-07 华为 Fuel 空结果展示验收：用户按 Paris 燃油测试步骤提供照片，确认 Carburant、0 个结果、最近排序、扩大搜索范围提示、50 km 半径及更换地点/服务的空结果说明，页面没有网络错误或残留充电站卡片。城市依操作上下文记录，照片未展示城市名；不代表 Paris 真实无服务。返回 Toulouse 后的恢复另列待验。文档差异检查通过，仅提交文字记录，不上传原照片或修改应用。

2026-09-07 华为 Charge 禁用排序点击验收：用户确认在 Barcelona / Recharge 结果加载后，分别点击最低价和当前营业均无法选中，仍保持最近排序，符合此前照片显示的无可比价格/营业时间未知限制。完成当前模拟场景的点击子项，同步真机汇总表；下一步进行无需外部数据或密钥的空结果与恢复测试。文档差异检查通过，只提交文字记录，不修改应用或关闭整体发布门槛。

2026-09-07 华为详情页 DEMO 导航点击保护验收：用户按步骤进入 Toulouse 同站详情，点击 Itinéraire · Google Maps 后明确反馈“一样的没有反应，不跳转”，关闭该详情入口的实际点击保护子项。与此前列表点击结果一致；不代表真实站点导航、其他设备或整体发布验收通过。文档差异检查通过，仅提交文字测试记录，未修改应用。

2026-09-07 华为 Wash 列表 DEMO 导航点击保护验收：用户按指引点击当前 Toulouse 模拟站列表的灰色导航按钮，明确反馈“点击后没反应，没有跳转”，符合模拟站禁用真实导航的预期。仅关闭该列表入口的实际点击子项；详情页点击和真实目的地导航仍需分别验证。文档差异检查通过，仅更新测试文字记录，未修改应用、上传照片或关闭其他发布门槛。

2026-09-07 华为 Wash 基础独立搜索验收：价格照片确认 Toulouse 主 DEMO 站显示 6,00 EUR/programme de lavage、营业时间未知、服务按来源可用，以及模拟导航保护和低置信度提示，与此前洗车详情一致。随后补图确认 Lavage、1 个结果、最近排序，以及 ETA 缺失时按距离排序的说明。完成当前模拟数据的基础列表展示验收，不代替多候选排序、真实价格/设备状态或导航实际点击验收。只提交文字记录，不上传原照片、不修改应用或关闭发布门槛。

2026-09-07 华为 Air 独立入口与详情验收：照片确认 Gonflage 返回 1 个最近排序的 Toulouse 主 DEMO 站，模拟价格 0 EUR/use / Gratuit，设备按来源工作、Public，营业时间仍未知，并显示 ETA 缺失的距离排序说明与风险提示。同组照片包含 Wash 的 6 EUR 方案详情，但独立 Wash 列表仍待补验。仅提交文字证据，不上传照片、不修改应用，不关闭 Fuel 详情缺口、连接稳定性或发布门槛。

2026-09-07 华为 Charge 排序限制展示验收：照片确认最低价的 V1 无可比价格说明、当前营业的未知营业时间说明、实际 1 个结果/最近排序及 ETA 缺失的距离排序提示。只勾选说明与状态展示，实际禁用项点击单独留待验证；下一步 Toulouse / Air 独立搜索，不将此前多服务详情展示等同该入口已测。未修改应用或关闭其他门槛，仅提交文字记录。

2026-09-07 华为 USB Charge 基础验收：用户三张照片确认 Barcelona Charging 列表/详情、CCS Combo 2 与 Type 2、最高额定 150 kW、2 个充电点；价格/实时空闲数为未知，并明确西班牙未启用实时可用性，模拟来源及风险提示可见。勾选静态发现基础检查，不把额定功率当实际充电速度，不据此标记充电实时状态、排序或真实导航通过。下一步 Charge 能力禁用提示；Fuel 详情修复与连接稳定性保留待办，仅提交文字记录。

2026-09-07 华为 USB Best 基础验收：照片确认法语结果为 1 个、实际排序 Meilleur choix，主站 1,659 EUR/litre，并显示距离较近 0 m、数据较新和驾车时间不可用三条理由/限制；勾选 Best 基础交互与理由显示。该次 USB 请求和显示成功，不代表原 HMR 间歇故障已修复或完整排名边界通过。下一步 Barcelona / Charge 静态发现验收；Fuel 详情修复与发布门槛不关闭，只提交文字记录。

2026-09-07 华为 USB 对照环境：按用户授权正常停止 LAN 服务并清理其临时库，启动新的回环 API/Metro 隔离环境，为唯一 USB 华为创建无覆盖的 3001/8081 转发并打开 Expo 新地址。验证监听仅限回环、开发包 API 已切为 127.0.0.1、手机 main 启动日志包含新地址；本机四服务/详情/Best 通过，原库站点数仍 0，旧临时库不存在。只使用既有代码，记录可复现启动/退出/恢复 LAN 步骤；未重装/清手机数据/改防火墙或开启公网访问。当前是完成连接切换，不是确认稳定性或修复原故障；Best 手机验收与 Fuel 详情缺口保留未完成。

2026-09-07 Expo HMR 排查补充：用户展开警告显示正确 LAN 地址 192.168.1.63:8081，Error undefined；Mac 回环/LAN 的 HMR WebSocket 握手成功，手机 Expo 进程有新的启动记录，但未取得对应失败的底层网络原因。加载稳定性不标解决，Best 手机验收仍未完成。提出 USB/LAN 对照方案，等待用户确认后再改测试连接；本轮未设置转发、重启、重装或清数据，只发布文字记录。

2026-09-07 华为 Open now 基础验收：照片显示 Results 1 / Order Open now，保留 1.659 EUR/liter 的营业主站，先前的临时关闭站已排除；勾选当前模拟数据过滤检查，不代表全部营业边界或真实现场通过。Mac 侧另验证 Best 返回主站及距离/新鲜度/ETA 缺失理由，手机 Best 仍待验收；随后用户照片显示 Cannot connect to Expo CLI 警告，完整 URL/Error 尚待提供，不能据此判定 Best 查询失败。Fuel 详情缺口与加载稳定性仍待处理。用户已重新明确授权按原约定 commit 并 push 到 origin/main；只发布文字记录，不上传照片或原始日志。

2026-09-07 华为 Cheapest 基础验收：照片显示 Results 2 / Order Cheapest；1.659 EUR/liter 主站第一，Unknown/Closed/Unavailable 站第二，未知价格没有获得零价优势。真机测试说明勾选排序基础交互；由于只有一个有效报价，多报价排序边界未验收。下一步 Open now 筛除关闭站，Fuel 详情修复及加载稳定性仍待处理；仅提交文字记录。

2026-09-07 华为列表报价验收：用户恢复后的照片确认 Toulouse 主 DEMO 站列表显示 1.659 EUR/liter、含税、Recent；勾选真机测试说明中的列表报价检查。英文 Air/Fuel/Wash 详情可见，Fuel 详情仍为 Unknown，复现已知油品上下文缺口，尚未修复。排序状态未出现在照片中，Cheapest、完整三语、四服务搜索与加载稳定性不标完成；下一步验收排序。仅更新文档，不上传照片。

2026-09-07 华为加载故障排查：确认手机浏览器可达 API/Metro、Expo 联网权限开启，Mac 端柴油列表/排序和 Android 开发包正常。用户授权 USB 后报告项目恢复，读取确认 Android 10 / API 29、Expo Go 57.0.9；只检查 Expo 进程近期日志，内部异常尚不足以定位先前故障。记录为已恢复、根因未确定，未修代码或改网络；保留稳定性排查、手机柴油报价及详情修复待办，不上传原始日志/照片/设备标识。

2026-09-07 华为详情照片核对：照片 1–4 确认 Toulouse 多服务详情、FR Unknown/来源提示和 DEMO 导航禁用样式可见；只记录界面证据，不标记实际导航点击、三语或四服务整体通过。发现并定位待修缺口：列表跳转仅传 id，详情 API 缺少 requestedFuelType，因此 Fuel 详情不能显示选定油品报价；修复及真机回归任务保留未勾选，见真机测试说明。此次仅诊断/记录，未修改功能；原照片不上传公开仓库。

2026-09-07 华为真机基础流程：用户按 Expo Go 安装和 Toulouse / Fuel 操作指引确认看到 DEMO 测试站点；记录开发客户端安装、项目启动与基础列表通过，客户端具体版本仍待填。其余服务、详情、排序、三语、权限、断网、地图导航及 iPhone App 均不标完成；下一项为 Fuel 详情与模拟导航保护。

2026-09-07 P5-REL-04b：新增局域网显式开启、白名单移动环境、临时库日期平移模拟数据、统一 API/Metro 与停止清理；原库不填充；17 新测试、全量 990 tests、四服务/详情/新鲜模拟油价自检和 iOS/Android 开发包编译通过；设备系统按用户提供记录，真实手机验收留空。

2026-09-07 P5-REL-04b 连通性补充：用户最终确认 iPhone 和华为浏览器后端均可达并看到三个测试城市；逐设备仅浏览器连通标为通过，App 功能不标完成。环境提交 `17da613` 已推送，GitHub CI 通过；下一步是兼容客户端安装与 App 内验证，华为底层 Android 版本缺失不阻塞安装尝试。

2026-09-07 P6-RPT-01a：Beta 模板、空白数据/批准栏与依赖顺序完成；最新功能提交 93f821e 全量 973 tests、iOS/Android bundle 和原生隐私配置通过，GitHub CI 34141702076 成功；阶段未完成、未发布。

2026-09-07 Phase 6 指标验收修复：首次无效计时不被重试覆盖，详情离开清除归因，枚举运行时白名单与统一 15 分钟清除回归；新增 3 项测试，避免本地指标假精确。

2026-09-07 P6-CROWD-05：状态与角色、候选证据隔离、匿名防刷限制、观察时间 TTL、撤回/到期/缓存及审计设计完成；七类并发/安全反例走查，实际服务未上线。

2026-09-07 P6-CROWD-04：私有隔离上传、像素/格式/费用边界、元数据与画面脱敏、人工提升及撤回设计完成；六类威胁走查，未发送照片或开通外部账户。

2026-09-07 P6-CROWD-03：费用状态与金额独立、条件免费、币种单位/小数规范和复杂报价隔离设计完成；七类反例走查，Charge 价格能力保持未启用。

2026-09-07 P6-CROWD-02：营业、服务、设备、油种与 EV 接口观察分离；六类范围/时间/冲突反例走查，不自动升级为全站状态或 Live。

2026-09-07 P6-CROWD-01：完成具体价格核对的交互、三语文案、最小字段、幂等/旧报价冲突和六类设计验收；未建立公网写入或修改 canonical 数据。

2026-09-07 P6-BEST-01a：核对现有 Fuel 版本/权重并完成真实实验执行方案和反例审查；没有将本地诊断当训练集，父项因缺真实 Beta 证据未完成。

2026-09-07 P6-MET-06a：排序控件和返回首页接入有界行为汇总，3 项方向/归因/未观测结果回归完成；六项本地指标工程齐备，真实父项未关闭。

2026-09-07 P6-MET-05a：字段缺失统计、Fuel 未选油种不可测、零值/负面状态非缺失和 EV 动态/价格未知边界完成；没有补造真实质量指标。

2026-09-07 P6-MET-04a：新鲜度互斥桶、边界/未来/未知时间和跨境分母回归完成；不冒充全国覆盖或整个站点所有字段 Live。

2026-09-07 P6-MET-03a：搜索健康汇总与 9 项分类/分母/重试/取消回归完成，真实 Beta 失败率留空。

2026-09-07 P6-MET-02a：单调时钟、首次点击去重、空样本/非法时长保护与三语披露完成；不把请求计时冒充 App 启动计时。

2026-09-07 P6-MET-01a：实现默认关闭、会话内有界的搜索到导航统计；覆盖去重、详情归因、撤回同意、迟到取消和空样本，独立工程完成，真实父项保留未完成。

完成一个阶段时，在此追加简短记录。

| 日期       | 完成内容                                       | 结果/证据                                                                                                                                                                                                                                                                    |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | 建立项目任务清单                               | `PROJECT_TASKS.md`                                                                                                                                                                                                                                                           |
| 2026-09-03 | 连接 GitHub 仓库并推送项目文档                 | `https://github.com/zhyphil/fuelnow`，`main` 跟踪 `origin/main`                                                                                                                                                                                                              |
| 2026-09-03 | 建立 Conventional Commits 与自动提交推送工作流 | `AGENTS.md`、`CONTRIBUTING.md`                                                                                                                                                                                                                                               |
| 2026-09-03 | 完成 V1 客户端平台选型                         | React Native + Expo + TypeScript；见 `docs/decisions/0001-client-platform.md`                                                                                                                                                                                                |
| 2026-09-03 | 完成后端技术栈与运行方式选型                   | Node.js 24 LTS + TypeScript + Fastify + pnpm workspace；见 `docs/decisions/0002-backend-stack.md`                                                                                                                                                                            |
| 2026-09-03 | 完成地理数据库方案选型                         | PostgreSQL 18 + PostGIS 3.6；见 `docs/decisions/0003-geospatial-database.md`                                                                                                                                                                                                 |
| 2026-09-03 | 完成地图、路线与 ETA 方案选型                  | Mapbox Matrix + react-native-maps + 外部导航；见 `docs/decisions/0004-maps-routing-provider.md`                                                                                                                                                                              |
| 2026-09-03 | 固定法国、西班牙及跨境验证区域                 | 8 个核心锚点和 Toulouse–Barcelona 走廊；见 `docs/decisions/0005-validation-geographies.md`                                                                                                                                                                                   |
| 2026-09-03 | 确定 V1 免登录账号策略                         | 核心搜索和导航无需账户；见 `docs/decisions/0006-account-policy.md`                                                                                                                                                                                                           |
| 2026-09-03 | 定义位置权限、保存与 GDPR 工程边界             | 前台按需定位且精确出发点默认不持久化；见 `docs/decisions/0007-location-privacy.md`                                                                                                                                                                                           |
| 2026-09-03 | 定义数据来源与许可证署名体系                   | 四层 provenance 展示并建立来源注册表；见 `docs/decisions/0008-source-attribution.md`                                                                                                                                                                                         |
| 2026-09-03 | 定义按字段的新鲜度与可信度语义                 | 五级 freshness + 独立 confidence；见 `docs/decisions/0009-freshness-confidence.md`                                                                                                                                                                                           |
| 2026-09-03 | 定义 V1 四类服务字段契约                       | 明确搜索准入、未知值、价格、状态、来源和查询派生字段；见 `docs/product/v1-service-fields.md`                                                                                                                                                                                 |
| 2026-09-03 | 确定 V1 发布测试与区域 Beta 范围               | 全国数据能力 + Toulouse–Barcelona 走廊质量承诺；见 `docs/decisions/0010-beta-launch-scope.md`                                                                                                                                                                                |
| 2026-09-03 | 完成 Phase 0 开工决策                          | 所有任务和验收门槛完成；ADR 索引见 `docs/decisions/README.md`                                                                                                                                                                                                                |
| 2026-09-03 | 找到并探测法国官方 Fuel 实时数据源             | v2 dataset、Records API、CSV/JSON/GeoJSON exports 均可访问；见 `docs/data/france-fuel-source.md`                                                                                                                                                                             |
| 2026-09-03 | 核实法国 Fuel 数据许可与使用约束               | 允许商业复用、缓存、转换和再分发；必须标注来源与最新更新时间；见 `docs/data/france-fuel-licence.md`                                                                                                                                                                          |
| 2026-09-03 | 保存法国 Fuel 原始样本与字段字典               | 固定 station `31000001` 的完整 Records API 响应，并记录 47 个字段；见 `fixtures/france-fuel/` 与 `docs/data/france-fuel-fields.md`                                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 站点基础字段                     | 坐标和地址可用；名称/品牌无显式字段；营业时间覆盖 86.32% 且存在多种时段结构；见 `docs/data/france-fuel-basic-fields-validation.md`                                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 价格与缺货字段                   | 价格与原始项一致；确认 France-local 时间解析要求及缺货汇总字段异常；见 `docs/data/france-fuel-price-validation.md`                                                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 关闭、24/7 与设施字段            | 整站临时关闭不可得；区分自动付款与站点 24/7；验证 Air/Wash 标签；见 `docs/data/france-fuel-status-services-validation.md`                                                                                                                                                    |
| 2026-09-03 | 实现法国 Fuel 数据适配器                       | 建立最小 TypeScript 数据包；真实 fixture、时区、缺货、营业时间及设施映射共 7 项测试通过；见 `packages/data-core/`                                                                                                                                                            |
| 2026-09-03 | 实现法国 Fuel 10 km GPS 查询                   | Toulouse 官方 12 km 边界样本中正确返回 70 个 10 km 内结果，距离与源 API 相差均小于 2 m；见 `docs/data/france-fuel-nearby-validation.md`                                                                                                                                      |
| 2026-09-03 | 完成法国 Fuel 多地理场景验证                   | Paris、Toulouse、Blagnac 郊区/机场和 A9 高速场景全部通过；17 项测试通过；见 `docs/data/france-fuel-geography-validation.md`                                                                                                                                                  |
| 2026-09-03 | 找到并探测西班牙官方 Fuel 数据源               | MITECO 全国 REST JSON 返回 11,475 站点，并验证区域过滤、参考列表与 XLS；见 `docs/data/spain-fuel-source.md`                                                                                                                                                                  |
| 2026-09-03 | 核实西班牙 Fuel 数据许可与使用约束             | 现代资源 CC BY 4.0 允许商业复用、缓存、改编和再分发；记录旧通用声明差异；见 `docs/data/spain-fuel-licence.md`                                                                                                                                                                |
| 2026-09-03 | 保存西班牙 Fuel 原始样本与字段字典             | 固定 Pinto 市级 17 条完整响应，并记录 41 个源字符串字段；见 `fixtures/spain-fuel/` 与 `docs/data/spain-fuel-fields.md`                                                                                                                                                       |
| 2026-09-03 | 验证西班牙 Fuel 站点基础字段                   | 身份和地址完整；确认 `Rótulo` 映射边界、4 个坐标异常及 1,172 种营业时间表达；见 `docs/data/spain-fuel-basic-fields-validation.md`                                                                                                                                            |
| 2026-09-03 | 验证西班牙 Fuel 产品、价格和时间语义           | 42,619 个价格值格式有效；确定 9 个 V1 映射、液体/气体单位和 `Fecha` 快照边界；见 `docs/data/spain-fuel-price-validation.md`                                                                                                                                                  |
| 2026-09-03 | 验证西班牙 Fuel 关闭、24/7 与服务字段          | XLS 补充单站时间和服务方式；确认关闭、Air/Wash 与设备状态不可得；见 `docs/data/spain-fuel-status-services-validation.md`                                                                                                                                                     |
| 2026-09-03 | 实现西班牙 Fuel 数据适配器                     | 真实 Pinto fixture、时间/营业时间、9 种燃料、单位、异常坐标和安全 XLS 补充匹配共 12 项西班牙测试通过；全国 11,475 行验收符合预期；见 `packages/data-core/`                                                                                                                   |
| 2026-09-03 | 实现西班牙 Fuel 10 km GPS 查询                 | Madrid 独立边界 fixture 中正确返回 219 个 10 km 内结果，支持稳定排序、限制和逐行错误；见 `docs/data/spain-fuel-nearby-validation.md`                                                                                                                                         |
| 2026-09-03 | 完成西班牙 Fuel 多地理场景验证                 | Madrid、Barcelona、El Prat 郊区/机场和 La Jonquera AP-7 高速场景全部通过；38 项测试通过；见 `docs/data/spain-fuel-geography-validation.md`                                                                                                                                   |
| 2026-09-03 | 统一法国与西班牙 Fuel 模型入口                 | 两国真实记录经 country-discriminated 入口转换为同一 `NormalizedServicePoint` 契约；40 项测试通过；见 `docs/data/unified-fuel-model-validation.md`                                                                                                                            |
| 2026-09-03 | 实现统一 Fuel 直线距离粗筛                     | 对两国统一模型执行 0–100 km Haversine 半径筛选，保持输入顺序并验证精确边界；44 项测试通过；见 `docs/data/unified-fuel-distance-validation.md`                                                                                                                                |
| 2026-09-03 | 实现统一 Fuel Nearest 排序                     | 两国查询共用距离升序与全局 ID 决胜规则，排序不改变调用方数组；49 项测试通过；见 `docs/data/unified-fuel-nearest-validation.md`                                                                                                                                               |
| 2026-09-03 | 实现统一 Fuel Cheapest 排序                    | 仅比较指定燃料与兼容单位，Stale/Unknown/不可用价格不获得旧低价优势，并以距离和全局 ID 决胜；55 项测试通过；见 `docs/data/unified-fuel-cheapest-validation.md`                                                                                                                |
| 2026-09-03 | 实现统一 Fuel Open now 筛选                    | 按站点时区计算营业状态并区分 Open/Closed/Unknown，支持分段、跨午夜及法国 24/7 自助 Fuel；64 项测试通过；见 `docs/data/unified-fuel-open-now-validation.md`                                                                                                                   |
| 2026-09-03 | 验证统一 Fuel 来源署名                         | Toulouse 70 条与 Madrid 219 条结果全部返回来源 ID、名称和 HTTPS URL，全局 ID 可反查来源；66 项测试通过；见 `docs/data/unified-fuel-source-attribution-validation.md`                                                                                                         |
| 2026-09-03 | 验证统一 Fuel 来源时间                         | Toulouse 70 条使用 source observed，Madrid 219 条使用 snapshot published，并始终与系统 fetched_at 分离；69 项测试通过；见 `docs/data/unified-fuel-source-timestamps-validation.md`                                                                                           |
| 2026-09-03 | 定义统一 Fuel 显示和决策状态                   | 价格 Current/Stale/Expired/Unknown、库存、关闭与本地化 warning code 形成可执行契约；78 项测试通过；见 `docs/data/unified-fuel-decision-state-validation.md`                                                                                                                  |
| 2026-09-03 | 验证 Perpignan–Girona 跨境 Fuel 查询           | La Jonquera 25 km 返回法国 21 + 西班牙 67 条；北侧边境点保留更近西班牙站；80 项测试通过；见 `docs/data/cross-border-fuel-search-validation.md`                                                                                                                               |
| 2026-09-03 | 人工抽查真实 Fuel 站点与价格                   | 对照两国 10 个城市/机场/高速/边境样本，确认价格、单位、24/7 和临时/永久缺货语义；82 项测试通过；见 `docs/data/manual-fuel-sample-audit.md`                                                                                                                                   |
| 2026-09-03 | 验证法国 Fuel 的 Air 字段                      | 全国 5,450/9,804 条含 `Station de gonflage`；244 条固定样本严格匹配 presence，价格/设备状态保持 Unknown；84 项测试通过；见 `docs/data/france-air-field-validation.md`                                                                                                        |
| 2026-09-03 | 验证西班牙 Fuel 的 Air 字段边界                | REST 41 字段、XLS 40 列均无 Air/水/设备字段；684 条固定样本保持 Unknown，服务方式不误映射；86 项测试通过；见 `docs/data/spain-air-field-validation.md`                                                                                                                       |
| 2026-09-03 | 量化两国 Air 来源覆盖                          | 法国全国 5,450/9,804（55.59%）明确声明 Air；西班牙 MITECO 无该字段，0 known-positive 不能解释为现实中不存在；见 `docs/data/air-coverage-validation.md`                                                                                                                       |
| 2026-09-03 | 评估 Air 价格覆盖                              | 法国 5,450 个 Air-positive 记录均无 free/paid/amount，价格 100% Unknown；西班牙无 Air denominator；见 `docs/data/air-price-coverage-validation.md`                                                                                                                           |
| 2026-09-03 | 评估 Air 设备状态覆盖                          | 法国 5,450 个 Air-positive 记录均无 working/broken/verified 时间，状态 100% Unknown；西班牙不可测；见 `docs/data/air-equipment-status-coverage-validation.md`                                                                                                                |
| 2026-09-03 | 验证法国 Fuel 的 Wash 字段                     | 全国 4,052/9,804 条含自动或手动洗车标签；244 条固定样本严格匹配 presence，`Laverie` 不误映射；88 项测试通过；见 `docs/data/france-wash-field-validation.md`                                                                                                                  |
| 2026-09-04 | 验证西班牙 Fuel 的 Wash 字段边界               | REST 41 字段、XLS 40 列均无 Wash/类型/价格/设备字段；684 条固定样本保持 Unknown，服务方式不误映射；90 项测试通过；见 `docs/data/spain-wash-field-validation.md`                                                                                                              |
| 2026-09-04 | 量化两国 Wash 来源覆盖                         | 法国全国 4,052/9,804（41.33%）明确声明 Wash；西班牙 MITECO 无该字段，0 known-positive 不能解释为现实中不存在；见 `docs/data/wash-coverage-validation.md`                                                                                                                     |
| 2026-09-04 | 评估 Wash 类型和价格覆盖                       | 法国 4,052 个 Wash-positive 记录的详细类型与价格均为 0% known；西班牙无 Wash denominator；见 `docs/data/wash-type-price-coverage-validation.md`                                                                                                                              |
| 2026-09-04 | 决定使用 OSM 补充 Air/Wash                     | 四个目标城市均有明确 Air/Wash 候选；仅采纳显式 presence，生产不依赖公共 Overpass，公开 Beta 前审查 ODbL 合并数据库义务；见 `docs/decisions/0011-osm-air-wash-supplement.md`                                                                                                  |
| 2026-09-04 | 验证法国 EV 静态数据源                         | PAN Beta 49 字段含 166,339 个 PDC/48,181 个站；QualiCharge 99.97% 已包含，禁止重复叠加；记录重复 ID、坐标、功率和时间异常；见 `docs/data/france-ev-static-source.md`                                                                                                         |
| 2026-09-04 | 验证法国 EV 动态 availability/price            | PAN 动态匹配 61.13% 静态 PDC，但最新去重后仅 5.43% 静态 PDC 在 60 分钟内；11,283 个重复 ID；动态价格字段为 0；见 `docs/data/france-ev-dynamic-coverage.md`                                                                                                                   |
| 2026-09-04 | 验证西班牙 EV 静态数据源                       | 选定官方 MITECO RIPREE 全国导出；43,610 个连接器行覆盖 36,465 个 PDC/12,214 个安装点；确认三级身份、非标准 CSV 解析、重复连接器和容量异常边界；见 `docs/data/spain-ev-static-source.md`                                                                                      |
| 2026-09-04 | 验证西班牙 EV 动态 availability/price          | Reve 内 42,800/44,631 个 EVSE 为 OCPI 动态来源，价格筛选匹配 13,323/14,564 个地点；确认正式 API key、5 次/小时、逐点精确状态及全量身份关联限制；见 `docs/data/spain-ev-dynamic-coverage.md`                                                                                  |
| 2026-09-04 | 统一验证两国 EV 字段                           | 建立 service point → EVSE → connector 模型，固定主要接口、功率隔离、运营商身份和 FR/ES 状态优先级；同步细化 V1 Charge 字段契约；见 `docs/data/unified-ev-fields-validation.md`                                                                                               |
| 2026-09-04 | 固化 EV 来源更新与许可政策                     | 法国 PAN/QualiCharge 和西班牙 RIPREE 可用于受控开发；Reve/SGV 因商用授权、API 配额和再分发条件未闭环而保持生产禁用；见 `docs/data/ev-source-licence-update-policy.md`                                                                                                        |
| 2026-09-04 | 确定 V1 EV 实时承诺范围                        | 两国保留全国静态发现；法国仅满足逐 EVSE Live 门槛时显示可用性，西班牙动态与两国 Charge Cheapest 暂停；见 `docs/decisions/0012-v1-ev-realtime-scope.md`                                                                                                                       |
| 2026-09-04 | 汇总全部来源字段映射                           | 建立 Fuel、Charge、Air、Wash 的跨来源 canonical 字段、派生/补充/不可用边界，并统一西班牙 Fuel source ID；见 `docs/data/source-field-mapping-report.md`                                                                                                                       |
| 2026-09-04 | 汇总四类服务覆盖率                             | 统一 Fuel 区域密度、Air/Wash 来源确认率与 OSM 候选、Charge 静态规模及动态/新鲜覆盖，禁止混用不同分母；见 `docs/data/service-coverage-report.md`                                                                                                                              |
| 2026-09-04 | 汇总决策字段缺失率                             | 分别量化 Fuel/Charge 价格、排班营业与实时状态，以及 Air/Wash 价格/设备状态的 Unknown 边界；见 `docs/data/decision-field-missingness-report.md`                                                                                                                               |
| 2026-09-04 | 汇总新鲜度与异常样本                           | 量化 Fuel/Charge/静态/OSM 时间分布并登记时区、过期、坐标、身份、功率、未来时间和标签冲突样本；见 `docs/data/freshness-anomaly-report.md`                                                                                                                                     |
| 2026-09-04 | 完成来源风险、成本与降级方案                   | 为开放数据、OSM、Reve 与 Mapbox 建立成本驱动、预算控制、故障降级和发布门槛；见 `docs/data/source-risk-cost-degradation-report.md`                                                                                                                                            |
| 2026-09-04 | 完成 Phase 1 并确认 V1 范围                    | 六项 Phase 1 验收门槛通过；保留四类服务但采用 capability-aware 行为，进入 Phase 2；见 `docs/decisions/0013-v1-scope-after-data-feasibility.md`                                                                                                                               |
| 2026-09-04 | 建立正式 monorepo 目录骨架                     | pnpm 纳入 API、mobile、contracts、config 与 data-core 五个 workspace，并定义单向依赖和服务端凭据边界；见 `docs/architecture/repository-structure.md`                                                                                                                         |
| 2026-09-04 | 配置开发、测试和生产环境语义                   | 建立三环境严格解析、安全/隔离矩阵和 release-test 生产行为，测试默认禁止 live source；见 `docs/architecture/environments.md`                                                                                                                                                  |
| 2026-09-04 | 建立环境变量与密钥模板                         | 新增安全默认 `.env.example`，服务端密钥留空、同步和付费路线默认关闭，明确移动端公开变量边界；见 `docs/architecture/configuration-and-secrets.md`                                                                                                                             |
| 2026-09-04 | 建立本地代码质量门槛                           | 配置 Prettier、ESLint、TypeScript 和 Vitest，统一以 `pnpm check` 顺序执行格式、静态、类型与 95 项测试检查                                                                                                                                                                    |
| 2026-09-04 | 接入持续集成质量门槛                           | GitHub Actions 在 PR/`main` 上以 Node.js 24、冻结 lockfile、只读权限和禁用来源同步的测试环境执行完整 `pnpm check`；见 `docs/architecture/continuous-integration.md`                                                                                                          |
| 2026-09-04 | 完成本地开发指南                               | 固化 Node/pnpm 版本、首次安装、workspace 命令、来源安全、逐任务提交流程和常见故障处理；见 `docs/development/local-development.md`                                                                                                                                            |
| 2026-09-04 | 建立基础 ServicePoint 契约                     | TypeBox 同源生成运行时 Schema 和 TypeScript 类型，覆盖身份、服务分类、位置、地址和生命周期字段，以 7 项测试固定空值与非法输入边界；见 `docs/architecture/service-point-contract.md`                                                                                          |
| 2026-09-04 | 建立 Fuel 专属契约                             | 定义 Fuel offer/price/discount 字段，以运行时 Schema 和语义校验区分未知/零价、库存状态并固定燃油唯一性与计价单位；见 `docs/architecture/fuel-contract.md`                                                                                                                    |
| 2026-09-04 | 建立 EV 专属契约                               | 固化 ServicePoint → EVSE → connector → tariff 三级设备语义，校验真实容量、动态状态时间与汇总数量，避免以 connector 数冒充可充电车位；见 `docs/architecture/ev-contract.md`                                                                                                   |
| 2026-09-04 | 建立 Air 专属契约                              | 分离设备存在、工作状态、免费/付费、价格、访问与验证时间，要求正向来源证据并拒绝价格语义冲突；见 `docs/architecture/air-contract.md`                                                                                                                                          |
| 2026-09-04 | 建立 Wash 专属契约                             | 分离设备状态、洗车类型、套餐与起价，校验正向来源、类型一致性和最低已知套餐价；见 `docs/architecture/wash-contract.md`                                                                                                                                                        |
| 2026-09-04 | 统一来源、新鲜度与可信度契约                   | 每个 ServicePoint 强制来源/许可摘要，统一五档 freshness、三档 confidence/分数及字段级 provenance，校验独立证据时间与更新依据；见 `docs/architecture/source-quality-contract.md`                                                                                              |
| 2026-09-04 | 统一地域与币种契约                             | 四类服务共享 FR/ES、EUR、WGS84 坐标和结构化地址 Schema，并校验地址国家、时区及空值格式一致性；见 `docs/architecture/geography-currency-contract.md`                                                                                                                          |
| 2026-09-04 | 统一 canonical 枚举                            | service/fuel/EV connector 代码、Schema 与类型集中为唯一语言无关来源，明确未知与来源标签映射规则；见 `docs/architecture/canonical-enums.md`                                                                                                                                   |
| 2026-09-04 | 统一营业、可用性与未知语义                     | ServicePoint 增加规范化排班、评估状态与临时关闭优先级，统一 availability/unknown reason，禁止将未知折叠为负值或零值；见 `docs/architecture/opening-availability-contract.md`                                                                                                 |
| 2026-09-04 | 建立 PostgreSQL/PostGIS 数据库结构             | 在真实 PostgreSQL 18.6/PostGIS 3.6 上连续两次成功执行事务迁移，验证 17 张基础表、迁移记录和 WGS84 geography 字段；完整质量门槛 164 项测试通过；见 `docs/architecture/database-schema.md`                                                                                     |
| 2026-09-04 | 建立地理位置和常用筛选索引                     | 创建 9 个空间/常用筛选索引；数据库确认均 ready/valid，执行计划实际使用 GiST、service type 与 latest Fuel price 索引；完整质量门槛 167 项测试通过；见 `docs/architecture/database-indexes.md`                                                                                 |
| 2026-09-04 | 建立来源原始身份与同步幂等                     | 以来源+原始 ID 唯一约束 raw record，事务验证重复输入不变、较新输入更新、过时输入不覆盖且无重复；完整质量门槛 170 项测试通过；见 `docs/architecture/source-record-idempotency.md`                                                                                             |
| 2026-09-04 | 建立原始数据导入与增量更新                     | worker 按已保存 checkpoint 分页读取，逐页原子提交 raw records 与下一 cursor/high watermark，覆盖恢复、失败回滚、停滞、循环和时间倒退防护；完整质量门槛 178 项测试通过；见 `docs/architecture/incremental-source-import.md`                                                   |
| 2026-09-04 | 建立跨来源站点去重与合并规则                   | 可信 ID/强地址才允许自动匹配，近分候选转人工复核，字段选择禁止旧值或低可信新值降级；数据库保留版本、得分和理由；完整质量门槛 190 项测试通过；见 `docs/architecture/service-point-deduplication.md`                                                                           |
| 2026-09-04 | 建立来源、关闭与缺货生命周期                   | 区分 missing/deleted/withdrawn、站点关闭与单项 Fuel 库存，支持安全恢复、撤回写入阻断和事件历史，真实数据库验证硬删除受限；完整质量门槛 201 项测试通过；见 `docs/architecture/source-lifecycle.md`                                                                            |
| 2026-09-04 | 记录同步时间、数量、错误与耗时                 | 每次同步持久化模式、起止、耗时、已提交页/记录、失败页和脱敏错误，同源并发与重复终结受数据库阻止；完整质量门槛 208 项测试通过；见 `docs/architecture/sync-run-observability.md`                                                                                               |
| 2026-09-04 | 建立同步失败重试与告警                         | 临时错误按有界指数退避重试，永久/耗尽失败与 stale run 写入去重告警 outbox，数据库原子记录 retry chain、due time 和投递结果；完整质量门槛 221 项测试通过；见 `docs/architecture/sync-retry-alerting.md`                                                                       |
| 2026-09-04 | 建立查询缓存与失效规则                         | 以国家+服务 generation 保证来源变化后旧缓存不可读，拒绝竞态产生的过时代际写入，只持久化哈希 key 并限制 TTL；完整质量门槛 229 项测试通过；见 `docs/architecture/query-cache-invalidation.md`                                                                                  |
| 2026-09-04 | 建立可重复数据库测试数据集                     | 全合成固定 fixture 覆盖两国四服务及关闭、缺货、Unknown、EVSE、新旧价格和跨境场景；空库连续加载两次精确一致并回滚；完整质量门槛 233 项测试通过；见 `docs/testing/database-integration-fixture.md`                                                                             |
| 2026-09-04 | 完成 Phase 2 工程与统一数据层                  | 工程基础、统一契约、PostGIS、幂等导入、生命周期、同步审计、重试告警、缓存和 fixture 全部完成；四项 Phase 2 验收门槛通过，进入 Phase 3                                                                                                                                        |
| 2026-09-04 | 实现 PostGIS 服务候选粗筛                      | 按经纬度、服务和有界半径使用 GiST/ST_DWithin 粗筛，返回精确米制距离并稳定排序，跨境结果与关闭状态边界经真实数据库验证；完整质量门槛 241 项测试通过；见 `docs/architecture/service-point-candidate-search.md`                                                                 |
| 2026-09-04 | 实现候选不足自动扩圈                           | 按有界几何序列扩大搜索半径，达到目标数量即停止；上限耗尽时返回真实部分结果、完整尝试轨迹和明确原因；完整质量门槛 246 项测试通过；见 `docs/architecture/expanding-candidate-search.md`                                                                                        |
| 2026-09-04 | 实现 Top N 路线距离与 ETA                      | 最近候选经 provider-neutral 的 1×N Matrix 获取真实驾车距离和 ETA；Mapbox traffic 请求限制为 origin + 最多 9 个目的地并按 ID 安全合并；完整质量门槛 252 项测试通过；见 `docs/architecture/top-candidate-routing.md`                                                           |
| 2026-09-04 | 建立路线缓存与成本硬门槛                       | 精确起点不落库，短时缓存按 coarse cell 的哈希复用；仅 cache miss 原子占用月度 element 预算并记录成功/失败，预算 0 时不调用付费服务；完整质量门槛 264 项测试通过；见 `docs/architecture/route-cache-budget.md`                                                                |
| 2026-09-04 | 实现路线失败诚实降级                           | 不可达、超时、限流、预算和 provider/响应错误均转为明确 reason；保留全部候选及直线距离，绝不伪造驾车距离或 ETA，provider 错误不泄露 token/URL/body；完整质量门槛 268 项测试通过；见 `docs/architecture/route-failure-degradation.md`                                          |
| 2026-09-04 | 实现 Nearest 稳定排名                          | 有真实路线时优先 ETA 并以 road/straight distance 和 ID 决胜；无路线候选保留原因并明确按直线距离降级，输入不被修改；完整质量门槛 273 项测试通过；见 `docs/architecture/nearest-ranking.md`                                                                                    |
| 2026-09-04 | 实现 capability-aware Cheapest                 | 仅 Fuel 当前、可比较且可用的指定燃油价格参与 Cheapest；stale/Unknown/缺货/会员价无优势，其余三类服务返回共享 unavailable reason；完整质量门槛 288 项测试通过；见 `docs/architecture/capability-aware-cheapest.md`                                                            |
| 2026-09-04 | 实现 capability-aware Open now                 | 数据库隔离站点与服务专属排班证据；Fuel 使用站点状态，Charge/Air/Wash 仅凭服务专属状态 conditional 启用，Unknown 不冒充营业且临时关闭优先；真实 PostgreSQL/PostGIS 验证通过，完整质量门槛 300 项测试通过；见 `docs/architecture/capability-aware-open-now.md`                 |
| 2026-09-04 | 统一空结果与 Unknown 响应                      | 明确区分附近无站点、无可比价格、排班 Unknown、全部关闭与能力禁用；保留字段级 Unknown 计数/提示并提供扩圈或 Nearest 回退；完整质量门槛 315 项测试通过；见 `docs/architecture/search-empty-and-unknown-outcomes.md`                                                            |
| 2026-09-04 | 统一法国/西班牙营业时间解析入口                | 法国 JSON `HH.mm` 与西班牙文本星期/范围统一输出 NormalizedOpeningHours，两国 Adapter 删除重复逻辑并保留 partial/Unknown 语义；完整质量门槛 322 项测试通过；见 `docs/architecture/source-opening-hours-parser.md`                                                             |
| 2026-09-04 | 固化 24/7、跨午夜与分段营业语义                | 两国排班统一使用开门含/关门不含边界，跨日延续、分段空档、区间去重排序与同开同关异常均有确定行为；完整质量门槛 329 项测试通过；见 `docs/architecture/advanced-opening-hours.md`                                                                                               |
| 2026-09-04 | 固化营业时间时区与 DST 行为                    | 按站点国家匹配 Paris/Madrid IANA 时区，覆盖冬夏偏移、本地跨日、春季跳时和秋季重复小时；错误时区降级 Unknown；完整质量门槛 334 项测试通过；见 `docs/architecture/opening-hours-timezones.md`                                                                                  |
| 2026-09-04 | 处理节假日 Unknown 与临时关闭                  | 周排班在 public holiday/日历未知时不冒充营业并输出专属 warning；临时关闭覆盖全部排班与 24/7 证据；完整质量门槛 339 项测试通过；见 `docs/architecture/holiday-and-temporary-closure.md`                                                                                       |
| 2026-09-04 | 无法解析的营业时间降级 Unknown                 | 区分缺失、部分与完全无法解析输入，重复/空日期和错误类型不生成无效排班；服务点保留且防御性求值不误报 Open/Closed；完整质量门槛 347 项测试通过；见 `docs/architecture/unparseable-opening-hours.md`                                                                            |
| 2026-09-04 | 定义 Best PriceScore                           | 以最低可比价为 1、最低价/当前价为相对分，Unknown 为 0；免费、并列、异常值和离群值行为确定并返回解释 basis；完整质量门槛 354 项测试通过；见 `docs/architecture/best-price-score.md`                                                                                           |
| 2026-09-04 | 定义 Best DistanceScore 与 TravelTimeScore     | 直线距离为全候选诚实降级分，真实路线 ETA 独立计分；未知 ETA 不伪造，零值、并列、空集、异常输入与离群值行为固定；完整质量门槛 362 项测试通过；见 `docs/architecture/best-distance-travel-time-scores.md`                                                                      |
| 2026-09-04 | 定义 Best OpenScore 与 AvailabilityScore       | 明确 Open/Closing soon/Opening soon 分值，Closed/Unknown 无正分且临时关闭覆盖；只有 Available 获得可用性正分，所有 canonical 状态均有稳定 basis；完整质量门槛 378 项测试通过；见 `docs/architecture/best-open-availability-scores.md`                                        |
| 2026-09-04 | 定义 Best FreshnessScore 与 ReliabilityScore   | Live/Verified/Recent 无惩罚、Stale 降权、Unknown 无正分；confidenceScore 归一化并校验标签区间，不重复应用来源质量调整；完整质量门槛 388 项测试通过；见 `docs/architecture/best-data-quality-scores.md`                                                                       |
| 2026-09-04 | 定义 Fuel 专属 Best 公式                       | 固定 `fuel-best-v1` 七维权重、逐项贡献与稳定决胜顺序；明确目标燃油、不可用与关闭硬排除，Unknown 保留但无虚假优势；完整质量门槛 395 项测试通过；见 `docs/architecture/fuel-best-formula.md`                                                                                   |
| 2026-09-04 | 纳入 Fuel 购买量、油耗与绕路成本               | 以购买成本+总额外绕路燃料成本替代纯单价比较；不猜默认用户数据，完整列出缺失项并支持 litre/kilogram，复现“便宜 €0.03/L 但多绕 15 km 不划算”；完整质量门槛 403 项测试通过；见 `docs/architecture/fuel-trip-cost-model.md`                                                      |
| 2026-09-04 | 定义 EV Best 与 Time-to-Solution 公式          | 固定无价格 `ev-best-v1` 七维代理权重；完整 TTS 仅在 ETA、等待、实际充电时长齐全时求和，缺项保持 null 并列出原因；完整质量门槛 411 项测试通过；见 `docs/architecture/ev-best-time-to-solution-formula.md`                                                                     |
| 2026-09-04 | 接入 EV Best 决策级证据门槛                    | 接入真实 ETA、精确 connector 兼容与相对兼容额定功率；仅法国合格 QualiCharge 动态证据可获得 availability 正分，西班牙和缺失/风险证据诚实保持 Unknown；完整质量门槛 421 项测试通过；见 `docs/architecture/ev-best-evidence-gates.md`                                           |
| 2026-09-04 | 定义 Air/Wash Best 降级规则                    | 仅让距离、服务专属营业、Air public access 与来源可信度等可用证据参与；结果集级重分权重防止 Unknown 获益，只剩距离时明确与 Nearest 回退一致；完整质量门槛 430 项测试通过；见 `docs/architecture/air-wash-best-degradation.md`                                                 |
| 2026-09-04 | 建立 Best 字段级证据降权                       | Missing/Expired/Unknown 与 stale 关键证据无正分，普通 stale 减半，medium/low confidence 按最终可信分缩减；EV 与 Air/Wash 已接入并返回原因；完整质量门槛 444 项测试通过；见 `docs/architecture/best-evidence-quality-adjustment.md`                                           |
| 2026-09-04 | 建立 Best 推荐解释                             | 共享契约固定可本地化原因码与类型化指标；生成器稳定选择主要优势并保留价格/状态/ETA/TTS/数据质量限制，覆盖四类服务；完整质量门槛 460 项测试通过；见 `docs/architecture/best-recommendation-explanations.md`                                                                    |
| 2026-09-04 | 完成全部排序边界矩阵                           | 为 Nearest、Cheapest、Open now 及三类 Best 公式补齐 13 项边界测试，并修复非法距离、关闭站低价、非法 freshness/status 与 TTS 溢出；完整质量门槛 473 项测试通过；见 `docs/testing/ranking-boundary-matrix.md`                                                                  |
| 2026-09-04 | 实现附近服务搜索 API                           | 新增可运行 Fastify 服务和 `GET /v1/nearby`，以依赖注入连接 PostGIS 候选搜索、有界扩圈与基础 canonical 响应，并保护精确 origin；完整质量门槛 479 项测试通过；见 `docs/architecture/nearby-search-api.md`                                                                      |
| 2026-09-04 | 实现服务点详情 API                             | 新增 `GET /v1/service-points/:id` 与 PostgreSQL 详情读取器，返回 canonical 位置、地址、营业和生命周期；UUID 校验、稳定 404 与损坏数据库字段拒绝均有测试；完整质量门槛 485 项测试通过；见 `docs/architecture/service-point-detail-api.md`                                     |
| 2026-09-04 | 支持附近搜索基础控制                           | 新增可选 country、显式 radius 硬边界和四种 sort 参数；执行 Nearest/Open now，并在后续证据接入前明确降级 Cheapest/Best；全新 PostGIS 迁移与验证通过，完整质量门槛 490 项测试通过；见 `docs/architecture/nearby-search-controls.md`                                            |
| 2026-09-04 | 支持附近 Fuel 类型过滤                         | 新增 canonical fuelType 请求与响应字段，PostGIS 仅匹配真实 offer、排除永久不提供并保留临时缺货；无效枚举和跨服务组合在查询前拒绝；全新 PostGIS 验证通过，完整质量门槛 494 项测试通过；见 `docs/architecture/nearby-fuel-filter.md`                                           |
| 2026-09-04 | 支持附近 EV connector 与功率过滤               | 新增 connectorType 与 minimumPowerKw，请求组合必须由同一 operational connector 满足；拒绝 unknown、越界与跨服务筛选并回显有效条件；全新 PostGIS 迁移验证通过，完整质量门槛 500 项测试通过；见 `docs/architecture/nearby-ev-filter.md`                                        |
| 2026-09-04 | 接入 API 价格、状态与来源质量证据              | 附近和详情共用批量服务证据；返回价格/状态/source/freshness/confidence 与四服务字段，按请求时间淘汰过期 Fuel 价格并正式启用合格 Cheapest；真实 Node/pg 四服务 fixture 查询通过，完整质量门槛 509 项测试通过；见 `docs/architecture/api-service-evidence.md`                   |
| 2026-09-04 | 统一 API 错误与降级结果                        | 全部错误使用 requestId/code/message/retryable 且内部细节不外泄；附近响应区分请求 capability 与实际 outcome，返回空结果、回退和 Unknown 精确计数；完整质量门槛 513 项测试通过；见 `docs/architecture/api-errors-and-outcomes.md`                                              |
| 2026-09-04 | 建立 API 输入、限流与安全边界                  | 严格 schema 之外新增 CORS、单客户端/未知路由限流、body 上限、安全/no-store headers、生产 HTTPS 与显式可信代理；精确 origin 不进入请求日志；固定 Fastify 5 插件并记录多实例共享存储门槛；完整质量门槛 521 项测试通过；见 `docs/architecture/api-input-rate-security.md`       |
| 2026-09-04 | 发布 API 契约、示例与调用文档                  | 运行时公开 OpenAPI 3.0 契约并记录两条公共 API、筛选组合、能力/结果语义、错误与安全限制；四份提交的 JSON 示例均由真实 TypeBox schema 校验；完整质量门槛 523 项测试通过；见 `docs/api/README.md`                                                                               |
| 2026-09-07 | 完成 API 集成与性能测试                        | 统一附近接口并行连接批量证据和 Top N 路线，返回安全路线字段及四服务可解释 Best；验证 provider 失败降级、50 候选无 N+1/最多 9 路线元素及 500 ms p95 回归上限；干净 PostgreSQL/PostGIS 验证通过，完整质量门槛 530 项测试通过；见 `docs/testing/api-integration-performance.md` |
| 2026-09-07 | 完成 Phase 3 搜索、路线与决策引擎              | 从暂停点修复充电内部功率字段泄漏导致的响应 500、纠正所选接口功率断言并固定燃油测试时钟；Node.js 24 全量 530 tests、15 项迁移和四服务真实 PostgreSQL 证据读取通过；下一项 P4-APP-01                                                                                           |
| 2026-09-07 | 建立客户端工程、环境配置与 API 层              | Expo SDK 57、React Native 0.86 和 Expo Router 已固定并通过依赖检查；自动生成 OpenAPI 类型、加入类型漂移 CI 和 18 项通信/环境测试；全量 548 tests、iOS/Android bundle 导出通过；下一项 P4-APP-02（首次启动和位置授权），真机与签名验收留在后续发布门槛                        |
| 2026-09-07 | 完成首次启动与前台位置授权                     | P4-APP-02：无自动权限弹窗、近似定位、拒绝降级、10 秒定位超时及监听清理；全量 563 tests 与双平台 bundle 通过，原生配置确认无后台权限；真机权限对话框回归保留为发布门槛                                                                                                        |
| 2026-09-07 | 完成手动位置降级                               | P4-APP-03：八城离线选择、任意合法坐标输入、手动/GPS 竞态隔离及同一会话入口；全量 573 tests 和 iOS/Android bundle 通过；地址在线地理编码未启用，界面明确城市中心语义                                                                                                          |
| 2026-09-07 | 完成三语选择与本地偏好                         | P4-APP-04：EN/FR/ES 目录和即时切换、设备语言回退、串行写入/清除与原生权限文案；只保存语言码；全量 580 tests 和双平台 bundle 通过                                                                                                                                             |
| 2026-09-07 | 完成首页四服务入口                             | P4-APP-05：四服务选择后展示位置入口，使用标准服务值、不加国家边界过滤、不虚构默认位置；586 tests 与双平台 bundle 通过；下一项列表结果页                                                                                                                                      |
| 2026-09-07 | 完成列表优先结果页                             | P4-RES-01：服务/位置连接真实 API，按后端排序展示列表与降级提示，离页/后台清理、旧请求竞态隔离和异常响应保护；603 tests 与双平台 bundle 通过；设备交互验收留在 Phase 5                                                                                                        |
| 2026-09-07 | 完成 capability-aware 排序切换                 | P4-RES-02：四排序与九类燃油选择；不可比较的三服务 Cheapest 禁用、条件能力需当前证据、服务器状态和原因三语解释、请求/实际排序明确区分；622 tests 与双平台 bundle 通过；下一项名称/地址/距离/ETA                                                                               |
| 2026-09-07 | P4-RES-03 地址与行程摘要                       | 同一候选 SQL 查询读取地址，无 N+1；路线/直线距离和未知 ETA 明示；624 tests、双平台 bundle 通过                                                                                                                                                                               |
| 2026-09-07 | P4-RES-04 价格与独立服务状态                   | 价格单位、税费/会员条件及新鲜度展示；营业与设备状态分离；626 tests、类型/格式检查通过                                                                                                                                                                                        |
| 2026-09-07 | P4-RES-05 来源与新鲜度                         | 来源观察/发布时间与抓取时间分别显示，保留归属和许可信息，可信度三语显示；627 tests 通过                                                                                                                                                                                      |
| 2026-09-07 | P4-RES-06 燃油类型与缺货信息                   | 已列油种、所选油种/油价时间和三态缺货展示；628 tests 通过                                                                                                                                                                                                                    |
| 2026-09-07 | P4-RES-07 充电数据边界                         | 额定功率/接口/EVSE 数展示；法国可用数量须满足五分钟时效和一致性，西班牙动态与充电价格明确未知；全量 629 tests 及修订后 99 客户端测试通过                                                                                                                                     |
| 2026-09-07 | P4-RES-08 充气费用与状态                       | 免费/收费/未知、设备故障及顾客限制分别展示；102 客户端测试和类型检查通过                                                                                                                                                                                                     |
| 2026-09-07 | P4-RES-09 洗车类型与价格                       | 七类洗车项目、设备状态和原有单位化价格展示，空类型/无价格保持未知；103 客户端测试和类型检查通过                                                                                                                                                                              |
| 2026-09-07 | P4-RES-10 Best 推荐理由                        | 22 个后端理由码完整三语映射，保留限制和指标单位，无推荐对象时不编造理由；635 tests 与双平台 bundle 通过                                                                                                                                                                      |
| 2026-09-07 | P4-RES-11 服务点详情页                         | UUID 详情路由、真实多服务资料、来源证据、营业原文与生命周期；通用可取消请求复用；637 tests 和双平台 bundle 通过                                                                                                                                                              |
| 2026-09-07 | P4-RES-12 第二层原生地图                       | 与列表同批标记/详情选择，无位置层；Apple/Google 平台配置与缺 key 降级；639 tests 和双平台 bundle 通过；Android 发布密钥与真机地图留在 Phase 5                                                                                                                                |
| 2026-09-07 | P4-NAV-01 外部导航                             | 列表/详情使用 Apple/Google HTTPS 导航链接，只含公共目的地；禁止关闭/无效目的地，提供失败反馈；643 tests 通过                                                                                                                                                                 |
| 2026-09-07 | P4-NAV-02 隐私安全的本地事件                   | 默认关闭的会话 opt-in，曝光去重、结果选择、导航点击/交接事件；白名单无坐标/地址/上传、100 条/15 分钟清除；645 tests 通过；ADR 0015 记录远程统计未开启                                                                                                                        |
| 2026-09-07 | P4-ERR-01 加载与刷新状态                       | 区分首次加载/刷新，提供下拉刷新、取消和取消后重新搜索；不把旧结果显示为新结果；115 客户端测试和类型检查通过                                                                                                                                                                  |
| 2026-09-07 | P4-ERR-02 位置权限失效恢复                     | 结果页内提供重新定位/手动位置入口；拒绝与永久拒绝均可继续四服务搜索，清理后不保留起点；117 客户端测试通过                                                                                                                                                                    |
| 2026-09-07 | P4-ERR-03 网络与响应异常                       | 断网/超时/限流/服务错误/404/无效数据分型三语提示；从后端 schema 静态生成全响应校验器并纳入漂移 CI，无运行时编译；654 tests 和双平台 bundle 通过                                                                                                                              |
| 2026-09-07 | P4-ERR-04 可解释空结果                         | 六类空结果三语原因，明确搜索半径；Nearest/扩大范围仅在有用且不超过 50 km 时提供，保留手动换位置/筛选；126 客户端测试通过                                                                                                                                                     |
| 2026-09-07 | P4-ERR-05 过期与未知数据提示                   | 字段级陈旧/未知/低可信度提示，营业/可用状态观察时间分离；统一时钟使过期充电状态退回未知；128 客户端测试通过                                                                                                                                                                  |
| 2026-09-07 | P4-A11Y-01 基本无障碍与紧凑列表                | 52 点操作按钮、显式选中/展开语义、文字/边框对比度和三语组件交互；144 客户端测试、类型与 lint 通过；设备读屏/大字体验收保留 Phase 5；见 docs/testing/mobile-accessibility.md                                                                                                  |
| 2026-09-07 | Phase 4 全部完成并暂停                         | 25 项开发任务与五项功能验收完成；687 tests、双平台 bundle、四服务事务回滚式 PostGIS 地址验证通过；下一阶段须用户授权；详见 docs/testing/phase4-acceptance.md                                                                                                                 |
| 2026-09-07 | P5-QA-01 Adapter 单元测试矩阵                  | 2 个正式 Adapter 与西班牙补充关联覆盖；新增 20 项边界/自动库存测试，data-core 160 tests 与类型检查通过；EV/OSM 正式采集缺口详见 docs/testing/phase5-adapter-matrix.md                                                                                                        |
| 2026-09-07 | P5-QA-02 字段转换与未知语义                    | 新增 8 项国家身份/单位/缺失证据边界，修复法国未提供自助支付标志被误映射为 false；168 data-core + 83 contract tests 通过；见 docs/testing/phase5-field-conversion.md                                                                                                          |
| 2026-09-07 | P5-QA-03 排序与评分不变性回归                  | 新增 11 项、两组 64 候选排序不变性/有界分数/贡献核对/单调性与 Air/Wash 降级测试；306 API tests 与类型检查通过；见 docs/testing/phase5-ranking-regression.md                                                                                                                  |
| 2026-09-07 | P5-QA-04 全年营业与夏令时边界                  | 新增 6 项含两时区 2,928 个全年边界断言；修复来源时间在夏令时缺失/重复小时被猜测为确定时刻；174 data-core tests 与类型检查通过；见 docs/testing/phase5-calendar-regression.md                                                                                                 |
| 2026-09-07 | P5-QA-05 只读价格异常审计                      | 新增显式命令审计最新燃油价格/单位/未来时间/同单位日内突变；12 项检测测试，318 API tests、类型与 lint 通过；真实空库返回 coverage=empty/exit 2，不误报通过；见 docs/testing/price-anomaly-audit.md                                                                            |
| 2026-09-07 | P5-QA-06 坐标与重复站点只读审计                | 新增 9 项非法/交换/零坐标、地域边界和强身份重复测试；183 data-core tests、API 类型和 lint 通过；真实空库 exit 2；不自动合并/修复，最大 2,000 点显式范围；见 docs/testing/geography-duplicate-audit.md                                                                        |
| 2026-09-07 | P5-QA-07 两国代表地理场景回归                  | 六个城市/郊区/高速场景新增半径单调性/稳定排序/范围检查，既有 La Jonquera 21 FR + 67 ES 跨境精确矩阵通过；189 data-core tests；仅历史来源样本，非实时上线验收；见 docs/testing/phase5-geographic-regression.md                                                                |
| 2026-09-07 | P5-QA-08 故障恢复与强制网络超时                | 客户端对不响应取消的 headers/body 增加强制截止，来源断点恢复和四类路线故障保留结果；全量 765 tests、质量门槛和双平台 bundle 通过；见 docs/testing/phase5-failure-recovery.md                                                                                                 |
| 2026-09-07 | P5-QA-09 真实 HTTP/PostGIS 并发负载测试        | 独立临时库应用 15 项迁移，四服务四排序、4/8 并发各 160 请求零错误，p95 6.12/7.90 ms；临时库已删除；全量 771 tests 与质量门槛通过；本地小样本非生产 SLA；见 docs/testing/phase5-local-load.md                                                                                 |
| 2026-09-07 | Phase 5 部分进度与阻塞交接（非阶段完成）       | QA-01 至 QA-09 共 9/21 项完成并各自 push；QA-10 留存两国十站当前官方记录核对但未勾选；771 tests，CI dc06fcc 成功；运营/部署/设备条件待确认，见 docs/testing/phase5-release-prerequisites.md                                                                                  |
| 2026-09-07 | P5-LEG-03a 原生权限最小化                      | 移除多余权限、关闭 Android 备份，新增双平台 introspect CI 门槛与 11 项回归；170 mobile tests、类型、lint 通过；LEG-03 整项仍待设备/法律依据审查                                                                                                                              |
| 2026-09-07 | P5-LEG-06 应用日志与分析隐私                   | 清除任意异常名称/原文、服务端 request ID、SQL 写入边界过滤；9 个新增测试覆盖正常/错误/限流路径，337 API tests 通过；实际部署日志和未来 SDK 仍须重验                                                                                                                          |
| 2026-09-07 | P5-REL-01a 可移植后端容器                      | 固定 Node 镜像摘要、冻结生产依赖、构建允许列表；非 root/只读/无网络容器实际 API 冒烟通过，纳入 CI；未部署、未上传镜像，REL-01 整项待平台验证                                                                                                                                 |
| 2026-09-07 | P5-REL-05a 发布检查与回滚手册                  | 清单检查器拒绝缺失/重复任务及未完成门槛，10 项回归、347 API tests 通过；真实根清单 exit 2；手册区分应用回退、异常数据与数据库恢复，实际演练待平台                                                                                                                            |
| 2026-09-07 | P5-REL-02a 运行与同步检查                      | 14 项新增回归、361 API tests；真实空库标异常，独立临时库识别 5 个从未同步的来源；320 HTTP 请求零错误，临时库已删除；实际通知/调度未启用                                                                                                                                      |
| 2026-09-07 | Phase 5 独立工程续跑基线                       | 001fd7c 全量 815 tests、双平台 bundle、原生配置和 GitHub CI 34121492843 通过；恢复每小时自动迭代并细化 QA-10 数据链路依赖，外部选择待办不阻断独立工程                                                                                                                        |
| 2026-09-07 | P5-QA-10a / 10b / 10c 连续工程迭代 | 按用户要求暂停小时任务；082758c 字段投影、1625413 事务写入、ace2f48 空营业时间修复均独立 push；有界官方采集 16 新测试、全量 843 tests；18 个当前官方站点在隔离库通过 SQL/API 核对，未关闭整项 QA-10 |
| 2026-09-07 | P5-QA-10d EV/OSM 四步接入 | b2bd9aa、3ea475b、e1ce011、24202f4 分别验证后 push；两国静态 EV 分组/隔离/事务与 OSM 正面标签导入完成，真实临时库通过，原始全国文件未提交 |
| 2026-09-07 | P5-QA-10e 同库四服务当前数据核对 | 8ad2cc0 已 push，CI 34128750158 成功；40 个真实来源站点、两国四服务四排序共 40 次 API 请求通过；不冒充现场/原生验收 |
| 2026-09-07 | P5-LEG-04a 三语来源和默认署名 | a8095c3 已 push；9 新测试、全量 890 tests、双平台 bundle 与原生配置通过；原生结果卡署名无需展开可见并连接许可，法律父项待审 |
| 2026-09-07 | P5-REL-03a Beta 测试材料 | fb33904 已 push，CI 34130088031 成功；三语说明与公开仓库隐私安全反馈表完成、YAML/必填项验证通过；无分发、无真实 issue 或消息 |
| 2026-09-07 | P5-REL-05b 本地恢复演练 | b3ab5b5 已 push，CI 34130646415 成功；7 新测试，40 表/序列与结构摘要一致、四服务 8 次 API 请求通过；禁止覆盖非空库，全部演练临时库清理 |
| 2026-09-07 | P5-LEG-05a 地图技术复核与路线修复 | f0320f2 已 push；3 新回归，全量 900 tests 与质量门槛通过；单元素 Matrix 在网络/预算预留前明确降级，无付费调用；账户条款/真机署名仍待最终验收 |
| 2026-09-07 | 连续工程交接（不是 Phase 5 完成） | 当前 10/21 主任务、13 个工程子项；发布检查正确返回 CHECKLIST_INCOMPLETE/exit 2，4 门槛未过且无清单结构问题；生产工程/外部授权/人工证据分别列入发布前置条件，小时任务保持暂停 |
| 2026-09-07 | P5-REL-01b 发布配置防护 | 1bfc5f4 已 push，CI 34133982554 成功；14 新测试，生产 TLS 及连接串覆盖/全网代理信任保护；空配置 CLI exit 2，不输出凭据 |
| 2026-09-07 | P5-REL-02b 告警投递重试 | 9d5104c 已 push，CI 34134577699 成功；10 新测试与真实临时库并发/间隔/确认/重试上限通过；没有外部通知，接收信息留空 |
| 2026-09-07 | P5-REL-04a 客户端真实 API 联调 | d48bb23 已 push，CI 34135043635 成功；三语四服务四排序、详情、跨境和错误恢复共 65 次 HTTP 请求通过；不冒充真机验收 |
| 2026-09-07 | P5-REL-02c API 指标汇总 | 7257f12 已 push；9 新测试、全量 933 tests 与质量门槛通过；真实日志形状、端点故障不被全局掩盖和 CLI 正常/空/超限行为通过，无外部监控接入 |
| 2026-09-07 | 缺信息跳过留空 | 四项独立工程已逐项验证提交推送；10/21 主任务、17 个工程子项；4 阶段门槛仍未通过且清单结构无误；缺资料填写栏留空，生产同步/日历/许可/设备工作未冒充完成 |
