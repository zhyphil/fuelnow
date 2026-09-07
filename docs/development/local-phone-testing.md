# 本机 + iPhone / Android 真机测试

2026-09-07。用户确认：iPhone 15 Pro Max / iOS 26.6.1；华为 Mate 20 HMA-L29 / EMUI 12.0.0，系统页面只显示该 EMUI 版本，不推断为 Android 12，也不要求用户继续查找。底层 Android/API 级别暂留空，若安装报兼容错误再诊断。用户已确认两台手机均可在浏览器打开后端连接检查页并看到 Toulouse / Barcelona / La Jonquera。客户端安装和 App 内连接仍待确认；这不是正式 Beta 发布或现场验收。

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

已记录型号和 EMUI 12.0.0；系统页面未显示底层 Android 版本，不再以查找版本号阻塞安装尝试。使用 [Expo 官方 SDK 57 Android 入口](https://expo.dev/go?device=true&platform=android&sdkVersion=57) 找匹配客户端（本次核对页面指向 Google Play）；没有 Google Play 时需采用官方可用的兼容 APK/本地调试安装路径，不从不明网站下载。安装未知来源如确有必要，仅临时授权选定安装来源，装完关闭。若出现无法安装或版本不匹配，记录原始错误后再核对客户端与设备兼容性。

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
| iPhone 15 Pro Max | iOS 26.6.1；客户端待填 | 通过（2026-09-07，用户确认） | | | | |
| 华为 Mate 20 HMA-L29 | EMUI 12.0.0；Android 10 / API 29；Expo Go 57.0.9（USB 读取确认） | 通过（2026-09-07，用户确认 3001 和 8081/status） | 安装/启动已通过；中途加载失败后恢复，稳定性待查 | 部分：Fuel 列表 1.659 EUR/liter 已见；EN/FR 内容及 Air/Fuel/Wash 详情可见；Fuel 详情缺口、排序、ES/Charge 等仍待验收 | | DEMO 禁用样式/提示已见；实际点击及真实地图导航待测 |

2026-09-07 用户报告两台手机浏览器均可访问 `http://192.168.1.63:3001/`，看到三个测试城市，上表仅将两台的浏览器连通标为通过。此结果仅验证后端端口 3001，不代表 Expo 端口 8081、客户端安装或 App 功能已通过。

2026-09-07 后续 App 检查：用户按华为 Expo Go 安装与 `exp://192.168.1.63:8081` 打开指引操作，确认看到了带 DEMO 的测试站点；按当前测试步骤记录为 Toulouse / Fuel 基础列表流程通过。只确认开发客户端加载与模拟数据列表，不推断详情、排序、其余服务、语言、权限、断网、地图导航或 iPhone App 已通过。下一步先验证一个 Fuel 站点的详情与模拟导航保护。

签名包、实机和现场验收由实际结果填写，不能用开发包编译或本地 HTTP 自检代替。

### 2026-09-07 华为详情照片核对

证据为用户提供的照片 1–4，仅记录可见内容，不将含用户现实环境的原照片上传公开仓库。

- 照片 2：DEMO Toulouse Multi-service 标题、地址、法语导航禁用提示、灰色导航按钮及 Gonflage 服务卡可见。
- 照片 1、3、4：长详情不同滚动位置、展开详情、FR Unknown/低置信度提示、来源/许可和 UTC 时间可见；Gonflage 为模拟免费/设备工作状态，Carburant 为未知价格/所选油品。
- 截图确认详情渲染和保护提示，不证明点击导航确实被拦截、所有内容无截断、三语切换或四服务端到端均通过。
- 代码核对：列表跳转仅传 `id`；手机 `servicePoint(id)` 及详情 API 无油品查询上下文；`presentServiceEvidence` 缺少 `requestedFuelType` 时不会选择报价。因此详情 Unknown 是当前实现的确定限制，不应归因于华为安装或网络，也不能断言用户没有选择油品。

待处理：

- [ ] 让 Fuel 详情接收并校验列表选定油品，API 按该油品返回真实对应报价；保留未选择/无报价时 Unknown，不任取其他油品或伪造价格。补契约、列表/地图跳转与详情回归，再在华为验收。
- [x] 按 Toulouse / Fuel / Gazole 测试步骤确认列表模拟报价：用户新照片 1 显示 `Price: €1.659 / litre · Tax included · Recent`（2026-09-07）；详情缺口单独保留，不算一并修复。
- [x] 验证柴油 Cheapest 基础交互与有效报价优先：2026-09-07 用户照片显示 `Results: 2 · Order: Cheapest`，1.659 EUR/liter 主站排第一，Unknown/临时关闭站排第二。仅一个有效报价，不代替多报价升序/同价决胜边界验收。
- [x] 验证 Fuel `Open now` 基础过滤：2026-09-07 用户照片显示 `Results: 1 · Order: Open now`，只剩 Multi-service 主站，价格 1.659 EUR/liter、Scheduled opening Open，临时关闭站已筛除。仅验证当前模拟营业状态，不代表真实即时营业或全部营业边界通过。
- [ ] 验证 Fuel `Best`：Diesel 保持选中，检查实际排序 Best、主站推荐理由和 ETA 不可用说明。Mac 使用实际移动请求代码查询同一模拟城市/柴油，返回 appliedSort best、capability enabled、1 个主站，理由为距离较近、数据较新、ETA 不可用；手机仍待验收。Fuel 详情缺口和间歇加载失败仍未关闭。
- [ ] 定位 `Cannot connect to Expo CLI`：用户展开照片确认 URL 为 `192.168.1.63:8081`、Error 为 `undefined`；本地 Expo 源码显示此警告来自 HMR `/hot` 的 connection-error，读取 `e.message`，undefined 本身不提供底层原因。USB 已授权，Mac 回环和 LAN 地址的 `/hot` WebSocket 握手均成功；限定 Expo 进程的近期日志出现新的项目启动记录，但未取得对应网络异常，不能宣称手机长连接已修复，也不能把该警告认定为 Fuel API/Best 故障。建议用户确认后做 USB 与 LAN 对照，尚未设置 USB 端口转发、重启服务或修改配置。
- [ ] 实际点击 DEMO 导航不应跳出；真实目的地导航另行验收。

### 2026-09-07 间歇加载失败与恢复

- 用户先遇到 Fuel 列表网络错误，再遇到 Expo 蓝色加载失败页；之后确认浏览器的 3001 根页面与 8081/status 均可达，照片显示 Expo Go 的 Wi-Fi/移动数据权限已开启。
- Mac 侧同一局域网地址的 API、Expo manifest 和 Android 开发包均返回 200；实际移动客户端请求代码验证柴油 nearest/cheapest 成功，主模拟站报价 1.659 EUR/liter。此为电脑侧证据，华为柴油报价及排序仍未验收。
- 用户开启 USB 调试并授权后报告项目恢复打开；未改 App 代码、清除数据、重装、重启服务、关闭防火墙或设置 USB 端口转发。因此不能把恢复归因于已修复问题或 USB 传输替代了 Wi-Fi。
- 使用临时目录中的 Google 官方 Platform-Tools 37.0.1，读取到 Android 10 / API 29 和 Expo Go 57.0.9（versionCode 445）。此前“底层版本未显示/待填”的记录由本次结果补全。
- 仅读取当时 Expo Go 进程的有限近期日志；可见 MalformedURLException、任务描述颜色、HeadlessAppLoader 构造方法等内部异常，但缺少与先前失败时刻对应的完整证据，不能指定其中任一条为根因，也不能断言 SDK 不兼容。未读取其他应用日志或用户文件，设备标识、原始日志及照片不提交仓库。
- [ ] 再次失败时捕获当次 Expo 进程的相关错误并关联操作，确认原因及修复后回归；目前记录为“已恢复，原因未确定”，不关闭问题。
- 下一步保持当前项目运行，返回 Toulouse / Fuel，选择 Gazole 检查列表模拟价格，再验证 cheapest。测试结束后可关闭 USB 调试。

### 2026-09-07 恢复后的列表报价照片核对

- 新照片 1：同一 Toulouse Multi-service 列表卡明确显示 1.659 EUR/liter、含税、Recent、高置信度、模拟来源与导航禁用提示，确认手机当前能够获取并显示模拟报价。
- 新照片 2–4：英文详情分别显示 Air 0.00 EUR/use、Fuel 价格/所选油品 Unknown、Wash 6.00 EUR/wash programme。Air/Wash 的这些价格为模拟数据，不代表真实站点报价；服务卡显示不代替各服务搜索流程验收。
- 列表有价而 Fuel 详情 Unknown 的已知缺口在真机复现，仍待修复；英文页面可见与此前法语页面可见分别记证据，不据此推断完整三语切换/持久化已通过。
- 下一步测试列表 Cheapest 排序；加载稳定性和 Fuel 详情修复均保持未完成。只提交文字结果，不提交用户照片。

### 2026-09-07 Cheapest 真机照片核对

- 用户最新照片 1 明确显示请求控件 `Cheapest`、响应 `Results: 2 · Order: Cheapest`，以及第一名主 DEMO 站的 1.659 EUR/liter 报价。
- 照片 2 显示第二名 Temporarily Closed 站为 Price Unknown / Scheduled opening Closed / Service status Unavailable，并有低置信度与未知风险提示；Unknown 没有被当作零价排到有效报价之前。
- `Cheapest` 不等于仅显示营业站；关闭站作为无有效可比报价的候选保留在后方，与现有规则一致。只有一个有效价格，不能宣称已真机验证多个不同价格的升序比较。
- 基础排序交互勾选完成。下一步选择 `Open now` 验证关闭站被筛除；预计只剩主站，具体以手机实际结果记录。Fuel 详情缺口、加载稳定性及其他阶段门槛保持未完成。原照片不上传仓库。

工程验证：全量 990 tests（新增 17）通过；真实临时库四服务/详情/新鲜模拟油价通过；通过回环地址获取的 iOS/Android Expo manifest 与开发包编译通过；Ctrl+C 停止和重启清理已实测，前两次临时库已删除，原库站点数仍为 0。提交 `17da613` 已推送，GitHub CI 通过。Mac 工具访问 LAN 地址曾超时，但后续用户已确认手机浏览器后端可达；没有更改防火墙，工具侧超时原因未定位。
