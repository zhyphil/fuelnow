# Phase 5 — 运行与同步监控工程基础

2026-09-07，P5-REL-02a 完成。尚未部署常驻监控、发送通知或演练真实接收；REL-02 整项未完成。

## 只读运行检查

`pnpm --filter @fuel-now/api operations:check` 使用现有 API 环境配置和 DATABASE_URL，连接超时 5 秒、只读事务及 SQL 超时 5 秒。数据库 TLS 使用现有 DATABASE_SSL_MODE=require 时校验服务端证书。

只读取聚合计数，不读取位置、IP、错误文字、来源原始 payload 或密钥。输出下列异常代码：

| 条件                                | 异常代码                 |
| ----------------------------------- | ------------------------ |
| 没有 active 来源                    | no_active_sources        |
| 没有 active 业务站点                | empty_service_database   |
| active 来源从未有成功同步           | sources_never_succeeded  |
| active 来源最后成功超过 24 小时     | sources_overdue_24h      |
| 同步 running 超过 1 小时            | running_over_1h          |
| 最近 24 小时发生失败                | failed_runs_last_24h     |
| 待投递告警                          | alerts_awaiting_delivery |
| 投递失败告警                        | alert_delivery_failed    |
| 应重试而未启动，超过计划时间 5 分钟 | retries_overdue_5m       |

exit 0 表示本次聚合检查没有发现以上情况；exit 2 表示需要处理；exit 1 表示检查失败。连接失败或空库不能静默返回健康。

阈值为初期运营审查默认值，不是各来源 SLA：Fuel/动态充电等需按来源刷新策略进一步收紧。最近一天失败即使随后恢复也保留审查提示。已暂停/撤销来源不进入成功时效计算，但历史失败和未投递告警继续可见。此检查不证明价格、四服务覆盖、API 延迟或真实设备功能正常。

## 实际证据

- 14 个新增测试覆盖所有异常计数、空库、负值/无效值及不读敏感字段的查询；361 API tests、类型与 lint 通过。
- 真实本地业务空库：activeSources=0、servicePoints=0，正确返回两项异常及 exit 2。
- 独立临时库应用 15 个迁移和 fixture：5 个来源、5 个站点，但无成功同步，正确返回 sources_never_succeeded；已有数据不冒充正式采集已经运行。
- 同一临时库实际 HTTP 四服务/四排序、4/8 并发各 160 请求零错误，p95 5.75/7.43 ms。本地 fixture 基线不是生产 SLA。临时库 fuel_now_load_342950e349be 已自动删除，原业务库未修改。

## 部署时仍要完成

- 将只读检查接入实际调度，设置超时、非零退出处理和任务本身失联的告警。
- 将 API 固定路由模板/状态/耗时日志转换为错误率和延迟指标；网关必须移除搜索 query，禁用敏感自动跟踪。
- 部署同步 worker、重试执行器和 outbox 投递器；仅有 outbox 表不代表通知已经发出。接收地址、处理方和凭据确定后再接入。
- 按来源确认时效阈值、批量规模和查表成本；必要时使用只读副本/预聚合，不靠全国频繁全表扫描扩大监控负载。
- 实际触发 API 错误、同步失败、卡住任务和投递失败，确认接收人收到并处理；记录告警延迟、恢复通知和去重。

当前只完成可独立验证的检查基础，不启动外部监控或付费服务。
