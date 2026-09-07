# Phase 5 — 本地隔离备份恢复演练

2026-09-07，REL-05b。正式平台回滚/备份保留/恢复目标验收仍待部署决定。

## 可重复执行

已有本地 Compose PostgreSQL 服务时，从根目录运行：

```sh
LOAD_TEST_DATABASE_URL=postgresql://fuel_now:fuel_now@127.0.0.1:5432/fuel_now pnpm --filter @fuel-now/api test:restore-local
```

此处仅是 Compose 内公开的开发凭据。命令只接受 loopback 管理连接；随机创建两个 `fuel_now_import_<12 hex>` 数据库，一个应用全部 16 项迁移并装入测试数据，另一个保持空库。归档工具固定使用仓库 Compose 的 db 服务；不连接任意云端，不使用外部下载的备份。原 fuel_now 业务库不导入、不恢复、不删除。

## 安全与核验

- PostgreSQL 18 工具在既有容器运行，custom 格式备份只留在内存，最大 8 MiB、进程超时 60 秒；不保存公开下载文件。
- 只允许生成名称，拒绝原库、同库、非空目标；不使用 `--clean` 或 `--create`。恢复使用单事务并遇错退出。
- 核对 40 个非扩展表/序列的行数与内容摘要、约束/索引/应用函数定义摘要，包括 canonical 来源所有权和当前燃油价格指针。序列比较 last_value/is_called，而非内部 WAL log_cnt。
- 恢复后再次尝试覆盖同一目标会在执行恢复前被拒绝；四服务查询分别访问原测试库与恢复库，8 次 API 请求均为 200、非空且站点顺序一致。
- 成功或失败均清理本次创建的临时库；控制台只打印校验摘要与清理结果，不打印归档、原始数据库错误或站点行。

依据：[pg_dump 18](https://www.postgresql.org/docs/18/app-pgdump.html) 支持 custom 归档；[pg_restore 18](https://www.postgresql.org/docs/18/app-pgrestore.html) 的 single-transaction 保证整批成功或不应用更改。恢复会执行来源数据库定义的代码，所以仅恢复本演练可信迁移/fixture 生成的归档。（2026-09-07 核对）

## 2026-09-07 实测

7 项保护单测、434 个 API tests 和类型检查通过。归档 150,450 bytes，40 个表/序列一致；恢复及摘要检查约 1,241 ms，8 次 API 请求通过。首次发现序列内部 WAL 计数不应作为业务一致性条件，调整后实测通过；没有把失败标记为成功。

该次临时库 `fuel_now_import_f9059b1aa1ec`、`fuel_now_import_c762ad5f0d07` 已删除；原库未改动。随后重复验证覆盖拒绝行为并纳入 GitHub CI。

不证明全国数据规模恢复性能、跨机器/跨区灾难恢复、备份加密/保留、角色权限恢复、时间点恢复或生产 RPO/RTO。演练为可移植性忽略 owner/ACL；实际生产必须单独验证账号权限。REL-05 主项继续未完成。
