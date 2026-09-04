# Fuel Now — V1 项目任务清单

> 项目：France + Spain Driver Decision Engine  
> 需求来源：[france_spain_driver_decision_engine_project.md](./france_spain_driver_decision_engine_project.md)  
> 当前状态：进行中  
> 当前阶段：Phase 3 — 搜索、路线与决策引擎
> 下一项任务：`P3-API-01` 实现附近服务搜索 API
> 最后更新：2026-09-04

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

- [ ] `P3-API-01` 实现附近服务搜索 API
- [ ] `P3-API-02` 实现服务点详情 API
- [ ] `P3-API-03` 支持 country、service、radius 和 sort 参数
- [ ] `P3-API-04` 支持燃油类型筛选
- [ ] `P3-API-05` 支持 EV connector 和最低功率筛选
- [ ] `P3-API-06` 返回价格、状态、source、freshness 和 confidence
- [ ] `P3-API-07` 建立统一错误格式与降级结果
- [ ] `P3-API-08` 添加接口输入校验、限流和基本安全保护
- [ ] `P3-API-09` 编写 API 文档与示例
- [ ] `P3-API-10` 建立接口集成与性能测试

## Phase 3 验收门槛

- [ ] 四类服务均可通过统一 API 搜索
- [ ] Nearest、Cheapest、Open now、Best 均按 ADR 0013 capability matrix 返回明确一致的 enabled/conditional/unavailable 行为
- [ ] Best 结果包含可理解的推荐理由
- [ ] 数据缺失或第三方服务失败时仍能提供合理降级结果

---

# Phase 4 — V1 客户端

目标：让用户能在约 10 秒内从打开产品到开始导航。

## 4.1 基础体验

- [ ] `P4-APP-01` 建立客户端工程、环境配置和 API 层
- [ ] `P4-APP-02` 实现首次启动和位置授权
- [ ] `P4-APP-03` 实现手动选择位置的降级方式
- [ ] `P4-APP-04` 实现语言选择及 FR/ES/EN 文案结构
- [ ] `P4-APP-05` 实现首页 Fuel、Charge、Air、Wash 四个入口

## 4.2 搜索结果

- [ ] `P4-RES-01` 实现列表优先的结果页
- [ ] `P4-RES-02` 实现 capability-aware Nearest/Cheapest/Open now/Best 切换，隐藏或解释不可用能力
- [ ] `P4-RES-03` 显示名称、地址、距离和 ETA
- [ ] `P4-RES-04` 显示价格、营业状态和服务状态
- [ ] `P4-RES-05` 显示数据更新时间、来源和可信度
- [ ] `P4-RES-06` 显示 Fuel 类型、价格和缺货信息
- [ ] `P4-RES-07` 显示 EV 功率、接口、条件可用数量；价格不可比较或西班牙动态未启用时明确显示 Unknown
- [ ] `P4-RES-08` 显示 Air 免费/收费/未知和设备状态
- [ ] `P4-RES-09` 显示 Wash 类型和价格
- [ ] `P4-RES-10` 显示 Best 推荐理由
- [ ] `P4-RES-11` 实现服务点详情页
- [ ] `P4-RES-12` 实现地图第二层视图

## 4.3 导航与异常状态

- [ ] `P4-NAV-01` 一键打开 Apple Maps/Google Maps 等导航
- [ ] `P4-NAV-02` 记录搜索曝光、选择和导航点击事件
- [ ] `P4-ERR-01` 实现加载和刷新状态
- [ ] `P4-ERR-02` 实现无位置权限状态
- [ ] `P4-ERR-03` 实现无网络和服务异常状态
- [ ] `P4-ERR-04` 实现附近无结果状态
- [ ] `P4-ERR-05` 实现数据过期或状态未知提示
- [ ] `P4-A11Y-01` 检查大按钮、颜色对比和基本无障碍

## Phase 4 验收门槛

- [ ] 用户可通过四个入口完成搜索
- [ ] 首屏直接给出列表式决策结果
- [ ] 用户能识别结果的价格、状态和可信度
- [ ] 用户可从任一有效结果开始外部导航
- [ ] FR、ES、EN 三种语言结构完整且无硬编码遗漏

---

# Phase 5 — 测试、合规与发布准备

## 5.1 自动化与数据质量

- [ ] `P5-QA-01` 为所有 Adapter 编写单元测试
- [ ] `P5-QA-02` 为统一字段转换编写测试
- [ ] `P5-QA-03` 为排序和 Best 评分编写测试
- [ ] `P5-QA-04` 为营业时间和时区编写测试
- [ ] `P5-QA-05` 建立价格异常检测
- [ ] `P5-QA-06` 建立错误坐标和重复站点检测
- [ ] `P5-QA-07` 测试城市、郊区、高速和跨境区域
- [ ] `P5-QA-08` 测试弱网、无网、来源中断和路线 API 失败
- [ ] `P5-QA-09` 进行接口负载与响应时间测试
- [ ] `P5-QA-10` 人工抽查真实站点、价格和营业状态

## 5.2 隐私与合规

- [ ] `P5-LEG-01` 完成隐私政策
- [ ] `P5-LEG-02` 完成使用条款和免责声明
- [ ] `P5-LEG-03` 确认位置数据采集遵守 GDPR 最小化原则
- [ ] `P5-LEG-04` 检查所有数据源署名和许可证要求
- [ ] `P5-LEG-05` 检查第三方地图与路线服务展示条款
- [ ] `P5-LEG-06` 确认监控与分析不记录不必要的精确位置

## 5.3 发布准备

- [ ] `P5-REL-01` 建立测试和生产部署流程
- [ ] `P5-REL-02` 建立错误监控、性能监控和数据同步告警
- [ ] `P5-REL-03` 准备 Beta 发布说明和反馈渠道
- [ ] `P5-REL-04` 完成核心用户流程回归测试
- [ ] `P5-REL-05` 完成上线检查和回滚方案

## Phase 5 验收门槛

- [ ] 法国和西班牙代表性地区均已通过测试
- [ ] 数据来源、位置隐私和第三方服务要求均已检查
- [ ] 关键错误与同步失败均有监控
- [ ] V1 可以安全地交给小规模真实用户测试

---

# Phase 6 — Beta、指标与数据闭环

- [ ] `P6-MET-01` 统计 Search → Navigation Rate
- [ ] `P6-MET-02` 统计 Time-to-Decision
- [ ] `P6-MET-03` 统计无结果率和搜索失败率
- [ ] `P6-MET-04` 统计 Live、1h、24h 和 Stale 数据比例
- [ ] `P6-MET-05` 统计价格、availability 和营业状态缺失率
- [ ] `P6-MET-06` 分析用户切换排序和放弃搜索的行为
- [ ] `P6-BEST-01` 根据真实导航行为调整 Best 权重
- [ ] `P6-CROWD-01` 设计“价格正确吗？”快速确认
- [ ] `P6-CROWD-02` 设计“仍营业/设备可用吗？”快速确认
- [ ] `P6-CROWD-03` 设计 Free/Paid 和实际价格反馈
- [ ] `P6-CROWD-04` 设计照片上传、OCR 与人工审核流程
- [ ] `P6-CROWD-05` 设计众包可信度、防滥用和过期机制
- [ ] `P6-RPT-01` 输出 Beta 结果及是否扩大区域的结论

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

# 风险与阻塞记录

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

# 完成记录

完成一个阶段时，在此追加简短记录。

| 日期       | 完成内容                                       | 结果/证据                                                                                                                                                                                                                                                    |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-03 | 建立项目任务清单                               | `PROJECT_TASKS.md`                                                                                                                                                                                                                                           |
| 2026-09-03 | 连接 GitHub 仓库并推送项目文档                 | `https://github.com/zhyphil/fuelnow`，`main` 跟踪 `origin/main`                                                                                                                                                                                              |
| 2026-09-03 | 建立 Conventional Commits 与自动提交推送工作流 | `AGENTS.md`、`CONTRIBUTING.md`                                                                                                                                                                                                                               |
| 2026-09-03 | 完成 V1 客户端平台选型                         | React Native + Expo + TypeScript；见 `docs/decisions/0001-client-platform.md`                                                                                                                                                                                |
| 2026-09-03 | 完成后端技术栈与运行方式选型                   | Node.js 24 LTS + TypeScript + Fastify + pnpm workspace；见 `docs/decisions/0002-backend-stack.md`                                                                                                                                                            |
| 2026-09-03 | 完成地理数据库方案选型                         | PostgreSQL 18 + PostGIS 3.6；见 `docs/decisions/0003-geospatial-database.md`                                                                                                                                                                                 |
| 2026-09-03 | 完成地图、路线与 ETA 方案选型                  | Mapbox Matrix + react-native-maps + 外部导航；见 `docs/decisions/0004-maps-routing-provider.md`                                                                                                                                                              |
| 2026-09-03 | 固定法国、西班牙及跨境验证区域                 | 8 个核心锚点和 Toulouse–Barcelona 走廊；见 `docs/decisions/0005-validation-geographies.md`                                                                                                                                                                   |
| 2026-09-03 | 确定 V1 免登录账号策略                         | 核心搜索和导航无需账户；见 `docs/decisions/0006-account-policy.md`                                                                                                                                                                                           |
| 2026-09-03 | 定义位置权限、保存与 GDPR 工程边界             | 前台按需定位且精确出发点默认不持久化；见 `docs/decisions/0007-location-privacy.md`                                                                                                                                                                           |
| 2026-09-03 | 定义数据来源与许可证署名体系                   | 四层 provenance 展示并建立来源注册表；见 `docs/decisions/0008-source-attribution.md`                                                                                                                                                                         |
| 2026-09-03 | 定义按字段的新鲜度与可信度语义                 | 五级 freshness + 独立 confidence；见 `docs/decisions/0009-freshness-confidence.md`                                                                                                                                                                           |
| 2026-09-03 | 定义 V1 四类服务字段契约                       | 明确搜索准入、未知值、价格、状态、来源和查询派生字段；见 `docs/product/v1-service-fields.md`                                                                                                                                                                 |
| 2026-09-03 | 确定 V1 发布测试与区域 Beta 范围               | 全国数据能力 + Toulouse–Barcelona 走廊质量承诺；见 `docs/decisions/0010-beta-launch-scope.md`                                                                                                                                                                |
| 2026-09-03 | 完成 Phase 0 开工决策                          | 所有任务和验收门槛完成；ADR 索引见 `docs/decisions/README.md`                                                                                                                                                                                                |
| 2026-09-03 | 找到并探测法国官方 Fuel 实时数据源             | v2 dataset、Records API、CSV/JSON/GeoJSON exports 均可访问；见 `docs/data/france-fuel-source.md`                                                                                                                                                             |
| 2026-09-03 | 核实法国 Fuel 数据许可与使用约束               | 允许商业复用、缓存、转换和再分发；必须标注来源与最新更新时间；见 `docs/data/france-fuel-licence.md`                                                                                                                                                          |
| 2026-09-03 | 保存法国 Fuel 原始样本与字段字典               | 固定 station `31000001` 的完整 Records API 响应，并记录 47 个字段；见 `fixtures/france-fuel/` 与 `docs/data/france-fuel-fields.md`                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 站点基础字段                     | 坐标和地址可用；名称/品牌无显式字段；营业时间覆盖 86.32% 且存在多种时段结构；见 `docs/data/france-fuel-basic-fields-validation.md`                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 价格与缺货字段                   | 价格与原始项一致；确认 France-local 时间解析要求及缺货汇总字段异常；见 `docs/data/france-fuel-price-validation.md`                                                                                                                                           |
| 2026-09-03 | 验证法国 Fuel 关闭、24/7 与设施字段            | 整站临时关闭不可得；区分自动付款与站点 24/7；验证 Air/Wash 标签；见 `docs/data/france-fuel-status-services-validation.md`                                                                                                                                    |
| 2026-09-03 | 实现法国 Fuel 数据适配器                       | 建立最小 TypeScript 数据包；真实 fixture、时区、缺货、营业时间及设施映射共 7 项测试通过；见 `packages/data-core/`                                                                                                                                            |
| 2026-09-03 | 实现法国 Fuel 10 km GPS 查询                   | Toulouse 官方 12 km 边界样本中正确返回 70 个 10 km 内结果，距离与源 API 相差均小于 2 m；见 `docs/data/france-fuel-nearby-validation.md`                                                                                                                      |
| 2026-09-03 | 完成法国 Fuel 多地理场景验证                   | Paris、Toulouse、Blagnac 郊区/机场和 A9 高速场景全部通过；17 项测试通过；见 `docs/data/france-fuel-geography-validation.md`                                                                                                                                  |
| 2026-09-03 | 找到并探测西班牙官方 Fuel 数据源               | MITECO 全国 REST JSON 返回 11,475 站点，并验证区域过滤、参考列表与 XLS；见 `docs/data/spain-fuel-source.md`                                                                                                                                                  |
| 2026-09-03 | 核实西班牙 Fuel 数据许可与使用约束             | 现代资源 CC BY 4.0 允许商业复用、缓存、改编和再分发；记录旧通用声明差异；见 `docs/data/spain-fuel-licence.md`                                                                                                                                                |
| 2026-09-03 | 保存西班牙 Fuel 原始样本与字段字典             | 固定 Pinto 市级 17 条完整响应，并记录 41 个源字符串字段；见 `fixtures/spain-fuel/` 与 `docs/data/spain-fuel-fields.md`                                                                                                                                       |
| 2026-09-03 | 验证西班牙 Fuel 站点基础字段                   | 身份和地址完整；确认 `Rótulo` 映射边界、4 个坐标异常及 1,172 种营业时间表达；见 `docs/data/spain-fuel-basic-fields-validation.md`                                                                                                                            |
| 2026-09-03 | 验证西班牙 Fuel 产品、价格和时间语义           | 42,619 个价格值格式有效；确定 9 个 V1 映射、液体/气体单位和 `Fecha` 快照边界；见 `docs/data/spain-fuel-price-validation.md`                                                                                                                                  |
| 2026-09-03 | 验证西班牙 Fuel 关闭、24/7 与服务字段          | XLS 补充单站时间和服务方式；确认关闭、Air/Wash 与设备状态不可得；见 `docs/data/spain-fuel-status-services-validation.md`                                                                                                                                     |
| 2026-09-03 | 实现西班牙 Fuel 数据适配器                     | 真实 Pinto fixture、时间/营业时间、9 种燃料、单位、异常坐标和安全 XLS 补充匹配共 12 项西班牙测试通过；全国 11,475 行验收符合预期；见 `packages/data-core/`                                                                                                   |
| 2026-09-03 | 实现西班牙 Fuel 10 km GPS 查询                 | Madrid 独立边界 fixture 中正确返回 219 个 10 km 内结果，支持稳定排序、限制和逐行错误；见 `docs/data/spain-fuel-nearby-validation.md`                                                                                                                         |
| 2026-09-03 | 完成西班牙 Fuel 多地理场景验证                 | Madrid、Barcelona、El Prat 郊区/机场和 La Jonquera AP-7 高速场景全部通过；38 项测试通过；见 `docs/data/spain-fuel-geography-validation.md`                                                                                                                   |
| 2026-09-03 | 统一法国与西班牙 Fuel 模型入口                 | 两国真实记录经 country-discriminated 入口转换为同一 `NormalizedServicePoint` 契约；40 项测试通过；见 `docs/data/unified-fuel-model-validation.md`                                                                                                            |
| 2026-09-03 | 实现统一 Fuel 直线距离粗筛                     | 对两国统一模型执行 0–100 km Haversine 半径筛选，保持输入顺序并验证精确边界；44 项测试通过；见 `docs/data/unified-fuel-distance-validation.md`                                                                                                                |
| 2026-09-03 | 实现统一 Fuel Nearest 排序                     | 两国查询共用距离升序与全局 ID 决胜规则，排序不改变调用方数组；49 项测试通过；见 `docs/data/unified-fuel-nearest-validation.md`                                                                                                                               |
| 2026-09-03 | 实现统一 Fuel Cheapest 排序                    | 仅比较指定燃料与兼容单位，Stale/Unknown/不可用价格不获得旧低价优势，并以距离和全局 ID 决胜；55 项测试通过；见 `docs/data/unified-fuel-cheapest-validation.md`                                                                                                |
| 2026-09-03 | 实现统一 Fuel Open now 筛选                    | 按站点时区计算营业状态并区分 Open/Closed/Unknown，支持分段、跨午夜及法国 24/7 自助 Fuel；64 项测试通过；见 `docs/data/unified-fuel-open-now-validation.md`                                                                                                   |
| 2026-09-03 | 验证统一 Fuel 来源署名                         | Toulouse 70 条与 Madrid 219 条结果全部返回来源 ID、名称和 HTTPS URL，全局 ID 可反查来源；66 项测试通过；见 `docs/data/unified-fuel-source-attribution-validation.md`                                                                                         |
| 2026-09-03 | 验证统一 Fuel 来源时间                         | Toulouse 70 条使用 source observed，Madrid 219 条使用 snapshot published，并始终与系统 fetched_at 分离；69 项测试通过；见 `docs/data/unified-fuel-source-timestamps-validation.md`                                                                           |
| 2026-09-03 | 定义统一 Fuel 显示和决策状态                   | 价格 Current/Stale/Expired/Unknown、库存、关闭与本地化 warning code 形成可执行契约；78 项测试通过；见 `docs/data/unified-fuel-decision-state-validation.md`                                                                                                  |
| 2026-09-03 | 验证 Perpignan–Girona 跨境 Fuel 查询           | La Jonquera 25 km 返回法国 21 + 西班牙 67 条；北侧边境点保留更近西班牙站；80 项测试通过；见 `docs/data/cross-border-fuel-search-validation.md`                                                                                                               |
| 2026-09-03 | 人工抽查真实 Fuel 站点与价格                   | 对照两国 10 个城市/机场/高速/边境样本，确认价格、单位、24/7 和临时/永久缺货语义；82 项测试通过；见 `docs/data/manual-fuel-sample-audit.md`                                                                                                                   |
| 2026-09-03 | 验证法国 Fuel 的 Air 字段                      | 全国 5,450/9,804 条含 `Station de gonflage`；244 条固定样本严格匹配 presence，价格/设备状态保持 Unknown；84 项测试通过；见 `docs/data/france-air-field-validation.md`                                                                                        |
| 2026-09-03 | 验证西班牙 Fuel 的 Air 字段边界                | REST 41 字段、XLS 40 列均无 Air/水/设备字段；684 条固定样本保持 Unknown，服务方式不误映射；86 项测试通过；见 `docs/data/spain-air-field-validation.md`                                                                                                       |
| 2026-09-03 | 量化两国 Air 来源覆盖                          | 法国全国 5,450/9,804（55.59%）明确声明 Air；西班牙 MITECO 无该字段，0 known-positive 不能解释为现实中不存在；见 `docs/data/air-coverage-validation.md`                                                                                                       |
| 2026-09-03 | 评估 Air 价格覆盖                              | 法国 5,450 个 Air-positive 记录均无 free/paid/amount，价格 100% Unknown；西班牙无 Air denominator；见 `docs/data/air-price-coverage-validation.md`                                                                                                           |
| 2026-09-03 | 评估 Air 设备状态覆盖                          | 法国 5,450 个 Air-positive 记录均无 working/broken/verified 时间，状态 100% Unknown；西班牙不可测；见 `docs/data/air-equipment-status-coverage-validation.md`                                                                                                |
| 2026-09-03 | 验证法国 Fuel 的 Wash 字段                     | 全国 4,052/9,804 条含自动或手动洗车标签；244 条固定样本严格匹配 presence，`Laverie` 不误映射；88 项测试通过；见 `docs/data/france-wash-field-validation.md`                                                                                                  |
| 2026-09-04 | 验证西班牙 Fuel 的 Wash 字段边界               | REST 41 字段、XLS 40 列均无 Wash/类型/价格/设备字段；684 条固定样本保持 Unknown，服务方式不误映射；90 项测试通过；见 `docs/data/spain-wash-field-validation.md`                                                                                              |
| 2026-09-04 | 量化两国 Wash 来源覆盖                         | 法国全国 4,052/9,804（41.33%）明确声明 Wash；西班牙 MITECO 无该字段，0 known-positive 不能解释为现实中不存在；见 `docs/data/wash-coverage-validation.md`                                                                                                     |
| 2026-09-04 | 评估 Wash 类型和价格覆盖                       | 法国 4,052 个 Wash-positive 记录的详细类型与价格均为 0% known；西班牙无 Wash denominator；见 `docs/data/wash-type-price-coverage-validation.md`                                                                                                              |
| 2026-09-04 | 决定使用 OSM 补充 Air/Wash                     | 四个目标城市均有明确 Air/Wash 候选；仅采纳显式 presence，生产不依赖公共 Overpass，公开 Beta 前审查 ODbL 合并数据库义务；见 `docs/decisions/0011-osm-air-wash-supplement.md`                                                                                  |
| 2026-09-04 | 验证法国 EV 静态数据源                         | PAN Beta 49 字段含 166,339 个 PDC/48,181 个站；QualiCharge 99.97% 已包含，禁止重复叠加；记录重复 ID、坐标、功率和时间异常；见 `docs/data/france-ev-static-source.md`                                                                                         |
| 2026-09-04 | 验证法国 EV 动态 availability/price            | PAN 动态匹配 61.13% 静态 PDC，但最新去重后仅 5.43% 静态 PDC 在 60 分钟内；11,283 个重复 ID；动态价格字段为 0；见 `docs/data/france-ev-dynamic-coverage.md`                                                                                                   |
| 2026-09-04 | 验证西班牙 EV 静态数据源                       | 选定官方 MITECO RIPREE 全国导出；43,610 个连接器行覆盖 36,465 个 PDC/12,214 个安装点；确认三级身份、非标准 CSV 解析、重复连接器和容量异常边界；见 `docs/data/spain-ev-static-source.md`                                                                      |
| 2026-09-04 | 验证西班牙 EV 动态 availability/price          | Reve 内 42,800/44,631 个 EVSE 为 OCPI 动态来源，价格筛选匹配 13,323/14,564 个地点；确认正式 API key、5 次/小时、逐点精确状态及全量身份关联限制；见 `docs/data/spain-ev-dynamic-coverage.md`                                                                  |
| 2026-09-04 | 统一验证两国 EV 字段                           | 建立 service point → EVSE → connector 模型，固定主要接口、功率隔离、运营商身份和 FR/ES 状态优先级；同步细化 V1 Charge 字段契约；见 `docs/data/unified-ev-fields-validation.md`                                                                               |
| 2026-09-04 | 固化 EV 来源更新与许可政策                     | 法国 PAN/QualiCharge 和西班牙 RIPREE 可用于受控开发；Reve/SGV 因商用授权、API 配额和再分发条件未闭环而保持生产禁用；见 `docs/data/ev-source-licence-update-policy.md`                                                                                        |
| 2026-09-04 | 确定 V1 EV 实时承诺范围                        | 两国保留全国静态发现；法国仅满足逐 EVSE Live 门槛时显示可用性，西班牙动态与两国 Charge Cheapest 暂停；见 `docs/decisions/0012-v1-ev-realtime-scope.md`                                                                                                       |
| 2026-09-04 | 汇总全部来源字段映射                           | 建立 Fuel、Charge、Air、Wash 的跨来源 canonical 字段、派生/补充/不可用边界，并统一西班牙 Fuel source ID；见 `docs/data/source-field-mapping-report.md`                                                                                                       |
| 2026-09-04 | 汇总四类服务覆盖率                             | 统一 Fuel 区域密度、Air/Wash 来源确认率与 OSM 候选、Charge 静态规模及动态/新鲜覆盖，禁止混用不同分母；见 `docs/data/service-coverage-report.md`                                                                                                              |
| 2026-09-04 | 汇总决策字段缺失率                             | 分别量化 Fuel/Charge 价格、排班营业与实时状态，以及 Air/Wash 价格/设备状态的 Unknown 边界；见 `docs/data/decision-field-missingness-report.md`                                                                                                               |
| 2026-09-04 | 汇总新鲜度与异常样本                           | 量化 Fuel/Charge/静态/OSM 时间分布并登记时区、过期、坐标、身份、功率、未来时间和标签冲突样本；见 `docs/data/freshness-anomaly-report.md`                                                                                                                     |
| 2026-09-04 | 完成来源风险、成本与降级方案                   | 为开放数据、OSM、Reve 与 Mapbox 建立成本驱动、预算控制、故障降级和发布门槛；见 `docs/data/source-risk-cost-degradation-report.md`                                                                                                                            |
| 2026-09-04 | 完成 Phase 1 并确认 V1 范围                    | 六项 Phase 1 验收门槛通过；保留四类服务但采用 capability-aware 行为，进入 Phase 2；见 `docs/decisions/0013-v1-scope-after-data-feasibility.md`                                                                                                               |
| 2026-09-04 | 建立正式 monorepo 目录骨架                     | pnpm 纳入 API、mobile、contracts、config 与 data-core 五个 workspace，并定义单向依赖和服务端凭据边界；见 `docs/architecture/repository-structure.md`                                                                                                         |
| 2026-09-04 | 配置开发、测试和生产环境语义                   | 建立三环境严格解析、安全/隔离矩阵和 release-test 生产行为，测试默认禁止 live source；见 `docs/architecture/environments.md`                                                                                                                                  |
| 2026-09-04 | 建立环境变量与密钥模板                         | 新增安全默认 `.env.example`，服务端密钥留空、同步和付费路线默认关闭，明确移动端公开变量边界；见 `docs/architecture/configuration-and-secrets.md`                                                                                                             |
| 2026-09-04 | 建立本地代码质量门槛                           | 配置 Prettier、ESLint、TypeScript 和 Vitest，统一以 `pnpm check` 顺序执行格式、静态、类型与 95 项测试检查                                                                                                                                                    |
| 2026-09-04 | 接入持续集成质量门槛                           | GitHub Actions 在 PR/`main` 上以 Node.js 24、冻结 lockfile、只读权限和禁用来源同步的测试环境执行完整 `pnpm check`；见 `docs/architecture/continuous-integration.md`                                                                                          |
| 2026-09-04 | 完成本地开发指南                               | 固化 Node/pnpm 版本、首次安装、workspace 命令、来源安全、逐任务提交流程和常见故障处理；见 `docs/development/local-development.md`                                                                                                                            |
| 2026-09-04 | 建立基础 ServicePoint 契约                     | TypeBox 同源生成运行时 Schema 和 TypeScript 类型，覆盖身份、服务分类、位置、地址和生命周期字段，以 7 项测试固定空值与非法输入边界；见 `docs/architecture/service-point-contract.md`                                                                          |
| 2026-09-04 | 建立 Fuel 专属契约                             | 定义 Fuel offer/price/discount 字段，以运行时 Schema 和语义校验区分未知/零价、库存状态并固定燃油唯一性与计价单位；见 `docs/architecture/fuel-contract.md`                                                                                                    |
| 2026-09-04 | 建立 EV 专属契约                               | 固化 ServicePoint → EVSE → connector → tariff 三级设备语义，校验真实容量、动态状态时间与汇总数量，避免以 connector 数冒充可充电车位；见 `docs/architecture/ev-contract.md`                                                                                   |
| 2026-09-04 | 建立 Air 专属契约                              | 分离设备存在、工作状态、免费/付费、价格、访问与验证时间，要求正向来源证据并拒绝价格语义冲突；见 `docs/architecture/air-contract.md`                                                                                                                          |
| 2026-09-04 | 建立 Wash 专属契约                             | 分离设备状态、洗车类型、套餐与起价，校验正向来源、类型一致性和最低已知套餐价；见 `docs/architecture/wash-contract.md`                                                                                                                                        |
| 2026-09-04 | 统一来源、新鲜度与可信度契约                   | 每个 ServicePoint 强制来源/许可摘要，统一五档 freshness、三档 confidence/分数及字段级 provenance，校验独立证据时间与更新依据；见 `docs/architecture/source-quality-contract.md`                                                                              |
| 2026-09-04 | 统一地域与币种契约                             | 四类服务共享 FR/ES、EUR、WGS84 坐标和结构化地址 Schema，并校验地址国家、时区及空值格式一致性；见 `docs/architecture/geography-currency-contract.md`                                                                                                          |
| 2026-09-04 | 统一 canonical 枚举                            | service/fuel/EV connector 代码、Schema 与类型集中为唯一语言无关来源，明确未知与来源标签映射规则；见 `docs/architecture/canonical-enums.md`                                                                                                                   |
| 2026-09-04 | 统一营业、可用性与未知语义                     | ServicePoint 增加规范化排班、评估状态与临时关闭优先级，统一 availability/unknown reason，禁止将未知折叠为负值或零值；见 `docs/architecture/opening-availability-contract.md`                                                                                 |
| 2026-09-04 | 建立 PostgreSQL/PostGIS 数据库结构             | 在真实 PostgreSQL 18.6/PostGIS 3.6 上连续两次成功执行事务迁移，验证 17 张基础表、迁移记录和 WGS84 geography 字段；完整质量门槛 164 项测试通过；见 `docs/architecture/database-schema.md`                                                                     |
| 2026-09-04 | 建立地理位置和常用筛选索引                     | 创建 9 个空间/常用筛选索引；数据库确认均 ready/valid，执行计划实际使用 GiST、service type 与 latest Fuel price 索引；完整质量门槛 167 项测试通过；见 `docs/architecture/database-indexes.md`                                                                 |
| 2026-09-04 | 建立来源原始身份与同步幂等                     | 以来源+原始 ID 唯一约束 raw record，事务验证重复输入不变、较新输入更新、过时输入不覆盖且无重复；完整质量门槛 170 项测试通过；见 `docs/architecture/source-record-idempotency.md`                                                                             |
| 2026-09-04 | 建立原始数据导入与增量更新                     | worker 按已保存 checkpoint 分页读取，逐页原子提交 raw records 与下一 cursor/high watermark，覆盖恢复、失败回滚、停滞、循环和时间倒退防护；完整质量门槛 178 项测试通过；见 `docs/architecture/incremental-source-import.md`                                   |
| 2026-09-04 | 建立跨来源站点去重与合并规则                   | 可信 ID/强地址才允许自动匹配，近分候选转人工复核，字段选择禁止旧值或低可信新值降级；数据库保留版本、得分和理由；完整质量门槛 190 项测试通过；见 `docs/architecture/service-point-deduplication.md`                                                           |
| 2026-09-04 | 建立来源、关闭与缺货生命周期                   | 区分 missing/deleted/withdrawn、站点关闭与单项 Fuel 库存，支持安全恢复、撤回写入阻断和事件历史，真实数据库验证硬删除受限；完整质量门槛 201 项测试通过；见 `docs/architecture/source-lifecycle.md`                                                            |
| 2026-09-04 | 记录同步时间、数量、错误与耗时                 | 每次同步持久化模式、起止、耗时、已提交页/记录、失败页和脱敏错误，同源并发与重复终结受数据库阻止；完整质量门槛 208 项测试通过；见 `docs/architecture/sync-run-observability.md`                                                                               |
| 2026-09-04 | 建立同步失败重试与告警                         | 临时错误按有界指数退避重试，永久/耗尽失败与 stale run 写入去重告警 outbox，数据库原子记录 retry chain、due time 和投递结果；完整质量门槛 221 项测试通过；见 `docs/architecture/sync-retry-alerting.md`                                                       |
| 2026-09-04 | 建立查询缓存与失效规则                         | 以国家+服务 generation 保证来源变化后旧缓存不可读，拒绝竞态产生的过时代际写入，只持久化哈希 key 并限制 TTL；完整质量门槛 229 项测试通过；见 `docs/architecture/query-cache-invalidation.md`                                                                  |
| 2026-09-04 | 建立可重复数据库测试数据集                     | 全合成固定 fixture 覆盖两国四服务及关闭、缺货、Unknown、EVSE、新旧价格和跨境场景；空库连续加载两次精确一致并回滚；完整质量门槛 233 项测试通过；见 `docs/testing/database-integration-fixture.md`                                                             |
| 2026-09-04 | 完成 Phase 2 工程与统一数据层                  | 工程基础、统一契约、PostGIS、幂等导入、生命周期、同步审计、重试告警、缓存和 fixture 全部完成；四项 Phase 2 验收门槛通过，进入 Phase 3                                                                                                                        |
| 2026-09-04 | 实现 PostGIS 服务候选粗筛                      | 按经纬度、服务和有界半径使用 GiST/ST_DWithin 粗筛，返回精确米制距离并稳定排序，跨境结果与关闭状态边界经真实数据库验证；完整质量门槛 241 项测试通过；见 `docs/architecture/service-point-candidate-search.md`                                                 |
| 2026-09-04 | 实现候选不足自动扩圈                           | 按有界几何序列扩大搜索半径，达到目标数量即停止；上限耗尽时返回真实部分结果、完整尝试轨迹和明确原因；完整质量门槛 246 项测试通过；见 `docs/architecture/expanding-candidate-search.md`                                                                        |
| 2026-09-04 | 实现 Top N 路线距离与 ETA                      | 最近候选经 provider-neutral 的 1×N Matrix 获取真实驾车距离和 ETA；Mapbox traffic 请求限制为 origin + 最多 9 个目的地并按 ID 安全合并；完整质量门槛 252 项测试通过；见 `docs/architecture/top-candidate-routing.md`                                           |
| 2026-09-04 | 建立路线缓存与成本硬门槛                       | 精确起点不落库，短时缓存按 coarse cell 的哈希复用；仅 cache miss 原子占用月度 element 预算并记录成功/失败，预算 0 时不调用付费服务；完整质量门槛 264 项测试通过；见 `docs/architecture/route-cache-budget.md`                                                |
| 2026-09-04 | 实现路线失败诚实降级                           | 不可达、超时、限流、预算和 provider/响应错误均转为明确 reason；保留全部候选及直线距离，绝不伪造驾车距离或 ETA，provider 错误不泄露 token/URL/body；完整质量门槛 268 项测试通过；见 `docs/architecture/route-failure-degradation.md`                          |
| 2026-09-04 | 实现 Nearest 稳定排名                          | 有真实路线时优先 ETA 并以 road/straight distance 和 ID 决胜；无路线候选保留原因并明确按直线距离降级，输入不被修改；完整质量门槛 273 项测试通过；见 `docs/architecture/nearest-ranking.md`                                                                    |
| 2026-09-04 | 实现 capability-aware Cheapest                 | 仅 Fuel 当前、可比较且可用的指定燃油价格参与 Cheapest；stale/Unknown/缺货/会员价无优势，其余三类服务返回共享 unavailable reason；完整质量门槛 288 项测试通过；见 `docs/architecture/capability-aware-cheapest.md`                                            |
| 2026-09-04 | 实现 capability-aware Open now                 | 数据库隔离站点与服务专属排班证据；Fuel 使用站点状态，Charge/Air/Wash 仅凭服务专属状态 conditional 启用，Unknown 不冒充营业且临时关闭优先；真实 PostgreSQL/PostGIS 验证通过，完整质量门槛 300 项测试通过；见 `docs/architecture/capability-aware-open-now.md` |
| 2026-09-04 | 统一空结果与 Unknown 响应                      | 明确区分附近无站点、无可比价格、排班 Unknown、全部关闭与能力禁用；保留字段级 Unknown 计数/提示并提供扩圈或 Nearest 回退；完整质量门槛 315 项测试通过；见 `docs/architecture/search-empty-and-unknown-outcomes.md`                                            |
| 2026-09-04 | 统一法国/西班牙营业时间解析入口                | 法国 JSON `HH.mm` 与西班牙文本星期/范围统一输出 NormalizedOpeningHours，两国 Adapter 删除重复逻辑并保留 partial/Unknown 语义；完整质量门槛 322 项测试通过；见 `docs/architecture/source-opening-hours-parser.md`                                             |
| 2026-09-04 | 固化 24/7、跨午夜与分段营业语义                | 两国排班统一使用开门含/关门不含边界，跨日延续、分段空档、区间去重排序与同开同关异常均有确定行为；完整质量门槛 329 项测试通过；见 `docs/architecture/advanced-opening-hours.md`                                                                               |
| 2026-09-04 | 固化营业时间时区与 DST 行为                    | 按站点国家匹配 Paris/Madrid IANA 时区，覆盖冬夏偏移、本地跨日、春季跳时和秋季重复小时；错误时区降级 Unknown；完整质量门槛 334 项测试通过；见 `docs/architecture/opening-hours-timezones.md`                                                                  |
| 2026-09-04 | 处理节假日 Unknown 与临时关闭                  | 周排班在 public holiday/日历未知时不冒充营业并输出专属 warning；临时关闭覆盖全部排班与 24/7 证据；完整质量门槛 339 项测试通过；见 `docs/architecture/holiday-and-temporary-closure.md`                                                                       |
| 2026-09-04 | 无法解析的营业时间降级 Unknown                 | 区分缺失、部分与完全无法解析输入，重复/空日期和错误类型不生成无效排班；服务点保留且防御性求值不误报 Open/Closed；完整质量门槛 347 项测试通过；见 `docs/architecture/unparseable-opening-hours.md`                                                            |
| 2026-09-04 | 定义 Best PriceScore                           | 以最低可比价为 1、最低价/当前价为相对分，Unknown 为 0；免费、并列、异常值和离群值行为确定并返回解释 basis；完整质量门槛 354 项测试通过；见 `docs/architecture/best-price-score.md`                                                                           |
| 2026-09-04 | 定义 Best DistanceScore 与 TravelTimeScore     | 直线距离为全候选诚实降级分，真实路线 ETA 独立计分；未知 ETA 不伪造，零值、并列、空集、异常输入与离群值行为固定；完整质量门槛 362 项测试通过；见 `docs/architecture/best-distance-travel-time-scores.md`                                                      |
| 2026-09-04 | 定义 Best OpenScore 与 AvailabilityScore       | 明确 Open/Closing soon/Opening soon 分值，Closed/Unknown 无正分且临时关闭覆盖；只有 Available 获得可用性正分，所有 canonical 状态均有稳定 basis；完整质量门槛 378 项测试通过；见 `docs/architecture/best-open-availability-scores.md`                        |
| 2026-09-04 | 定义 Best FreshnessScore 与 ReliabilityScore   | Live/Verified/Recent 无惩罚、Stale 降权、Unknown 无正分；confidenceScore 归一化并校验标签区间，不重复应用来源质量调整；完整质量门槛 388 项测试通过；见 `docs/architecture/best-data-quality-scores.md`                                                       |
| 2026-09-04 | 定义 Fuel 专属 Best 公式                       | 固定 `fuel-best-v1` 七维权重、逐项贡献与稳定决胜顺序；明确目标燃油、不可用与关闭硬排除，Unknown 保留但无虚假优势；完整质量门槛 395 项测试通过；见 `docs/architecture/fuel-best-formula.md`                                                                   |
| 2026-09-04 | 纳入 Fuel 购买量、油耗与绕路成本               | 以购买成本+总额外绕路燃料成本替代纯单价比较；不猜默认用户数据，完整列出缺失项并支持 litre/kilogram，复现“便宜 €0.03/L 但多绕 15 km 不划算”；完整质量门槛 403 项测试通过；见 `docs/architecture/fuel-trip-cost-model.md`                                      |
| 2026-09-04 | 定义 EV Best 与 Time-to-Solution 公式          | 固定无价格 `ev-best-v1` 七维代理权重；完整 TTS 仅在 ETA、等待、实际充电时长齐全时求和，缺项保持 null 并列出原因；完整质量门槛 411 项测试通过；见 `docs/architecture/ev-best-time-to-solution-formula.md`                                                     |
| 2026-09-04 | 接入 EV Best 决策级证据门槛                    | 接入真实 ETA、精确 connector 兼容与相对兼容额定功率；仅法国合格 QualiCharge 动态证据可获得 availability 正分，西班牙和缺失/风险证据诚实保持 Unknown；完整质量门槛 421 项测试通过；见 `docs/architecture/ev-best-evidence-gates.md`                    |
| 2026-09-04 | 定义 Air/Wash Best 降级规则                    | 仅让距离、服务专属营业、Air public access 与来源可信度等可用证据参与；结果集级重分权重防止 Unknown 获益，只剩距离时明确与 Nearest 回退一致；完整质量门槛 430 项测试通过；见 `docs/architecture/air-wash-best-degradation.md`                       |
| 2026-09-04 | 建立 Best 字段级证据降权                       | Missing/Expired/Unknown 与 stale 关键证据无正分，普通 stale 减半，medium/low confidence 按最终可信分缩减；EV 与 Air/Wash 已接入并返回原因；完整质量门槛 444 项测试通过；见 `docs/architecture/best-evidence-quality-adjustment.md`                  |
| 2026-09-04 | 建立 Best 推荐解释                             | 共享契约固定可本地化原因码与类型化指标；生成器稳定选择主要优势并保留价格/状态/ETA/TTS/数据质量限制，覆盖四类服务；完整质量门槛 460 项测试通过；见 `docs/architecture/best-recommendation-explanations.md`                                             |
| 2026-09-04 | 完成全部排序边界矩阵                           | 为 Nearest、Cheapest、Open now 及三类 Best 公式补齐 13 项边界测试，并修复非法距离、关闭站低价、非法 freshness/status 与 TTS 溢出；完整质量门槛 473 项测试通过；见 `docs/testing/ranking-boundary-matrix.md`                                      |
