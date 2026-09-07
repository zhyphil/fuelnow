# Phase 5 — 地图与路线技术边界复核

2026-09-07，LEG-05a 技术核对与单元素路线修复；LEG-05 最终服务条款/账户/安装包审查未完成。未建立账户、配置密钥、接受条款或调用付费路线。

| 使用方式 | 当前实现与官方依据 | 发布前仍需证据 |
| --- | --- | --- |
| iOS 原生 Apple Maps | ResultMap 使用系统提供方、不启用用户位置层，不隐藏原生标识；[Apple Maps 条款](https://www.apple.com/legal/internet-services/maps/terms-en.html)禁止遮盖法律标识及未经许可的抓取/缓存 | 运营方对应开发者协议与签名包；小屏、大字、深浅色实际截图，原生标识/法律链接不能被遮挡 |
| Android Google Maps SDK | 原生 Google 提供方，标记来自本项目 canonical 数据，不提取地图 POI 内容；[Android SDK 政策](https://developers.google.com/maps/documentation/android-sdk/policies)要求保留已有署名、区分第三方内容，EEA 账单地址另有条款 | 账户账单地区和适用合同、包名/签名证书密钥限制、最终隐私政策及条款、真机署名；Expo Go 不算独立安装包许可与密钥验收 |
| Google 外部导航链接 | 使用 api=1、destination、travelmode，无起点、无用户标识；[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)不要求 API key | 真机安装/未安装地图应用两路径；用户主动交接提示与外部处理方告知 |
| Apple 外部导航链接 | daddr/dirflg，无 saddr；符合[Apple Map Links 参数](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html) | 同上；外部应用自行决定起点，不承诺导航或到达成功 |
| 服务端 Mapbox Matrix | 只获得距离/时长，无路线几何；默认预算为零、无 token 不启用；[Matrix 文档](https://docs.mapbox.com/api/navigation/matrix/)规定 traffic 最多 10 个输入坐标，且至少 2 个矩阵元素 | 账户实际[产品条款](https://www.mapbox.com/legal/product-terms)、与 Apple/Google 地图并用的展示要求、缓存许可/TTL、处理方和费用审批；通用网页入口不能替代账户适用合同的可核验证据 |

以上是代码/公开文档核对，不是法律意见，也没有将地图 SDK 许可与原始站点数据许可混为一谈。地图浏览仍可能使提供方处理浏览区域/网络信息；关闭位置层不等于提供方不处理任何数据。服务端路线如启用，会向 Mapbox 发送起点和目的地，必须在最终数据流与隐私告知中说明，不能沿用“外部导航只传目的地”的表述。

## 修复与验证

复核发现直接 Matrix 调用和缓存过滤后都可能只剩一个元素。现在 Mapbox 明确声明最少 2 个目的地（本项目为单起点矩阵）；直接调用在网络前拒绝，缓存包装器在预算预留前拒绝不足数量的 cache miss，不补造目的地、不多花额度、不生成 ETA。全缓存命中即使只有一条仍可正常读取，不触发网络。

混合缓存只缺一条时，当前策略将这批路线明确降级为 provider_unavailable，保留服务点和直线距离；不把未计算路线误称为不可达。未来如需保留部分缓存 ETA，应扩展明确的逐条不可用协议，不能用空数组冒充真实无路线。

新增 3 项回归：单候选端到端降级、只有一个 cache miss、混合命中后只剩一个 miss；既有缓存全命中测试补充最小数量=2。全部使用注入的本地响应，无真实外部付费请求。

## 真机验收记录格式（保持未执行）

每条记录填写：构建号/Git SHA、设备/OS、语言、测试人/时间、是否通过、去敏截图位置、关联问题。不得填写虚构姓名、完成日期或勾选结果。

- [ ] iOS / Android：打开、缩放、选中、关闭地图，原生署名全程不遮挡。
- [ ] 两平台：最大系统字号/读屏与窄屏检查，来源目录及外链可以操作。
- [ ] Android：无 key 解释性降级；正式限制 key 在正确签名包中成功、错误包不能滥用。
- [ ] 导航应用安装/缺失/取消/网络失败，列表和手动位置仍可用。
- [ ] 抓包与网关配置审查：无位置层；地图/路线处理方告知与实际数据流一致。
- [ ] 最终适用条款、署名、缓存许可、费用与数据处理安排经责任人确认。
