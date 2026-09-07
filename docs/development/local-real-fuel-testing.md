# Toulouse 真实燃油本地手机测试

2026-09-07。用户明确要求接入真实数据。当前使用已安装的华为 Fuel Now Test 独立包，经 USB 连接本机 API/Metro；不重新安装、不清除偏好、不改变定位权限。

## 范围与安全边界

- 官方 DGCCRF `prix-des-carburants-en-france-flux-instantane-v2`，来源 ID `fr-fuel-realtime-v2`；沿用 [来源与署名说明](../data/france-fuel-licence.md)。不使用 Google Places 获取站点。
- 固定中心 `43.6047, 1.4442`、12 km，仅一页最多 100 站。返回总数不完整、超过上限、空数据或越界记录均拒绝，不静默截断。沿用 20 秒超时、2 MiB 响应上限、禁止重定向和结构验证。请求不包含用户真实 GPS。
- 每次启动创建全新独立临时库，只允许 `fuel_now_import_<12 位十六进制>` 且空库；不写原 `fuel_now`，不混入 DEMO。导入幂等性重放必须全跳过。
- **一次启动抓取一次，不自动更新**。手机“刷新结果”只重新查询当前快照；重新获取官方数据需正常停止后显式重启该模式。源价格的原始观测时间保留，不平移为新价格。
- 仅回环 USB；真实模式拒绝 `--lan`。默认仍是 DEMO。无付费路线、分析上传、全国扩区或后台来源轮询。已配置的原生基础地图正常使用，不代表生产费用治理已完成。
- 结果列表现有上限 50 条；导入 79 站不表示同时显示 79 条。只有选择油品才展示对应报价；缺失值保持未知。
- 官方来源无站名/品牌时显示“Point de service sans nom”与地址，不猜测商业名称。Air/Wash 仅可能有来源提供的有限标签，Charge 未导入，不能宣称四服务完整覆盖。

## 启动与切换

保持 Docker、Mac 与 USB 连接可用。先在原测试终端 Ctrl+C，确认该运行的临时库正常清理；不要在 3001/8081 仍占用时再开一份。

```sh
cd "/Users/haoyuzuo/Projects/Fuel Now"
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
LIVE_SOURCE_CHECK=true pnpm local:start --real-fuel
```

该命令保持 API 和 Metro 运行；API 健康页 `http://127.0.0.1:3001/` 应显示 `mode: toulouse-real-fuel`、抓取时间和站点数。移动首页/结果顶部同时显示三语真实快照提示。沿用已有专用签名 APK 和原生地图密钥，不将密钥传入 Metro 环境或日志。USB 3001/8081 转发操作见 [手机测试说明](./local-phone-testing.md)；先核对已有映射，不覆盖别的任务。

仅做临时导入/API 验证并自动清理退出：

```sh
LIVE_SOURCE_CHECK=true pnpm local:start --real-fuel --check
```

恢复 DEMO：正常停止真实模式后执行 `pnpm local:start`，重新打开应用确认 DEMO 提示。临时库清理后其中快照不再保留；DEMO 可重新生成，真实快照重启会从官方重新获取。无需删除 Docker volume、原业务库或手机数据。

## 本轮验证记录

- 活跃运行快照：2026-09-07T21:27:42.753Z，79 站，221557 bytes；SHA-256 `8cae1a077b2977c0d15cfafbd61daa8cafa138c1a5711e25bd10ac1ff172841b`。
- 导入 79，重放 written=0/skipped=79；手动 Toulouse 中心、10 km、diesel/nearest 返回 50 条官方来源结果，对应 50 个详情 HTTP 检查通过。先前 `--check` 运行完成并正常删除自身临时库。
- 原 DEMO runner 正常停止并清理其临时库，新的真实 runner/API/Metro 保留运行。未更改原业务库、云配置、手机权限或安装包。
- 华为实际可见真实地址、官方署名、地图底图与多枚真实站点标记。选择 Gazole 后，首条 `36 ALLEE DES DEMOISELLES, 31400 Toulouse` 显示 2,25 €/litre，与 API 的 EUR/liter 2.25 一致；这不是最低价或现场报价保证。
- 本机截图证据：`/tmp/fuel-now-real-home-ready.png`、`/tmp/fuel-now-real-map.png`、`/tmp/fuel-now-real-diesel-card.png`；临时文件不纳入 Git。
- 新增 8 个回归测试：区域约束/截断与越界、显式授权与回环限制、非空/非临时库拒绝、健康页声明、移动环境边界；全量 `pnpm check` 1026 tests 通过。

本轮没有点击真实外部导航，没有请求新 GPS 定位，没有验证现场油价，也没有完成全部平台/网络/无障碍或 Phase 5/6 发布验收。用户可在当前手机柴油结果页继续体验。

## 后续：导航跳转修复与真机复验（2026-09-07）

用户反馈已装 Google Maps 但点击提示无法打开，随后明确同意修复及测试。只读核对安装包存在，Android 可将 Maps HTTPS URL 解析到 Google Maps。根因是将 `Linking.openURL` 直接作为参数传递；当前 RN 0.86.3 实现调用 `this._validateURL`，脱离对象后在原生交接之前抛错，应用 catch 将其显示成通用失败提示。使用当前依赖函数体做隔离诊断，未绑定调用失败且 nativeHandoff=false，通过对象调用成功。

导航调用改为 `(url) => Linking.openURL(url)`；来源页/证据许可证链接同样修复。保留既有目的地坐标、驾驶模式、合成/关闭/无效站点保护、错误提示及重试，不传出发点、不添加 `dir_action=navigate`，不新增收费 API 或权限。链接采用 [Google 官方 Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) 格式。

流程 mock 现在模拟 Linking 的接收者依赖，新增 Android/iOS 失败后重试两项回归，来源页已有三语言测试也经过此校验。全量 `pnpm check` 通过：12 + 83 + 189 + 242 + 502 = 1028 tests。既有 DiagnosticsPanel act 警告仍在，未当作新失败或声称零警告。

华为通过已热更新的详情页实际点击 `Itinéraire · Google Maps`，成功进入 Google Maps 驾车路线预览；未点击开始导航、未改手机设置/权限或重装。当前地图有自身离线地图完成提示，未操作其下载/管理。仅验证该次交接，不验证实际行程/入口位置。官方站点地址为 30 Chemin de Ferro-Lèbres，Google 对目的地坐标反查显示 20 Chem. Ferro-Lèbres，保留来源差异，不修改原始地址。本机证据 `/tmp/fuel-now-navigation-handoff-fixed.png` 含地图位置，不提交 Git 或上传。

当前测试服务保持运行，手机停留 Google Maps 路线预览。详情营业时间原始 JSON 的可读性另行处理，不在本次导航修复内。
