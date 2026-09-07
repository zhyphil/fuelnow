# Phase 5 — 原生权限最小化工程检查

2026-09-07，关联 P5-LEG-03。工程子项完成，GDPR 整体验收仍未完成。

## 修改与验证

- Android 显式阻止依赖带入的外部存储读写、悬浮窗、振动、后台定位、位置前台服务与活动识别权限；应用备份关闭。
- 生成配置只允许 INTERNET、COARSE_LOCATION、FINE_LOCATION；近似定位继续可用。现有定位适配器仅按需取得一次 Balanced 精度的前台位置，并在成功、超时和取消后撤销监听。
- iOS 生成配置只允许 WhenInUse 权限说明，拒绝新增后台模式或其他 UsageDescription。
- 新增 `pnpm --filter @fuel-now/mobile privacy:check`，实际运行 Expo introspect 后校验，不输出可能含地图密钥的完整配置；已纳入 CI。
- 11 个新增测试覆盖权限漂移、manifest 删除标记、备份和后台模式；170 个移动端测试、类型与 lint 通过，实际 introspect 检查通过。

## 边界与仍待验收

Expo introspect 是配置插件产物，不是 Gradle 最终合并后的 AndroidManifest，也不是已签名 iOS 安装包。依赖自带的原生清单可能引入额外项；发布时还必须检查最终安装包和真实设备行为。权限修改需要重新构建原生安装包，不能靠 JS 热更新生效。

- [ ] 签名安装包最终权限、系统备份、地图 SDK 数据流验证。
- [ ] 真机近似定位/拒绝/取消、后台停止及手动输入回归。
- [ ] 按实际运营主体和处理方完成法律依据、告知、保存期限、跨境传输与第三方 SDK 审查。

操作系统权限只提供技术访问控制，不替代适用的隐私告知和同意流程。此检查不是 GDPR 合规认证。[CNIL 权限说明](https://www.cnil.fr/fr/permissions-applications-mobiles-recommandations-de-la-cnil-pour-respecter-la-vie-privee)、[Expo 权限配置](https://docs.expo.dev/guides/permissions/)（2026-09-07 查阅）。
