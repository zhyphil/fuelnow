# Phase 5 — 离线发布配置安全检查

2026-09-07，REL-01b。不依赖部署平台、不连接数据库、不发布。

运行 `pnpm --filter @fuel-now/api deployment:check`。配置缺失/不适合部署时 exit 2；通过仅表示此组离线检查通过，始终 releaseAuthorized=false。输出固定问题代码，不打印配置、密钥、数据库地址或任意异常文字。

检查服务器与客户端 production 环境、显式 HTTPS 客户端 API origin、生产数据库配置和明显开发凭据、未知 EXPO_PUBLIC 配置、未审核遥测、API 进程误开启同步以及仍未授权来源。它不进行 DNS/TLS 握手或判断实际服务健康；内网数据库、IAM/无密码认证、私有 CA 等特殊部署方式需独立审核后扩展，不把开发模板当发布通过。

运行时防护同步落实：production 数据库默认 require TLS，显式 disable 和 NODE_TLS_REJECT_UNAUTHORIZED=0 被拒绝；连接串不能包含覆盖 TLS 的 ssl 参数；代理信任禁止 IPv4/IPv6 的 /0。实际数据库连接使用 rejectUnauthorized=true。[node-postgres SSL 文档](https://node-postgres.com/features/ssl)说明连接串 sslmode/sslcert 等可能替换配置中的 ssl 对象，因此集中设置并拒绝覆盖。（2026-09-07 核对）

开发/test 仍允许本地非 TLS PostgreSQL；不修改用户 .env，不新增密钥/账号。由部署方提供 CA 的支持及目标平台配置待确定后处理。缺主体、域名、政策、分发资料继续留空，不由本检查器伪造或自动批准。

验证：14 新测试，451 API tests、类型检查通过；覆盖空配置、密钥不泄露、连接串覆盖、TLS 全局绕过、全网代理信任、客户端地址、未审核来源及遥测。
