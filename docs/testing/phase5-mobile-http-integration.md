# Phase 5 — 移动端到真实 HTTP/PostGIS 的跨层回归

2026-09-07，REL-04a 自动联调子项。真实设备定位/地图/系统权限/签名分发与现场验收留空，REL-04 父项仍未完成。

运行：`LOAD_TEST_DATABASE_URL=<loopback dev URL> pnpm --filter @fuel-now/api test:mobile-local`。需要完整仓库（不是裁剪后的生产镜像）。命令随机创建临时数据库并应用全部迁移，使用明确的合成 fixture；API 仅监听本机随机端口。未采集外部来源，未调用付费路线，未修改原业务库。

使用移动端真实 createApiClient、生成的响应校验器、SearchController/ResourceController、三语字段展示和导航链接生成函数；网络层使用真正的 fetch→HTTP→Fastify→PostgreSQL，而非替换 API 返回值。没有加载原生组件宿主，因此不将本检查称作设备 UI 自动化。

2026-09-07 实测：

- EN/FR/ES × Fuel/Charge/Air/Wash × 四种排序，共 48 次搜索，响应通过移动端校验；Nearest 要求非空，其余排序保留合法空集与降级。
- 12 次详情验证同一 ID 和目标服务，生成 Apple/Google 导航目标参数；链接只包含公共目的地、不带起点，不真正打开链接。
- 使用 Toulouse 的 Fuel/Air/Wash、Barcelona 的 Charge 合成样本；另验证 La Jonquera 附近 Fuel 结果同时包含 FR 与 ES。不冒充“两国每个服务都已真机验收”。
- 展示字段不含 undefined/NaN/无效日期；缺路线保留直线距离且 ETA 为空，充电价格及静态空位保持 Unknown。
- 实际 400/404/429 经客户端解析为请求错误、未找到、可重试限流；清理状态回到 idle，已取消请求不发出网络流量。
- 共 65 次 HTTP 请求通过，临时库 `fuel_now_import_8531df9c3a45` 已清理。已加入 GitHub CI。

它补充既有原生组件渲染/交互测试，不代替 iOS/Android 安装包权限、地图密钥/署名、前后台行为、弱网和可访问性实测。仍缺的信息和设备证据不填写。
