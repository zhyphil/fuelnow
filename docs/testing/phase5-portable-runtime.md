# Phase 5 — 可移植后端运行包

2026-09-07；P5-REL-01a 工程子项完成。未开通、部署或验证任何云端环境，REL-01 整项仍未完成。

## 构建与安全边界

根 Dockerfile 使用固定摘要的官方 Node 24 Debian slim 镜像、pnpm 10.28.2 与冻结锁文件。仅安装 API 及共享包的生产依赖，tsx 为 TypeScript 运行所需，已从开发依赖调整为生产依赖，未升级版本。

`.dockerignore` 采用允许列表；镜像不含 `.git`、环境文件、移动端、fixtures、测试与原生签名文件。依赖文件由 root 所有，运行使用非管理员 node 用户。运行时默认 production、付费路线预算 0；不自动执行迁移或开启来源采集。

```sh
docker build --tag fuel-now-api:local .
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  --cap-drop ALL --security-opt no-new-privileges \
  --mount "type=bind,src=$PWD/apps/api/scripts/container-smoke.mjs,dst=/app/apps/api/scripts/container-smoke.mjs,readonly" \
  fuel-now-api:local node --import tsx scripts/container-smoke.mjs
```

上面命令从仓库根目录执行，只做本地构建和测试；不是部署命令，不会上传镜像或访问数据库。已在本机实际通过，并纳入 GitHub CI：确认 Node 24、非 root、无开发测试依赖和敏感目录，实际加载 API 的 200/400 响应及 production HTTPS/路线预算配置。数据端口为明确的空值桩，因此不计入真实数据/SQL/上线验收。

## 平台确定后的配置清单

- 测试与生产使用独立数据库、凭据和发布权限；应用镜像以验证过的不可变 digest 晋级，不在生产重建或使用浮动 latest。
- 将 DATABASE_URL 作为运行时 secret 注入；托管数据库显式配置 DATABASE_SSL_MODE=require，并验证 CA/主机名；不通过构建参数传入密钥。
- API_HOST=0.0.0.0、平台监听端口、准确 CORS_ALLOWED_ORIGINS 和 API_TRUSTED_PROXIES；只信任真实网关地址，不用通配转发信任。
- HTTPS 在可信网关终止，原始搜索 query 不进入网关日志。数据库不公开开放给所有 IP。
- 明确 CPU/内存、扩容、数据库连接预算、请求截止、退出排空与平台健康检查。当前镜像冒烟不证明云端 readiness 或数据库可用。
- 迁移由独立受控作业使用匹配版本 SQL 执行，先备份/验证恢复；运行镜像不带 psql、fixtures 或自动迁移入口。
- 接入来源调度、异常隔离、业务数据覆盖检查和真实站点回归；空库不得宣称可测试发布。
- 接入错误/性能/同步告警并实际验证通知；配置日志保存/删除和访问权限。

本机只构建当前架构。CI 在 Linux runner 再次构建并验证；所选托管 CPU 架构须与晋级镜像一致。基础镜像摘要更新必须重新跑 CI 和安全审查，不永久冻结安全补丁。

参考：[Node 官方镜像](https://hub.docker.com/_/node)、[pnpm install](https://pnpm.io/cli/install)。
