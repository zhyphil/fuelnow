# 本机 + iPhone / Android 真机测试

2026-09-07。用户确认：iPhone 15 Pro Max / iOS 26.6.1；华为 Mate 20 HMA-L29 / EMUI 12.0.0。EMUI 版本不能直接当底层 Android 版本，后者仍待确认。用户已在手机浏览器打开后端连接检查页并看到 Toulouse / Barcelona / La Jonquera，确认该手机到 Mac 的后端连接成功；尚未指明是哪台手机，不能据此标记两台均通过。客户端安装和 App 内连接仍待确认；这不是正式 Beta 发布或现场验收。

## 启动与停止

Mac 已有 Node.js 24、pnpm 10.28.2 与可运行的 Docker/PostGIS。保持 Docker 运行，在 Finder 中打开项目根目录，双击 `local-test.command`。它会打开终端并启动局域网测试。不要同时启动两份。

也可以在终端执行：

```sh
cd "/Users/haoyuzuo/Projects/Fuel Now"
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
pnpm local:start --lan
```

- 终端中的 `Phone connection check` 是手机浏览器先要访问的地址，端口 3001；能看到 `ready` 与 `synthetic-local-demo` 表示后端可达。
- Expo 的二维码或 `exp://…:8081` 是兼容 Expo Go 的客户端入口，不是网页版本。请保留启动终端和 Mac 唤醒状态。
- 停止：在该启动终端按 Ctrl+C。脚本停止 API/Expo，并删除本次独立临时数据库；现有 Docker 服务及原数据库保留，避免影响其它任务。
- 重置：先 Ctrl+C，确认输出该临时库 `removed: true`，再重新启动。每次都是新模拟数据，无需删除原数据库或 Docker volume。
- 仅在 Mac 测：`pnpm local:start`，默认回环地址，手机无法连接；仅后端：`pnpm local:start --lan --api-only`。
- 自检：`pnpm local:check`，验证四服务、详情与可用模拟 Fuel 价格，随后自行清理退出。

启动不修改 `.env`、不使用已有数据库连接参数、不启用来源同步、路线计费、外部分析或上传。只连接 Compose 在本机 5432 提供的开发数据库管理端，为每次运行生成独立 `fuel_now_import_<随机值>` 数据库，自动迁移并种入模拟数据。原 `fuel_now` 库不被填充或重置。

临时库中的日期相对启动时间平移，保留原示例的新旧相对年龄，仅为演示可用价格与过期情形；这不是刷新真实观测。原 `base.sql` 固定测试时钟与文件不变。所有站点名带 DEMO，source 为 `__fixture__`，App 禁止向这些虚构站点发起真实导航。

## 两台手机如何接入

1. Mac 与手机连接同一个可信的家庭 Wi-Fi，先不用蜂窝网络/访客 Wi-Fi，不配置公网穿透。
2. 打开启动终端给出的连接检查地址。手机上的 `127.0.0.1` 指手机自身，不是 Mac；Wi-Fi 变更后重启生成新地址。
3. 若连接失败，先确认 API 未退出、Mac 未睡眠，再检查路由器客户端隔离、VPN 和 macOS 的本地网络/防火墙允许提示。只允许所需应用在可信局域网连接，不关闭整个防火墙。电脑端自己访问 LAN 地址失败也可能是系统权限问题，不能据此宣称手机已连通。
4. 网络通后，再安装/打开匹配 **Expo SDK 57** 的运行客户端并扫描终端二维码。版本不匹配不会因为后端正常而自行恢复，不要为绕过安装问题擅自降级项目。

官方资料核对（2026-09-07）：[Expo SDK 系统要求](https://docs.expo.dev/versions/latest/) 列出 SDK 57 支持 Android 7+、iOS 16.4+。具体设备系统版本仍要确认；可安装不等于地图/GPS/权限已验收。

### iPhone 15 Pro Max

先核对 iOS 版本和运行客户端版本。[Expo 版本兼容排查](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) 说明项目与 Expo Go 必须匹配；其中实机 iOS 的 SDK 55+ 分发需要特别处理，不能笼统承诺 App Store 版可直接扫描 SDK 57。

若安装的 Expo Go 不匹配，可选择匹配的已签名客户端或本机原生调试构建。后者需要完整 Xcode、设备信任/开发者模式和 Apple 签名设置；此 Mac 当前工具链尚无 simctl，未自动安装 Xcode或操作 Apple 账户。TestFlight/EAS 路线涉及会员/账户和外部上传，尚未授权也未执行。参阅 [本地原生构建](https://docs.expo.dev/guides/local-app-development/)。

### 华为 Mate 20

确认 Android/EMUI 版本，而不只看型号。使用 [Expo 官方版本选择入口](https://expo.dev/go) 找匹配 SDK 57 的 Android 客户端；没有 Google Play 时需采用官方可用的兼容 APK/本地调试安装路径，不从不明网站下载。安装未知来源如确有必要，仅临时授权选定安装来源，装完关闭。

若没有 Google Play 服务，Google 地图展示/打开和设备定位可能受限；先使用手动城市完成列表与详情测试，将地图问题单独记录，不当作后端失败。App 没有实现华为专用地图或 HMS 适配。需要本机构建 APK 时还须配置 Android SDK/JDK/USB 调试，这次未自动安装大型工具链或给手机授权。

## 从哪里开始点

| 手动城市 | 服务 | 预期 |
| --- | --- | --- |
| Toulouse | Fuel | diesel / SP95-E10 模拟价格；Nearest/Cheapest/Best；另有关闭/缺货站点 |
| Toulouse | Air | 模拟免费、设备/限制字段及 Unknown 提示 |
| Toulouse | Wash | 模拟单项洗车价格、状态与未知项目 |
| Barcelona | Charge | 模拟接口/额定功率；价格与动态 availability 仍为 Unknown |
| Barcelona | Fuel / Wash | 西班牙模拟价格与资料缺失场景 |
| La Jonquera | Fuel | 扩半径及法西边境模拟站点 |
| Paris / Madrid | 任意服务 | 本套演示数据未覆盖，空结果正常，不代表真实城市没有服务 |

不需要假装自己在法国/西班牙，也不需要真的开车去站点；在 App 手动选城市即可。可测试 EN/FR/ES 切换、四类服务、排序/详情、取消重试、断网提示与本地诊断。新鲜度会随时间变化，想回到初始演示状态可重启。

本地诊断需首页主动开启，最多保留 15 分钟、不上传。DEMO 导航被禁止，所以导航统计保持无真实点击/交接是预期行为；导航功能的设备验收应另外使用已核对的真实公共目的地，不能把模拟测试当真实 Beta 样本。

## 问题排查与清理边界

- 无私有 IPv4：连接可信 Wi-Fi。多网卡可显式 `pnpm local:start --lan --host=本机私有IPv4`；不能绑定公网地址、别的设备或 0.0.0.0。
- 端口 3001/8081 被占：先停止自己之前的测试终端；不要强杀不认识的进程。若 Expo 改用其它端口，以终端实际二维码为准。
- Docker 不可用：启动 Docker 后重试；脚本不会自动重装 Docker/清库。
- 终端出现 simctl 提示：代表当前无 iOS 模拟器工具；Metro 仍可能正常运行，手机测试不靠该模拟器，但客户端安装条件仍需处理。
- 异常断电或强制杀进程：可能遗留启动终端打印的那一个临时库。保留库名后单独检查并清理，禁止删除全部 `fuel_now_*`、原库或 volume。正常停止的临时模拟数据已删除但可通过重启重新生成。
- 本地网络服务没有生产认证/TLS，只在可信网络做短期测试；不做路由器端口转发，不用 tunnel，不传真实私人信息。

## 真机验收记录（待填）

| 设备 | 系统/客户端版本 | 浏览器连通 | 安装启动 | 四服务/三语 | 权限/断网/大字 | 地图/导航 |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone 15 Pro Max | iOS 26.6.1；客户端待填 | | | | | |
| 华为 Mate 20 HMA-L29 | EMUI 12.0.0；Android/客户端待填 | | | | | |

2026-09-07 用户报告手机浏览器可访问 `http://192.168.1.63:3001/`，看到三个测试城市。设备归属待确认，因此上表逐设备单元格暂留空。此结果仅验证后端端口 3001，不代表 Expo 端口 8081、客户端安装或 App 功能已通过。

签名包、实机和现场验收由实际结果填写，不能用开发包编译或本地 HTTP 自检代替。

工程验证：全量 990 tests（新增 17）通过；真实临时库四服务/详情/新鲜模拟油价通过；通过回环地址获取的 iOS/Android Expo manifest 与开发包编译通过；Ctrl+C 停止和重启清理已实测，前两次临时库已删除，原库站点数仍为 0。提交 `17da613` 已推送，GitHub CI 通过。Mac 工具访问 LAN 地址曾超时，但后续用户已确认手机浏览器后端可达；没有更改防火墙，工具侧超时原因未定位。
