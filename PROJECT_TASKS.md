# Fuel Now — V1 项目任务清单

> 项目：France + Spain Driver Decision Engine  
> 需求来源：[france_spain_driver_decision_engine_project.md](./france_spain_driver_decision_engine_project.md)  
> 当前状态：进行中  
> 当前阶段：Phase 1 — Data Feasibility Spike
> 下一项任务：`P1-FUEL-07` 每个结果返回 source updated_at 和系统 fetched_at
> 最后更新：2026-09-03

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
- [ ] `P1-FUEL-07` 每个结果返回 source updated_at 和系统 fetched_at
- [ ] `P1-FUEL-08` 明确价格未知、过期、缺货和站点关闭的显示规则
- [ ] `P1-FUEL-09` 验证 Perpignan/Girona 一带的跨境查询
- [ ] `P1-FUEL-10` 人工对照抽查真实站点与价格

## 1.4 Air 和 Wash 数据验证

- [ ] `P1-AIR-01` 验证法国 Fuel 数据中的充气服务字段
- [ ] `P1-AIR-02` 验证西班牙 Fuel 数据中的 Aire y agua 等字段
- [ ] `P1-AIR-03` 统计两国 Air 字段的实际覆盖率
- [ ] `P1-AIR-04` 评估 Air 免费/收费价格字段覆盖率
- [ ] `P1-AIR-05` 评估设备是否可用或损坏的数据覆盖率
- [ ] `P1-WASH-01` 验证法国自动/手动洗车服务字段
- [ ] `P1-WASH-02` 验证西班牙 Lavado 等服务字段
- [ ] `P1-WASH-03` 统计两国 Wash 字段的实际覆盖率
- [ ] `P1-WASH-04` 评估 Wash 类型和价格字段覆盖率
- [ ] `P1-AW-01` 决定是否使用 OpenStreetMap 补充 POI 与服务属性

## 1.5 EV 数据验证

- [ ] `P1-EV-FR-01` 验证法国 IRVE/QualiCharge 静态数据源
- [ ] `P1-EV-FR-02` 验证法国实时 availability 与价格覆盖率
- [ ] `P1-EV-ES-01` 验证西班牙公共充电静态数据源
- [ ] `P1-EV-ES-02` 验证西班牙实时 availability 与价格覆盖率
- [ ] `P1-EV-01` 验证 connector、power、operator 和状态字段
- [ ] `P1-EV-02` 记录各数据源更新频率与许可证要求
- [ ] `P1-EV-03` 决定 V1 可承诺的实时性范围

## 1.6 数据可行性报告

- [ ] `P1-RPT-01` 输出各来源字段映射表
- [ ] `P1-RPT-02` 输出 Fuel、Air、Wash、EV 覆盖率
- [ ] `P1-RPT-03` 输出价格、营业状态和 availability 缺失率
- [ ] `P1-RPT-04` 输出新鲜度分布和异常数据样本
- [ ] `P1-RPT-05` 输出数据源风险、成本和降级方案
- [ ] `P1-RPT-06` 根据报告最终确认或缩减 V1 范围

## Phase 1 验收门槛

- [ ] 给定法国或西班牙 GPS，可返回 10 km 内真实 Fuel Top 10
- [ ] Fuel 已支持 Nearest、Cheapest 和 Open now
- [ ] 每项结果均包含来源及更新时间
- [ ] Air/Wash 实际覆盖率已有量化结论
- [ ] EV 静态与实时数据能力已有量化结论
- [ ] 产品范围已根据真实数据能力重新确认

---

# Phase 2 — 项目骨架与统一数据层

目标：把验证脚本演进为可维护、可扩展的正式后端。

## 2.1 工程基础

- [ ] `P2-ENG-01` 初始化代码仓库与目录结构
- [ ] `P2-ENG-02` 配置开发、测试和生产环境
- [ ] `P2-ENG-03` 提供 `.env.example`，确保密钥不进入版本库
- [ ] `P2-ENG-04` 配置代码格式、静态检查和测试命令
- [ ] `P2-ENG-05` 配置持续集成检查
- [ ] `P2-ENG-06` 编写本地启动和开发说明

## 2.2 统一模型

- [ ] `P2-MOD-01` 定义基础 `ServicePoint` 模型
- [ ] `P2-MOD-02` 定义 Fuel 专属字段
- [ ] `P2-MOD-03` 定义 EV 专属字段
- [ ] `P2-MOD-04` 定义 Air 专属字段
- [ ] `P2-MOD-05` 定义 Wash 专属字段
- [ ] `P2-MOD-06` 定义 source、freshness 和 confidence 模型
- [ ] `P2-MOD-07` 统一国家、币种、坐标和地址格式
- [ ] `P2-MOD-08` 统一燃料、充电接口和服务类型枚举
- [ ] `P2-MOD-09` 定义营业状态、availability 和未知值语义

## 2.3 数据库与同步

- [ ] `P2-DB-01` 建立 PostgreSQL/PostGIS 数据库结构
- [ ] `P2-DB-02` 建立地理位置和常用筛选索引
- [ ] `P2-DB-03` 保存来源原始 ID，保证同步幂等
- [ ] `P2-DB-04` 建立原始数据导入与增量更新任务
- [ ] `P2-DB-05` 建立不同来源的站点去重与合并规则
- [ ] `P2-DB-06` 处理删除、关闭、缺货和来源撤回
- [ ] `P2-DB-07` 记录每次同步时间、数量、错误和耗时
- [ ] `P2-DB-08` 配置更新失败重试与告警
- [ ] `P2-DB-09` 建立缓存和缓存失效规则
- [ ] `P2-DB-10` 准备可重复使用的测试数据集

## Phase 2 验收门槛

- [ ] 两国 Adapter 可通过统一接口执行
- [ ] 数据能重复同步且不会制造重复记录
- [ ] 数据库可按位置、服务类型和状态高效查询
- [ ] 同步失败可被发现、重试和追踪

---

# Phase 3 — 搜索、路线与决策引擎

目标：实现“直接告诉用户去哪”的核心能力。

## 3.1 搜索与路线

- [ ] `P3-SEA-01` 根据经纬度和半径粗筛候选点
- [ ] `P3-SEA-02` 候选不足时自动扩大搜索半径
- [ ] `P3-SEA-03` 对 Top N 调用路线服务计算驾车距离和 ETA
- [ ] `P3-SEA-04` 缓存路线结果并控制第三方接口成本
- [ ] `P3-SEA-05` 处理路线不可达、超时和限流
- [ ] `P3-SEA-06` 实现 Nearest，优先按真实 ETA 排序
- [ ] `P3-SEA-07` 实现 Cheapest
- [ ] `P3-SEA-08` 实现 Open now
- [ ] `P3-SEA-09` 处理无结果、价格未知和状态未知

## 3.2 营业时间

- [ ] `P3-OPEN-01` 解析法国和西班牙不同营业时间格式
- [ ] `P3-OPEN-02` 支持 24/7、跨午夜和分段营业
- [ ] `P3-OPEN-03` 处理 Europe/Paris 与 Europe/Madrid 时区
- [ ] `P3-OPEN-04` 处理节假日未知和临时关闭状态
- [ ] `P3-OPEN-05` 对无法解析的营业时间降级为 Unknown

## 3.3 Best 排名

- [ ] `P3-BEST-01` 定义 PriceScore
- [ ] `P3-BEST-02` 定义 DistanceScore 和 TravelTimeScore
- [ ] `P3-BEST-03` 定义 OpenScore 和 AvailabilityScore
- [ ] `P3-BEST-04` 定义 FreshnessScore 和 ReliabilityScore
- [ ] `P3-BEST-05` 定义 Fuel 专属 Best 公式
- [ ] `P3-BEST-06` 将预计加油量、车辆油耗和绕路成本纳入 Fuel 计算
- [ ] `P3-BEST-07` 定义 EV 专属 Best/Time-to-Solution 公式
- [ ] `P3-BEST-08` 将 ETA、等待时间、充电时间和价格纳入 EV 计算
- [ ] `P3-BEST-09` 定义 Air 和 Wash 的 Best 降级规则
- [ ] `P3-BEST-10` 对缺失、过期和低可信数据降权
- [ ] `P3-BEST-11` 为推荐生成用户可理解的解释
- [ ] `P3-BEST-12` 为所有排序规则编写边界测试

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
- [ ] Nearest、Cheapest、Open now、Best 均有明确一致的行为
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
- [ ] `P4-RES-02` 实现 Nearest/Cheapest/Open now/Best 切换
- [ ] `P4-RES-03` 显示名称、地址、距离和 ETA
- [ ] `P4-RES-04` 显示价格、营业状态和服务状态
- [ ] `P4-RES-05` 显示数据更新时间、来源和可信度
- [ ] `P4-RES-06` 显示 Fuel 类型、价格和缺货信息
- [ ] `P4-RES-07` 显示 EV 功率、接口、可用数量和价格
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

| 日期 | 决策 | 选择 | 理由 | 影响的任务 |
|---|---|---|---|---|
| 2026-09-03 | 首发客户端 | React Native + Expo + TypeScript；首发 iOS/Android，Web 不纳入 V1 | 单一移动代码库适合定位、导航与跨平台 MVP；保留未来 Web 路径 | P0-01 |
| 2026-09-03 | 后端技术栈 | Node.js 24 LTS、TypeScript、Fastify、pnpm workspace；本地 Docker Compose、生产 OCI 容器 | 与客户端共享 TypeScript 契约；适合 Adapter、API 与 Worker；保持部署平台中立 | P0-02 |
| 2026-09-03 | 地理数据库 | PostgreSQL 18 + PostGIS 3.6；geography(Point, 4326) + GiST | 支持米制范围查询、空间索引、关系约束与可追溯数据同步 | P0-03 |
| 2026-09-03 | 地图、路线与 ETA | 后端 Mapbox Matrix；客户端 react-native-maps；外部导航 App | 列表和排名不绑定地图 SDK；小规模 1×N Matrix 符合 Top N ETA 计算；HERE 为首选备选 | P0-04 |
| 2026-09-03 | 数据与搜索验证区域 | Paris、Toulouse、Carcassonne、Perpignan、La Jonquera、Girona、Barcelona、Madrid | 同时覆盖两国大城市、区域城市、跨境走廊和不同站点密度 | P0-05 |
| 2026-09-03 | V1 账号策略 | 核心搜索与导航免登录；偏好保存在设备本地 | 降低紧急场景使用阻力，避免在数据验证前引入账号、恢复与身份数据范围 | P0-06 |
| 2026-09-03 | 位置与隐私边界 | 仅前台按需定位；支持手动输入；精确出发点默认不落库、不进日志和分析 | 遵循目的限制、数据最小化和保存期限原则；避免形成位置历史 | P0-07 |
| 2026-09-03 | 数据来源署名 | API、结果卡、详情页、全局来源/许可证注册表四层展示；保留字段级 provenance | 兼顾用户可信度判断、多来源合并和不同许可证的署名要求 | P0-08 |
| 2026-09-03 | 新鲜度与可信度 | 按字段计算 Live/Verified/Recent/Stale/Unknown；confidence 独立为 high/medium/low | 不让新抓取的旧值伪装成实时数据，并对不同服务使用不同有效期 | P0-09 |
| 2026-09-03 | V1 服务字段 | 按搜索准入、必需可空、可选和查询派生字段定义 Fuel/Charge/Air/Wash | 让未知值保持透明，避免用 0、false、closed 或 free 代替缺失数据 | P0-10 |
| 2026-09-03 | 首发区域 | 全国数据导入与实验性搜索；首轮公开 Beta 质量承诺聚焦 Toulouse–Barcelona 走廊；Paris/Madrid 强制回归 | 先验证跨境核心价值，并将人工验证与运营支持控制在可管理范围 | P0-05、P0-11 |
| 2026-09-03 | 西班牙 Fuel 价格与单位 | 9 个明确产品映射到 V1；液体按 EUR/升，GNC/GNL 按 EUR/公斤；`Fecha` 是当前价格快照断言而非单站提交时间 | 避免混合单位比较和夸大更新时间；保持跨端展示一致 | P1-ES-05、P1-ES-07、P1-FUEL-04 |
| 2026-09-03 | 西班牙 REST/XLS 组合 | REST `IDEESS` 保持主身份；只对确定的一对一 XLS 行补充 `Toma de datos` 和 `Tipo servicio`，不按行序关联 | REST 缺少单站时间/服务方式，XLS 缺少稳定 ID；同址重复站会造成歧义 | P1-ES-06、P1-ES-07 |

# 风险与阻塞记录

| 日期 | 风险或阻塞 | 严重度 | 应对方式 | 状态 |
|---|---|---|---|---|
| 2026-09-03 | Air/Wash 价格与设备状态可能覆盖不足 | 高 | Phase 1 量化覆盖率；V1 对未知状态透明展示 | 待验证 |
| 2026-09-03 | 西班牙 EV 实时 availability/price 覆盖可能不完整 | 高 | 不承诺全国实时；先验证后决定 V1 展示范围 | 待验证 |
| 2026-09-03 | Best 权重尚未定义 | 中 | 先采用可解释规则，再根据导航行为校准 | 待处理 |
| 2026-09-03 | 路线 API 会带来成本和限流 | 中 | Top N 分批计算，增加缓存、用量指标、预算告警和无 ETA 降级；Beta 前复核价格 | 应对方案已定义，待实现 |
| 2026-09-03 | 法国 Fuel 门户的 typed datetime 偏移与原始 France-local 墙钟语义不一致 | 高 | 从原始 `@maj/@debut` 按 `Europe/Paris` 解析，保留原值，隔离未来时间，并用夏/冬令时测试保护 | 已在 `FranceFuelAdapter` 缓解，待持续监控 |
| 2026-09-03 | 当前开发机 Node.js 22 低于项目锁定的 Node.js 24 LTS | 中 | `.nvmrc` 和 `engines` 固定 Node 24；当前兼容性测试通过，CI/发布环境必须使用 Node 24 | 发布环境待落实 |
| 2026-09-03 | MITECO 现代资源的 CC BY 4.0 与旧政府通用声明的“不得更改内容/元数据”措辞存在解释差异 | 高 | 保留原始数据、明确标记 Fuel Now 转换、完整署名；公开 Beta 前由法务复核当时有效条款 | 技术开发获准，发布门槛未关闭 |
| 2026-09-03 | MITECO 全国 Fuel 快照中存在 3 个零坐标和 1 个疑似经纬度互换记录 | 中 | 对西班牙服务区域做地理边界校验并隔离异常；不自动交换坐标 | 已在 `SpainFuelAdapter` 缓解，待持续监控 |
| 2026-09-03 | 西班牙 XLS 有 134 个站点的 `Toma de datos` 超过 7 天，另有 2 个 REST/XLS 补充关联无法消歧 | 高 | 超过截止时间或无法安全关联的价格不获得 Cheapest/Best 优势；持续监控旧值和关联失败数量 | 适配器与匹配索引已缓解，正式同步待监控 |

# 完成记录

完成一个阶段时，在此追加简短记录。

| 日期 | 完成内容 | 结果/证据 |
|---|---|---|
| 2026-09-03 | 建立项目任务清单 | `PROJECT_TASKS.md` |
| 2026-09-03 | 连接 GitHub 仓库并推送项目文档 | `https://github.com/zhyphil/fuelnow`，`main` 跟踪 `origin/main` |
| 2026-09-03 | 建立 Conventional Commits 与自动提交推送工作流 | `AGENTS.md`、`CONTRIBUTING.md` |
| 2026-09-03 | 完成 V1 客户端平台选型 | React Native + Expo + TypeScript；见 `docs/decisions/0001-client-platform.md` |
| 2026-09-03 | 完成后端技术栈与运行方式选型 | Node.js 24 LTS + TypeScript + Fastify + pnpm workspace；见 `docs/decisions/0002-backend-stack.md` |
| 2026-09-03 | 完成地理数据库方案选型 | PostgreSQL 18 + PostGIS 3.6；见 `docs/decisions/0003-geospatial-database.md` |
| 2026-09-03 | 完成地图、路线与 ETA 方案选型 | Mapbox Matrix + react-native-maps + 外部导航；见 `docs/decisions/0004-maps-routing-provider.md` |
| 2026-09-03 | 固定法国、西班牙及跨境验证区域 | 8 个核心锚点和 Toulouse–Barcelona 走廊；见 `docs/decisions/0005-validation-geographies.md` |
| 2026-09-03 | 确定 V1 免登录账号策略 | 核心搜索和导航无需账户；见 `docs/decisions/0006-account-policy.md` |
| 2026-09-03 | 定义位置权限、保存与 GDPR 工程边界 | 前台按需定位且精确出发点默认不持久化；见 `docs/decisions/0007-location-privacy.md` |
| 2026-09-03 | 定义数据来源与许可证署名体系 | 四层 provenance 展示并建立来源注册表；见 `docs/decisions/0008-source-attribution.md` |
| 2026-09-03 | 定义按字段的新鲜度与可信度语义 | 五级 freshness + 独立 confidence；见 `docs/decisions/0009-freshness-confidence.md` |
| 2026-09-03 | 定义 V1 四类服务字段契约 | 明确搜索准入、未知值、价格、状态、来源和查询派生字段；见 `docs/product/v1-service-fields.md` |
| 2026-09-03 | 确定 V1 发布测试与区域 Beta 范围 | 全国数据能力 + Toulouse–Barcelona 走廊质量承诺；见 `docs/decisions/0010-beta-launch-scope.md` |
| 2026-09-03 | 完成 Phase 0 开工决策 | 所有任务和验收门槛完成；ADR 索引见 `docs/decisions/README.md` |
| 2026-09-03 | 找到并探测法国官方 Fuel 实时数据源 | v2 dataset、Records API、CSV/JSON/GeoJSON exports 均可访问；见 `docs/data/france-fuel-source.md` |
| 2026-09-03 | 核实法国 Fuel 数据许可与使用约束 | 允许商业复用、缓存、转换和再分发；必须标注来源与最新更新时间；见 `docs/data/france-fuel-licence.md` |
| 2026-09-03 | 保存法国 Fuel 原始样本与字段字典 | 固定 station `31000001` 的完整 Records API 响应，并记录 47 个字段；见 `fixtures/france-fuel/` 与 `docs/data/france-fuel-fields.md` |
| 2026-09-03 | 验证法国 Fuel 站点基础字段 | 坐标和地址可用；名称/品牌无显式字段；营业时间覆盖 86.32% 且存在多种时段结构；见 `docs/data/france-fuel-basic-fields-validation.md` |
| 2026-09-03 | 验证法国 Fuel 价格与缺货字段 | 价格与原始项一致；确认 France-local 时间解析要求及缺货汇总字段异常；见 `docs/data/france-fuel-price-validation.md` |
| 2026-09-03 | 验证法国 Fuel 关闭、24/7 与设施字段 | 整站临时关闭不可得；区分自动付款与站点 24/7；验证 Air/Wash 标签；见 `docs/data/france-fuel-status-services-validation.md` |
| 2026-09-03 | 实现法国 Fuel 数据适配器 | 建立最小 TypeScript 数据包；真实 fixture、时区、缺货、营业时间及设施映射共 7 项测试通过；见 `packages/data-core/` |
| 2026-09-03 | 实现法国 Fuel 10 km GPS 查询 | Toulouse 官方 12 km 边界样本中正确返回 70 个 10 km 内结果，距离与源 API 相差均小于 2 m；见 `docs/data/france-fuel-nearby-validation.md` |
| 2026-09-03 | 完成法国 Fuel 多地理场景验证 | Paris、Toulouse、Blagnac 郊区/机场和 A9 高速场景全部通过；17 项测试通过；见 `docs/data/france-fuel-geography-validation.md` |
| 2026-09-03 | 找到并探测西班牙官方 Fuel 数据源 | MITECO 全国 REST JSON 返回 11,475 站点，并验证区域过滤、参考列表与 XLS；见 `docs/data/spain-fuel-source.md` |
| 2026-09-03 | 核实西班牙 Fuel 数据许可与使用约束 | 现代资源 CC BY 4.0 允许商业复用、缓存、改编和再分发；记录旧通用声明差异；见 `docs/data/spain-fuel-licence.md` |
| 2026-09-03 | 保存西班牙 Fuel 原始样本与字段字典 | 固定 Pinto 市级 17 条完整响应，并记录 41 个源字符串字段；见 `fixtures/spain-fuel/` 与 `docs/data/spain-fuel-fields.md` |
| 2026-09-03 | 验证西班牙 Fuel 站点基础字段 | 身份和地址完整；确认 `Rótulo` 映射边界、4 个坐标异常及 1,172 种营业时间表达；见 `docs/data/spain-fuel-basic-fields-validation.md` |
| 2026-09-03 | 验证西班牙 Fuel 产品、价格和时间语义 | 42,619 个价格值格式有效；确定 9 个 V1 映射、液体/气体单位和 `Fecha` 快照边界；见 `docs/data/spain-fuel-price-validation.md` |
| 2026-09-03 | 验证西班牙 Fuel 关闭、24/7 与服务字段 | XLS 补充单站时间和服务方式；确认关闭、Air/Wash 与设备状态不可得；见 `docs/data/spain-fuel-status-services-validation.md` |
| 2026-09-03 | 实现西班牙 Fuel 数据适配器 | 真实 Pinto fixture、时间/营业时间、9 种燃料、单位、异常坐标和安全 XLS 补充匹配共 12 项西班牙测试通过；全国 11,475 行验收符合预期；见 `packages/data-core/` |
| 2026-09-03 | 实现西班牙 Fuel 10 km GPS 查询 | Madrid 独立边界 fixture 中正确返回 219 个 10 km 内结果，支持稳定排序、限制和逐行错误；见 `docs/data/spain-fuel-nearby-validation.md` |
| 2026-09-03 | 完成西班牙 Fuel 多地理场景验证 | Madrid、Barcelona、El Prat 郊区/机场和 La Jonquera AP-7 高速场景全部通过；38 项测试通过；见 `docs/data/spain-fuel-geography-validation.md` |
| 2026-09-03 | 统一法国与西班牙 Fuel 模型入口 | 两国真实记录经 country-discriminated 入口转换为同一 `NormalizedServicePoint` 契约；40 项测试通过；见 `docs/data/unified-fuel-model-validation.md` |
| 2026-09-03 | 实现统一 Fuel 直线距离粗筛 | 对两国统一模型执行 0–100 km Haversine 半径筛选，保持输入顺序并验证精确边界；44 项测试通过；见 `docs/data/unified-fuel-distance-validation.md` |
| 2026-09-03 | 实现统一 Fuel Nearest 排序 | 两国查询共用距离升序与全局 ID 决胜规则，排序不改变调用方数组；49 项测试通过；见 `docs/data/unified-fuel-nearest-validation.md` |
| 2026-09-03 | 实现统一 Fuel Cheapest 排序 | 仅比较指定燃料与兼容单位，Stale/Unknown/不可用价格不获得旧低价优势，并以距离和全局 ID 决胜；55 项测试通过；见 `docs/data/unified-fuel-cheapest-validation.md` |
| 2026-09-03 | 实现统一 Fuel Open now 筛选 | 按站点时区计算营业状态并区分 Open/Closed/Unknown，支持分段、跨午夜及法国 24/7 自助 Fuel；64 项测试通过；见 `docs/data/unified-fuel-open-now-validation.md` |
| 2026-09-03 | 验证统一 Fuel 来源署名 | Toulouse 70 条与 Madrid 219 条结果全部返回来源 ID、名称和 HTTPS URL，全局 ID 可反查来源；66 项测试通过；见 `docs/data/unified-fuel-source-attribution-validation.md` |
