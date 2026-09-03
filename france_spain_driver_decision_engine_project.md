# France + Spain Driver Decision Engine
## 项目完整说明（供 Codex / AI Coding Agent 读取）

> 目标：做一个面向法国和西班牙司机的“即时汽车服务决策 App”。
> 用户不是来“看地图”的，而是来问：**我现在需要什么，附近哪里最快/最近/最便宜能解决？**

---

## 1. 产品核心定位

传统地图产品（Google Maps、Gas Now、Roole Map、Ruta-e 等）主要解决：

- 附近有哪些加油站
- 附近有哪些充电桩
- 附近有哪些洗车点
- 附近有哪些维修点

本项目要进一步解决：

> **不要让我自己看地图研究，直接告诉我现在去哪。**

产品第一阶段聚焦四类服务：

1. ⛽ Fuel / 加油站
2. ⚡ EV Charging / 充电桩
3. 🛞 Air / 轮胎充气点
4. 🧽 Car Wash / 洗车点

后续扩展：

- 🅿️ Parking
- 💧 AdBlue
- 🛞 Tyre / Puncture
- 🔋 Battery
- 🔧 Garage
- 🆘 Roadside Assistance

长期产品方向：

# Driver Decision Engine
或
# Instant Car Solution

核心差异：

- Google Maps 给地点
- 本产品给答案

---

## 2. 用户核心场景

### 场景 A：加油

用户当前位置：Toulouse  
车辆燃料：SP95-E10

系统直接返回：

#### Nearest
1. TotalEnergies — 0.7 km — €1.739/L
2. Carrefour — 1.3 km — €1.659/L
3. Esso — 1.8 km — €1.679/L

#### Cheapest
1. Carrefour — €1.659/L — 1.3 km
2. Esso — €1.679/L — 1.8 km
3. Leclerc — €1.689/L — 3.4 km

#### Best
综合考虑：

- 当前油价
- 绕路距离
- 用户车辆油耗
- 预计加油量
- 营业状态
- 数据更新时间

例如 Leclerc 虽然每升便宜 €0.03，但需要多绕 15 km，则可能不如 Carrefour 实际划算。

---

### 场景 B：轮胎胎压低

用户输入：

> “右前轮只有 1.2 bar。”

系统识别 intent：

`tyre_pressure`

优先给出：

#### 方案 A：最近充气点
Carrefour Station  
600 m  
Air available  
Open  
Free / Price unknown  
预计 3–4 min 到达

#### 方案 B：第二充气点
TotalEnergies  
1.1 km  
24h  
Air available  
€1

后续如果用户补气后仍然掉压：

- tyre shop
- puncture repair
- garage
- mobile tyre service

长期逻辑：

**Car Problem → Solution**

而不是：

**Find a garage**

---

### 场景 C：洗车

用户点“Wash”后不应该只看到地图 POI，而要看到：

#### Nearest
Car Wash A  
700 m  
Automatic

#### Cheapest
Car Wash B  
1.4 km  
€5.99

#### Best
Car Wash C  
900 m  
€7.50  
4.7★  
Open

未来可以按洗车类型筛选：

- Automatic rollers
- High pressure
- Hand wash
- Vacuum
- Interior cleaning

---

### 场景 D：EV 充电

结果应该支持：

- Nearest
- Cheapest
- Fastest charging
- Available now
- Best

示例：

Ionity  
2.1 km  
350 kW  
4/6 available  
€0.xx/kWh

Tesla Supercharger  
3.0 km  
250 kW  
10/12 available

City Charger  
600 m  
22 kW  
1/2 available

核心不是只看距离，而是：

# Time to Solution

可计算：

`ETA + waiting time + charging time + price`

---

## 3. V1 产品范围

### 国家

- 🇫🇷 France
- 🇪🇸 Spain

### 第一版 4 个核心入口

- Fuel
- Charge
- Air
- Wash

### 第一版 4 种核心排序/筛选

- Nearest
- Cheapest
- Open now
- Best

### 每个结果至少展示

- 名称
- 地址
- 距离
- 预计驾车时间 ETA
- 营业状态
- 服务类型
- 当前价格（有则显示）
- 数据更新时间
- 数据来源
- 导航按钮
- 数据可信度 / freshness

地图作为第二层，不作为首屏核心。

---

## 4. 设计原则

### 4.1 不要把用户丢进地图里自己找

核心产品原则：

> **不要让我看地图找答案，直接告诉我去哪。**

### 4.2 默认列表优先

首屏应该直接是：

- Nearest
- Cheapest
- Best

用户需要时再展开地图。

### 4.3 Best 比 Cheapest 更重要

Best 可以结合：

- service price
- detour distance
- travel time
- user vehicle type
- consumption
- opening status
- availability
- data freshness
- user verification

### 4.4 数据可信度必须透明

建议分级：

- 🟢 Live — 官方/运营商动态 API
- 🔵 Verified — 用户近期确认
- 🟡 Recent — 最近几个小时/一天内
- ⚪ Unknown — 位置存在，但价格/状态未知

示例：

Repsol  
Air available  
€1  
Confirmed 2h ago

Total  
Air available  
Price unknown  
Last verified 32 days ago

---

## 5. 法国数据基础

### 5.1 Fuel / 加油站和油价

法国官方：

`prix-carburants.gouv.fr`

优势：

- 全国加油站
- 经纬度
- 地址
- 营业时间
- 服务
- 多种燃油类型
- 当前价格
- 价格更新时间
- rupture de stock
- 临时关闭
- 约 10 分钟级更新 feed
- Licence Ouverte 2.0，可复用

Fuel 是法国第一版最成熟的数据模块之一。

### 5.2 法国加油站服务字段

官方数据/搜索体系中可包含：

- Station de gonflage
- Lavage automatique
- Lavage manuel
- Services réparation / entretien
- Bornes électriques
- Toilettes
- DAB
- Boutique
- 24/24

因此 V1 可以直接通过服务字段筛选：

- Air
- Wash

不必一开始完全依赖众包。

### 5.3 EV / IRVE

法国全国 EV 数据基础较好：

- IRVE
- QualiCharge
- 静态数据
- 动态数据
- connector
- power
- operator
- status
- availability

法国 EV 适合做到较高实时性。

### 5.4 Parking（V2/V3）

法国停车数据：

- 全国有标准 schema
- 各城市/运营商开放数据很多
- 部分城市提供实时空位
- 但属于 city-by-city integration

因此不建议放入 V1 核心。

---

## 6. 西班牙数据基础

### 6.1 Fuel / 加油站和油价

西班牙 MITECO 数据包括：

- 经纬度
- 当前燃油价格
- 品牌
- 营业时间
- 燃料类型
- 服务设施
- discount plans
- AdBlue
- REST 数据接口
- CC BY 4.0

因此：

- Nearby fuel
- Cheapest fuel
- Open now
- Best

都适合直接实现。

### 6.2 Air / Wash

西班牙站点服务中常见：

- Aire y agua
- Lavado
- Aparcamiento
- Carga eléctrica
- 24h

因此第一版 Air / Wash 也有现实数据基础。

### 6.3 EV

西班牙有全国公共充电数据：

- location
- operator
- connector
- power
- 动态 availability/price 体系正在逐步完善

建议 V1：

- 先做静态 + 可获取动态
- 对动态覆盖程度做实际测试
- 不要宣传“全国 100% 实时”除非验证完整

---

## 7. France + Spain 为什么适合作为 MVP

### 7.1 地理连续

典型跨境场景：

Toulouse → Barcelona

用户不应该因为过境换 App。

### 7.2 两国都有大量本地司机 + 自驾游客

特别是租车游客：

- 不知道本地关键词
- 不知道哪个连锁品牌
- 不熟悉附近基础设施

产品可以用 EN / FR / ES 统一体验。

### 7.3 两国官方数据条件好

相比很多欧洲国家：

- 法国 fuel 数据强
- 西班牙 fuel 数据强
- 商业复用许可较清晰
- station services 字段较丰富

### 7.4 后续扩展自然

后续可增加：

- ItalyAdapter
- GermanyAdapter
- SwitzerlandAdapter
- SwedenAdapter

而无需重做产品。

---

## 8. 技术架构建议

从第一天做 Country Adapter + Service Adapter。

```text
France sources ───┐
                  │
Spain sources ────┤
                  ↓
          Country Adapters
                  ↓
        Normalization Layer
                  ↓
       Unified Car POI Database
                  ↓
       Search / Ranking Engine
                  ↓
Nearest · Cheapest · Open · Best
                  ↓
        iOS / Android / Web
```

建议模块：

```text
FranceFuelAdapter
SpainFuelAdapter

FranceEVAdapter
SpainEVAdapter

FranceAirAdapter
SpainAirAdapter

FranceWashAdapter
SpainWashAdapter
```

---

## 9. 建议统一数据模型

```text
ServicePoint

id
country
type
name
latitude
longitude
address
opening_hours

service_types:
- fuel
- charging
- air
- wash
- parking
- garage
- adblue

price
currency

availability
last_updated

source
source_url
freshness
confidence
```

Fuel 扩展：

```text
fuel_type
price_per_liter
out_of_stock
```

EV 扩展：

```text
connector_type
power_kw
available_connectors
total_connectors
price_per_kwh
```

Air 扩展：

```text
free
price
working_status
last_verified
```

Wash 扩展：

```text
wash_type
price
last_verified
```

---

## 10. 搜索和排序逻辑

### 10.1 Nearest

不要只算直线距离。

正确优先级：

1. 先用地理坐标做粗筛
2. Top N 候选再算真实驾车 ETA
3. 按 driving time / road distance 排序

### 10.2 Cheapest

按当前 service price 排序。

数据过旧时：

- 降低 confidence
- 明确显示更新时间

### 10.3 Open now

基于：

- opening_hours
- 24/7
- temporary closure
- live status

### 10.4 Best

建议第一版先用 rule-based score：

```text
BestScore =
PriceScore
+ DistanceScore
+ TravelTimeScore
+ OpenScore
+ AvailabilityScore
+ FreshnessScore
+ ReliabilityScore
```

后续再根据真实用户点击/导航/使用结果训练排序。

---

## 11. 数据补全策略

官方数据并不能覆盖所有实时价格和设备状态。

因此建议四层数据：

### Layer 1 — 官方开放数据

法国/西班牙政府 fuel/EV/services。

### Layer 2 — OpenStreetMap

补：

- brand
- station name
- POI
- service attributes

### Layer 3 — 用户众包

例如：

- Air price = €1
- Free
- Machine broken
- Wash price
- Price correct?
- Still working?

用户可以：

- 点按钮确认
- 拍价格牌
- AI OCR 自动识别

### Layer 4 — 商家 / 品牌合作

以后接：

- TotalEnergies
- Carrefour
- Repsol
- Moeve
- Circle K
- 洗车品牌
- Garage networks

形成真正实时 feed。

---

## 12. 最大的数据缺口

### 12.1 Air 的价格

政府通常知道：

- 有充气设备

但不一定知道：

- 免费
- €0.50
- €1
- 当前设备是否坏

因此需众包/合作补齐。

### 12.2 Wash 的门店级价格

通常知道：

- 有 car wash

但不统一知道：

- Basic price
- Premium price
- 每家站点实时价格

### 12.3 Garage 实时空位

这是后续真正的供应侧壁垒。

目前通常能知道：

- garage 在哪
- 是否营业
- 品牌/评分

但不知道：

- 谁现在能接
- 谁 20 分钟后有空

后续需：

- booking API
- 商家后台
- request/response marketplace

### 12.4 Roadside ETA

救援公司内部有：

- dispatch
- current trucks
- ETA

但通常不是公开数据。

需要商业合作。

---

## 13. V1 不建议做的功能

第一版不要加入：

- 全国实时 Garage availability
- Roadside ETA 聚合
- 全欧洲支持
- AI 故障诊断
- 复杂付款/预约
- 用户车辆完整档案
- 保险整合

这些会拖慢验证。

---

## 14. V1 推荐范围

### 国家

- France
- Spain

### 服务

- Fuel
- Charge
- Air
- Wash

### 排序

- Nearest
- Cheapest
- Open now
- Best

### 结果页

必须有：

- 名称
- 距离
- ETA
- 当前价格
- 服务状态
- 营业状态
- 数据更新时间
- 来源
- 导航

---

## 15. V2 推荐扩展

优先顺序：

1. Parking
2. AdBlue
3. Tyre / Puncture
4. Battery
5. Garage
6. Roadside Assistance

同时开始支持自然语言输入：

> “胎压低了。”

> “我要加 AdBlue。”

> “车打不着。”

系统自动识别 intent。

---

## 16. 长期产品方向

最终首页可以变成：

# What does your car need right now?

用户直接说自然语言。

例如：

> “右前轮只有 1.2 bar。”

系统：

```text
intent = tyre_pressure
```

然后：

1. 查 Air
2. 如果用户反馈继续掉压，推荐 Tyre repair
3. 如果无法继续驾驶，推荐 roadside/mobile tyre

最终目标：

# Problem → Search → Compare → Solution

---

## 17. 与现有竞品的差异

法国已有：

- Gas Now
- Roole Map
- Fulli
- Vroomly

西班牙已有：

- Ruta-e
- TANKO
- 多种 fuel / charging app

因此：

**汽车 POI 地图不是空缺。**

真正差异是：

- 列表优先，而不是地图优先
- Nearest / Cheapest / Best
- 多服务统一
- 跨法国+西班牙
- 价格+availability+freshness
- 后续自然语言 problem solving
- Time-to-Solution

---

## 18. 商业模式

### V1

消费者免费。

优先获取：

- 使用数据
- 众包确认
- 用户习惯
- 导航点击

### 后续收入

#### Affiliate / Referral

- charging
- wash
- tyre
- garage

#### Garage Lead

用户需要维修时：

- €X / qualified lead
- 或成功预约抽佣

#### Transaction Commission

未来支持：

- wash booking
- garage booking
- mobile mechanic
- roadside

#### Sponsored Placement

明确标注 sponsored。

#### B2B Data/API

长期给：

- fleet
- rental car
- insurance
- mobility platform

提供统一汽车服务 API。

---

## 19. 真正的长期护城河

不是：

- 地图
- 加油站地址
- App UI

真正的壁垒是数据：

```text
Service
+
Location
+
Price
+
Availability
+
Reliability
+
Time-to-Solution
+
Real User Confirmation
```

尤其：

- Air 实际价格
- Wash 实际价格
- 设备是否工作
- 实时 availability
- 真实解决时间

这些数据越积累越难复制。

---

## 20. 产品成功关键指标

不要只看下载量。

更重要的是：

### Search → Navigation Rate

用户看到推荐后，有多少人直接点导航。

### Time-to-Decision

用户从打开 App 到选定方案用了多久。

目标：

> 10 秒左右得到行动方案。

### Data freshness

多少结果：

- Live
- < 1h
- < 24h
- stale

### User verification rate

多少用户愿意确认：

- price correct
- machine working
- open
- available

---

## 21. 当前整体判断

### 技术可行性

9/10

### France 数据

9/10

### Spain 数据

8.5–9/10

### Fuel

9.5/10

### EV

8–9/10

### Air / Wash

7–8/10

### Garage / Roadside 实时能力

3–5/10（需要后续合作）

### 市场竞争

中等。

单项竞品不少，但统一“司机即时决策层”还没有明显统治者。

### 欧洲复制性

9/10

---

## 22. 推荐开发顺序

### Phase 0 — Data Spike

先验证：

1. France fuel source
2. Spain fuel source
3. France EV source
4. Spain EV source
5. Air service filtering
6. Wash service filtering

只做脚本/API，不做 UI。

目标：

> 给定 GPS，能返回真实 Top 10。

### Phase 1 — Backend

- adapters
- normalization
- PostGIS
- caching
- search
- ranking
- source attribution
- freshness

### Phase 2 — App

首页四个入口：

- Fuel
- Charge
- Air
- Wash

列表优先。

### Phase 3 — Best Ranking

加入：

- route ETA
- cost
- detour
- freshness
- availability

### Phase 4 — Crowdsourcing

加入：

- Price correct?
- Still working?
- Free / Paid
- Upload photo
- AI OCR

### Phase 5 — Car Problem Solver

自然语言：

> “胎压低了。”

> “车打不着。”

> “我要补胎。”

---

## 23. Codex 开始开发前必须先做的事情

不要先写整个 App。

第一步必须是：

# Data Feasibility Spike

Codex 需要先完成：

1. 调研/验证 France Fuel 官方 feed
2. 调研/验证 Spain Fuel API
3. 验证商业使用许可
4. 写两个 Fuel Adapter
5. 输入 GPS，返回 10km 内 station
6. 支持 Nearest
7. 支持 Cheapest
8. 显示 source + updated_at
9. 再接 Air 服务字段
10. 再接 Wash 服务字段
11. 最后才接 EV

如果这些都跑通，再开始正式前端。

---

## 24. V1 验收标准

第一版至少应该做到：

### France + Spain

给任意支持区域 GPS：

#### Fuel

- 返回 nearby station
- 价格
- 更新时间
- nearest
- cheapest
- open now

#### Air

- 返回可充气点
- 距离
- 营业状态
- price if known
- source

#### Wash

- 返回洗车点
- 类型
- 距离
- 营业状态
- price if known

#### Charge

- 返回 charger
- power
- connector
- availability if available
- price if available

#### 通用

- Best
- Navigate
- source attribution
- freshness
- FR / ES / EN localization-ready

---

## 25. 一句话项目定义

> **一个法国 + 西班牙司机即时决策 App：根据用户当前位置和当前汽车需求，直接给出附近最近、最便宜、当前营业、综合最优的加油、充电、轮胎充气和洗车解决方案，而不是让用户自己在地图里查。**

长期升级：

> **从“附近汽车服务搜索”演化成“汽车问题即时解决引擎”。**
