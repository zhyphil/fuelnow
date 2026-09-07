# 本机 + iPhone / Android 真机测试

2026-09-07。iPhone 15 Pro Max / iOS 26.6.1；华为 Mate 20 HMA-L29 / EMUI 12.0.0，USB 读取确认 Android 10 / API 29、Expo Go 57.0.9。两台手机 LAN 浏览器连通已通过；华为四服务基础展示、Fuel 基础排序、Charge 禁用项点击、DEMO 列表/详情导航保护、空结果与列表恢复已有分项证据，详见下方记录。西班牙语可见页面及语言偏好分项已确认。超大字体首页显示与四入口/语言按钮交互已有分项结果，用户确认已恢复原字体档位；Combustible 词内断行仍待优化，完整无障碍未验收。地图持续空白未通过，但可返回原来的 2 个结果；Fuel 详情油品上下文缺口仍待修复。当前为华为 USB 回环环境，LAN 测试暂停，未停止服务。建议下一步经用户确认转入已发现问题的修复，优先处理已定位的 Fuel 详情上下文，再安排回归；地图根因及 USB 长期稳定性仍未确认。这不是正式 Beta 发布或现场验收。

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

当前华为正在使用下方的 USB 对照模式。此节为恢复 LAN 后的操作，不能在现有 USB 服务仍运行时双击 `local-test.command` 启动第二份。

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

### 华为 USB 对照模式（2026-09-07 已切换）

用户已明确授权重启测试环境、重新生成临时模拟数据，并暂停 Wi-Fi 手机访问。已正常停止原 LAN 运行，输出确认只删除其临时库；原 `fuel_now` 库站点数仍为 0。随后用现有 `pnpm local:start` 启动新的隔离库，未改 `.env`、源码、权限或防火墙。

USB 工具采用 [Google 官方 Platform-Tools](https://developer.android.com/tools/releases/platform-tools)，本次为 37.0.1，放在 Mac 临时目录中，没有安装 Android Studio 或修改全局 PATH。以下 `adb` 应替换为该工具的完整路径；临时目录被清理后需重新定位/准备工具。`-d` 限定唯一 USB Android 设备，多台时停止并显式选择目标，不能批量设置。

在已停止旧测试服务、确认手机授权且目标端口无其他用途后：

```sh
# 在项目根目录启动，保持此终端运行；不要加 --lan。
pnpm local:start

# 另一终端：先检查已有转发，不覆盖其他任务占用的映射。
adb -d reverse --list
adb -d reverse --no-rebind tcp:3001 tcp:3001
adb -d reverse --no-rebind tcp:8081 tcp:8081
```

华为 Expo Go 使用 `exp://127.0.0.1:8081`，手机浏览器后端检查使用 `http://127.0.0.1:3001/`。这里的手机回环端口由 USB 转发到 Mac，不再依赖原 LAN IP。数据线须保持连接、手机授权有效、Mac 不睡眠；断线或撤销授权后先检查并恢复这两个映射。不要使用旧的 `exp://192.168.1.63:8081` 历史项目。

本轮验证：API 仅监听 `127.0.0.1:3001`，Metro 仅监听 `[::1]:8081`。Mac 上的 `localhost` 当前解析为 IPv6，因此 `127.0.0.1:8081` 本机直连失败不代表 Metro 停止；Mac 检查用 `http://[::1]:8081/status`。当前 ADB 转发实际能够连接此 Metro，手机 Expo 的新 main 启动日志已确认其项目地址为 `127.0.0.1:8081`。开发包含 `http://127.0.0.1:3001`，不含旧 LAN API 地址；本机实际移动请求代码验证四服务/详情与 Best（1 个主站，1.659 EUR/liter）通过。近期限定 Expo JS 日志未见同一 CLI 警告，但不足以证明长时间稳定或原故障根因已解决，手机页面与操作仍由用户确认。

退出 USB 或恢复 Wi-Fi：先在启动终端 Ctrl+C，确认新临时库被正常清理。只移除本次为 Fuel Now 创建且仍匹配的两个映射，不用 `--remove-all`：

```sh
adb -d reverse --list
adb -d reverse --remove tcp:3001
adb -d reverse --remove tcp:8081
# 如需恢复 LAN，再启动：
pnpm local:start --lan
```

重启会再次重建模拟数据；切回 LAN 要用新启动终端给出的地址。测试结束可关闭 USB 调试/撤销本次授权，不必启用华为分享、文件共享或“始终允许”授权。iPhone 未通过此 Android USB 方案接入。

### 手动城市与服务

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

### 2026-09-07 独立 Android 测试包

用户同意后已补齐本机 Android SDK 并生成、安装 `Fuel Now Test`（`com.fuelnow.localtest`，0.1.0 / versionCode 1，ARM64）。既有 Expo Go、其应用数据、USB API/Metro 会话和隔离测试库保留。用户确认目前没有 Google Cloud 项目/地图密钥，本轮未创建云项目、密钥、结算账户或启用付费服务。

原生构建和 APK v2 签名验证成功；实际合并包权限已审计并移除调试模板悬浮窗和未使用的 WorkManager 权限。安装返回 Success，前台为测试包 MainActivity，截图确认法语 TEST LOCAL 首页；随后通过手动选城 Toulouse 提交 Fuel 最近搜索，结果页显示 2 个 DEMO 结果及主站卡片。没有请求真实定位、打开外部导航、上传分析或清除手机数据。限定该应用近期日志未命中此次检查的崩溃/权限异常，不扩大为全流程无错误保证。

新增 6 项测试身份/权限处理回归，全量 `pnpm check` 1018 tests、test 环境配置隐私检查通过。无密钥独立包使用已有地图禁用分支，底图/标记仍未验收；正式签名/Google 授权和真机完整回归另行处理。[构建步骤、权限边界与待办](./android-local-build.md)。只提交文字证据，不提交原生工程、APK、调试签名、用户照片或设备标识。

### 既有 Expo Go 与其他设备验收

| 设备 | 系统/客户端版本 | 浏览器连通 | 安装启动 | 四服务/三语 | 权限/断网/大字 | 地图/导航 |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone 15 Pro Max | iOS 26.6.1；客户端待填 | 通过（2026-09-07，用户确认） | | | | |
| 华为 Mate 20 HMA-L29 | EMUI 12.0.0；Android 10 / API 29；Expo Go 57.0.9（USB 读取确认） | 通过（2026-09-07，用户确认 3001 和 8081/status） | 安装/启动已通过；中途加载失败后恢复，稳定性待查 | 部分：Fuel 报价/Cheapest/Open now/Best、Charge 静态详情与禁用排序点击、Air/Wash 基础搜索展示已过；EN/FR 内容可见，ES 首页切换及燃油结果页可见内容通过；Fuel 详情缺口、语言完整边界及持久化待验 | | Wash 列表及同站详情 DEMO 导航实际点击不跳转已确认；地图持续空白未通过，返回列表通过；真实导航待测 |

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

- [x] Fuel 详情油品上下文工程修复（2026-09-07）：列表/地图详情跳转携带已显示结果的 fuelType，详情校验参数并在切换/重试时保留，API 只选择对应油品报价；不选择、未提供或无报价时保持 Unknown，其他服务不受影响。更新生成契约，新增 12 项回归，全量 `pnpm check` 1002 tests 通过；`pnpm local:check` 通过真实 HTTP/临时库验证柴油 1.659、SP95 E10 1.719、不选油品和未提供 E85 均无价格，临时库清理成功。不等同真机复验。
- [ ] 华为复验 Fuel 列表进入详情的柴油/SP95 E10 报价一致性，以及切换油品后无旧报价残留；工程修复已完成，手机验收未关闭。
- [x] 按 Toulouse / Fuel / Gazole 测试步骤确认列表模拟报价：用户新照片 1 显示 `Price: €1.659 / litre · Tax included · Recent`（2026-09-07）；详情缺口单独保留，不算一并修复。
- [x] 验证柴油 Cheapest 基础交互与有效报价优先：2026-09-07 用户照片显示 `Results: 2 · Order: Cheapest`，1.659 EUR/liter 主站排第一，Unknown/临时关闭站排第二。仅一个有效报价，不代替多报价升序/同价决胜边界验收。
- [x] 验证 Fuel `Open now` 基础过滤：2026-09-07 用户照片显示 `Results: 1 · Order: Open now`，只剩 Multi-service 主站，价格 1.659 EUR/liter、Scheduled opening Open，临时关闭站已筛除。仅验证当前模拟营业状态，不代表真实即时营业或全部营业边界通过。
- [x] 验证 Fuel `Best` 基础交互与理由显示：2026-09-07 USB 切换后的用户照片显示 `Résultats: 1 · Classement: Meilleur choix`，主站价格 1,659 EUR/litre，理由为 `Distance plus courte · 0 m`、`Données récentes`、`Temps de trajet indisponible`；与电脑端预期一致。不代替多候选分数排序、真实 ETA 或长期稳定性验收，Fuel 详情缺口仍未修复。
- [x] Barcelona / Recharge 基础列表与静态详情：2026-09-07 用户照片显示 DEMO Barcelona Charging、ES 地址、约 1.5 km 直线距离，详情含 CCS Combo 2 / Type 2、最高额定功率 150 kW（不是实际速度）、2 个充电点；价格/营业/实时可用数量均为 Inconnu，并说明西班牙未启用实时可用性。来源 Synthetic Spain Charging、风险提示与模拟导航保护可见。照片未包含排序标题，不额外标记具体排序或实时充电能力通过。
- [x] Charge 排序限制的界面说明：2026-09-07 用户照片显示 Le moins cher 下方解释 V1 无可比较价格，Ouvert maintenant 下方解释营业时间未知；请求 Le plus proche 且实际 Résultats 1 / Classement Le plus proche，驾车时间缺失时按距离排序的说明可见。确认文案/状态展示与规则一致，不把静态照片当实际点击拦截已测。
- [x] Charge 禁用项点击回归：2026-09-07 用户按指引在 Barcelona / Recharge 结果加载后，打开 Tri et filtres 并分别点击 Le moins cher / Ouvert maintenant，确认两项都无法选中、仍保持 Le plus proche。结合此前照片中的限制原因，完成当前充电模拟场景的禁用交互验收；证据为用户操作反馈，不代替其他服务或所有 capability 组合测试。
- [x] Paris / Fuel 空结果展示：2026-09-07 用户按 Paris / Carburant 步骤提交的照片显示 Carburant、Résultats: 0、Classement: Le plus proche、搜索范围已扩大提示，以及 Aucun service répertorié dans la zone / Changez de lieu ou de service 和 50 km 搜索半径。可见页面没有网络错误或残留的 Barcelona 充电站卡片。城市按本次操作步骤记录，照片本身未展示城市名；本套模拟数据不覆盖 Paris，不代表该城市真实无服务。
- [x] 空结果后的恢复：2026-09-07 用户按切回 Toulouse / Carburant / Gazole、保持最近排序的步骤操作，明确反馈“2个demo结果出来了”。确认从空结果切回有覆盖城市后列表恢复，不再停留在空结果页；证据为用户操作反馈，不额外确认这次报价、新鲜度、排序细节或网络故障根因。
- [ ] 地图第二层视图：2026-09-07 用户从当前 Toulouse 的 2 个结果打开 Voir la carte 后提供照片，仅见 Retour、地图提供方/位置隐私说明和左下 Google 标识，地图区域空白，未见底图或站点标记。记录为“未通过，原因待查”，不能把页面打开或 Google 标识可见等同地图加载成功；截图不证明空白持续多久。代码核对：ResultMap 在 enabled 且存在有效坐标范围时挂载 MapView，Android 使用 PROVIDER_GOOGLE；Expo Go 可走启用路径，不应仅因项目未配发布地图密钥便断言根因。现组件未跟踪地图就绪/加载超时，静态 mapUnavailable 分支不是运行时底图加载失败提示。仅凭当前证据不能区分加载延迟、连接、鉴权、设备服务或渲染原因；未修改代码、重装应用或调整手机设置。
- 地图等待复查（未通过）：2026-09-07 用户收到约 10 秒等待指引后，反馈“google地图还是一样空白的，什么都没显示”。确认等待后仍未显示内容，不再仅以单张照片的瞬时空白记录；精确等待时长未测量，根因仍未确定。
- 只读诊断：USB 设备仍已授权，仅检查当前 Expo Go 进程有限近期日志。可见 Google Android Maps SDK 输出 Play services 包版本 263234013、maps renderer 版本 260830204；因此不能直接断言设备完全缺少 Google 服务，也不能由版本日志推断服务工作正常。筛选输出未取得明确的地图鉴权或网络失败原因；警告包含日志丢弃及 Surface/EGL disconnect，但不足以单独证明渲染故障根因。未读取其他应用日志，设备标识与原始日志不提交仓库；未重启、安装、改密钥或改手机设置。
- [x] 地图返回列表：2026-09-07 用户对“点击 Retour 能否回到之前 2 个 DEMO 结果”明确回复“能”，确认空白地图页的返回路径可用，列表仍可继续使用。证据为用户操作反馈；只关闭返回子项，不代表底图/标记显示、地图选点或真实导航通过。
- [x] 西班牙语首页即时切换：2026-09-07 用户按 Español 切换步骤提交照片，首页显示 Tu próxima parada. Así de fácil.、¿Qué necesitas?、Combustible / Recarga / Aire / Lavado、四服务描述及 Servicio elegido: Combustible，确认可见首页内容已切为西班牙语。照片未含语言弹窗或 Idioma 控件，不额外验收这些区域，也不代替重启后偏好保存或全页面三语验收。
- [x] 首页长词排版工程修复（2026-09-07）：测量实际容器宽度并响应系统 fontScale，窄屏/大字体改为单列、宽屏保留双列，为标题/勾选标识/内边距留出空间；不关闭字体缩放、不限定文字行数、不缩小字体。回归覆盖 320/800 容器宽度及 1/1.3/2 字体比例切换、选中交互和可访问性，全量 1003 tests 通过。自动组件测试不模拟原生字形排版。
- [ ] 首页长词华为视觉复验：此前选中/未选中 Combustible 均曾词内断行，待新版确认原字体及超大字体下完整单词和滚动/点击表现；工程修复与个人字体恢复均不等同真机通过。
- [x] 西班牙语燃油结果页可见内容：2026-09-07 用户三张照片确认 Combustible: Gasóleo、Resultados: 2 / Orden: Más cercano，四个排序标签及缺少驾车时间时按距离排序的说明均为西班牙语；主站 Precio: 1,659 EUR/litro、Impuestos incluidos、Reciente、Abierto、Disponible según la fuente、Confianza: Alta 可见。第二站显示 1,4 km、Precio: Desconocido、Cerrado、No disponible、Confianza: Baja，并有西班牙语未知/低置信度风险提示。导航保护提示、来源展开及详情按钮也为西班牙语；DEMO 站名和 Synthetic test data 保留来源原文，不记为界面漏译。仅验收照片覆盖的显示，不代替其他排序实际点击、展开来源、详情或重启后的语言保存。
- [x] 西班牙语站点详情可见区域：2026-09-07 用户两张照片显示 Toulouse 主 DEMO 站详情顶部的 Volver、Cómo llegar、模拟导航禁用说明、Ficha activa、Horario publicado: Desconocido 和更新时间；Air 卡片显示 0,00 EUR/uso、会员条件/税费未知、营业时间未知、按来源可用、Gratis、Operativo según la fuente、Público、Verificado、Confianza: Baja、观察/抓取时间和 Fuente / licencia。确认这些可见字段已本地化；站名、地址和来源名称保留原文。照片未覆盖 Fuel/Wash 卡片和全部许可内容，不额外验收；Fuel 选定油品/详情报价缺口仍单独待修复。
- [x] 西班牙语偏好跨重开保留：2026-09-07 用户按关闭 Expo Go 并重新打开同一 USB 项目的步骤操作，明确反馈“重新打开还是西班牙语”。确认本次重开后西班牙语偏好保留；证据为用户反馈，未独立测量进程是否终止，不扩展为手机重启、清数据/重装、所有语言或长期稳定性验收。
- [x] 已保存语言改为 English：2026-09-07 用户对“选择 English 后立即显示 Fuel / Charge / Air / Wash，关闭并重开后仍为英语”明确回复“是的！”。确认新选择替代此前西班牙语且本次重开保留，证据为用户操作反馈；未独立测量进程终止，不扩展为全部语言、手机重启或长期稳定性验收。
- [x] 跟随系统语言选项：2026-09-07 用户点击后报告变为法语，照片确认 Utiliser la langue de l’appareil 带勾，English / Français / Español 均未勾选，标题 Langue、关闭按钮 Fermer。只读 USB 检查系统语言列表为 zh-Hans-CN,zh-Hant-CN,fr-FR，主 locale 为 zh-Hans-CN；结合代码 getLocales → deviceLanguage 按顺序寻找首个 EN/FR/ES，当前显示法语符合匹配规则，并非固定默认法语或仍手动选择 Français。没有匹配项才回退英语。未修改系统语言，未读取其他个人数据，不提交设备标识。
- [x] 跟随系统模式跨重开保留：2026-09-07 用户按关闭并重开同一项目、重新打开语言弹窗且不点选项的步骤，确认仍勾选 Utiliser la langue de l’appareil。完成本次系统模式重开保留检查，不仅依赖界面仍为法语判断。证据为用户反馈，未独立测量进程终止；手机系统语言变化后的动态跟随、系统重启等仍未验收。
- [x] 较大字体首页可见内容核对：2026-09-07 用户四张照片中，设置页明确为字体大小“超大”、字体粗细“标准”；后两张 App 照片显示放大后的西班牙语首页四服务名称/描述，以及不同滚动位置的搜索、语言、来源许可按钮和本地测试说明。四卡内部未见文字重叠或字母缺失，来源按钮长文案换行；Combustible 仍在词内断行，单独保留问题。页面边缘处的部分内容随滚动进入画面，不直接认定为控件内裁切。只完成照片覆盖的显示核对，不代表点击可用、完整首页/其他页面或整体无障碍通过。照片未明确原字号、精确 fontScale 或显示缩放值，不从拍摄大小推算。
- [x] 超大字体首页交互：2026-09-07 用户分别确认四个服务入口均能点击选中，以及滚动后 Idioma · Español 能打开语言弹窗。证据为按当前超大字体测试步骤的用户操作反馈，完成这两个交互子项；不推断搜索/结果/详情页、读屏或全部字体档位通过，不关闭 Combustible 词内断行问题。未要求启用本地测试事件。
- [x] 测试字体设置恢复：2026-09-07 用户对恢复测试前字体档位的指引明确回复“已恢复”，按用户反馈关闭字体恢复子项；未独立读取精确档位，不推断全部设备设置状态。恢复个人字体偏好不等同修复长词排版，也不代表所有页面/读屏验收通过；USB 测试服务未停止。
- [x] Toulouse / Gonflage（Air）独立搜索与详情：2026-09-07 用户六张照片中，照片 1–2 确认独立 Gonflage 列表为 1 个最近排序结果、主 DEMO 站、0 EUR/use，以及 ETA 缺失时按距离排序的说明；照片 3–4 确认详情为 Gratuit、设备按来源工作、Public。列表和详情的 Air 营业时间保持未知，未被 Fuel 的 Open 覆盖；低置信度、模拟来源与导航禁用提示可见。仅验证模拟数据展示，不代表现场免费、设备状态或导航点击拦截已验收。照片 5 是同一多服务详情的 Fuel 未选油品状态，不将其视为既有 Fuel 上下文问题已修复。
- [x] Toulouse / Lavage（Wash）基础列表卡片：2026-09-07 用户按独立入口步骤提交的新照片显示列表刷新/地图按钮和第 1 个 Toulouse 主 DEMO 站，价格 6,00 EUR/programme de lavage，会员条件/税费未知，营业时间未知，服务按来源可用；模拟导航禁用和低置信度提示可见。与此前多服务详情中的 6 EUR 洗车方案、自动滚筒/吸尘器、设备按来源工作一致。仅确认已显示的模拟卡片，不代表真实价格或设备状态。
- [x] Wash 列表顶部结果数量/排序：2026-09-07 用户随后补图明确显示 Lavage、Résultats: 1、Classement: Le plus proche，以及 ETA 缺失时按距离排序、部分数据未知和扩大搜索范围的说明。结合价格卡片，完成当前模拟数据的 Wash 基础独立搜索展示验收；不代替多候选排序或真实行程时间验收。
- [ ] 定位 `Cannot connect to Expo CLI`：用户展开照片确认 URL 为 `192.168.1.63:8081`、Error 为 `undefined`；本地 Expo 源码显示此警告来自 HMR `/hot` 的 connection-error，读取 `e.message`，undefined 本身不提供底层原因。USB 已授权，Mac 回环和 LAN 地址的 `/hot` WebSocket 握手均成功；限定 Expo 进程的近期日志出现新的项目启动记录，但未取得对应网络异常，不能宣称手机长连接已修复，也不能把该警告认定为 Fuel API/Best 故障。建议用户确认后做 USB 与 LAN 对照，尚未设置 USB 端口转发、重启服务或修改配置。
- [x] Wash 列表 DEMO 导航点击保护：2026-09-07 用户按步骤点击当前 Toulouse DEMO 站灰色 Itinéraire · Google Maps 按钮，明确回复“点击后没反应，没有跳转”。确认该列表入口实际点击未打开外部导航，符合此前可见的模拟站点导航禁用说明；证据为用户操作反馈，不扩展为其他页面或真实导航验收。
- [x] 详情页 DEMO 导航点击保护：2026-09-07 用户按指引进入同站 Voir les détails，点击详情页 Itinéraire · Google Maps，明确反馈“一样的没有反应，不跳转”。确认该模拟站详情入口未打开外部导航，符合 DEMO 保护预期；证据为用户实际操作反馈，不扩展为真实目的地导航或其他设备验收。
- [ ] 真实目的地导航另行验收：上述 DEMO 列表和详情点击保护不证明真实站点的地图应用拉起、目标坐标或路线正确。

### 2026-09-07 修复期间的 USB 开发服务绑定

#### 新版地图复验：仍未通过

用户两张照片依次显示转圈及 `Chargement de la carte…`，随后显示 `Le fond de carte n’a pas été chargé. Réessayez ou revenez aux résultats.` 和 Réessayer，地图区域仍空白，仅有 Google 标识。按当前代码，这证明 Android `onMapReady` 已触发，而 12 秒内未收到 `onMapLoaded`；不再把问题归为弹窗没有打开，也不把新增超时处理当底图修复成功。

本次只读诊断和边界：

- 限定当前 Expo 进程近期日志，Google SDK/renderer 初始化可见；`PhFlagUpdateRegistry` 的 `GoogleCertificatesRslt: not allowed` 属于 flag-update 警告，未取得明确的 Maps `Authorization failure`、API token 失败或 HTTPS/DNS 异常，不能据此直接断言 API 密钥错误。
- 手机对地图日志中的 `clients4.google.com` 解析及单次 ICMP 连通成功；只证明这次基础网络可达，不证明 HTTPS、地图数据请求或应用级鉴权成功。未读取其他应用日志，原始日志、设备标识和用户照片不入库。
- [Expo SDK 52 官方变更记录](https://expo.dev/changelog/2024-11-12-sdk-52#deprecations)明确宣布 SDK 53 起 Android Expo Go 不再支持 Google Maps，建议 development build；但[当前组件文档](https://docs.expo.dev/versions/latest/sdk/map-view/)仍标注 Expo Go 无须额外设置。两处资料有冲突，不能仅凭其中一句宣称本机根因已确定；[相同地图库版本的公开问题](https://github.com/react-native-maps/react-native-maps/issues/5888)是辅助线索，不将 issue 作者评论当 Expo 维护者结论。
- 下一项建议：[独立开发测试包](https://docs.expo.dev/develop/development-builds/introduction/)配置自有受限 Android 地图密钥，绕开 Expo Go 容器进行对照。当前常用 Android SDK/Studio 路径不存在，当前 shell 和检查到的项目环境文件未发现地图密钥配置；不代表其他账户或位置一定没有密钥。需要用户确认工具链安装/测试包安装范围，Google 项目、密钥及可能的计费操作单独确认，不能在聊天中索取明文密钥。
- 本轮未再修改应用代码、安装工具链/应用、启用 Google 计费或更改手机网络。底图/标记验收继续保持未完成。

地图工程修复与待复验：

- [x] Android 地图弹窗开启硬件加速，等 onShow 与非零布局后挂载 MapView，使用 absoluteFill 填满地图容器。此为渲染兼容处理，不将 Surface/EGL 警告直接定为根因。
- [x] 跟踪初始化/加载状态；12 秒未成功时区分“地图未启动”和“底图未加载”，提供三语提示、重试和既有返回；重试更换独立实例，旧加载回调不影响新状态，成功或退出取消计时器。Apple Maps 使用 ready 回调，不依赖不支持的 Google loaded 事件。
- [x] 新增 8 项原生适配边界组件回归，覆盖尺寸/弹窗时机、Android 仅 ready 不能代表底图已加载、三语超时/重试/迟到成功、Apple Maps、退出清理及无结果/未配置。全量 `pnpm check` 1012 tests、iOS/Android export 通过。
- [ ] 华为底图和标记复验尚未完成，不能将自动测试或 Google 标识可见当作通过。若新版仍无底图，记录具体超时文案与地图相关错误，继续定位；未改密钥、Google 账户或手机系统设置。
- 原生语义参考：[React Native Modal](https://reactnative.dev/docs/modal#hardwareaccelerated)（独立弹窗硬件加速默认关闭）、[react-native-maps MapView](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md)（ready 与 loaded 分离）；同时核对本机安装版本源码。

USB 连接：

- [x] 复现并修复本次重开的 IPv4/IPv6 不一致：Metro 仅监听 `[::1]:8081`，`127.0.0.1:8081/status` 拒绝连接。当前 USB 入口使用 IPv4；Expo CLI 本地代码以 localhost 绑定。为隔离的 Expo 子进程固定 `NODE_OPTIONS=--dns-result-order=ipv4first`，不继承任意宿主 NODE_OPTIONS、不开放公网监听。
- [x] 新增环境隔离回归；重启后实测 `127.0.0.1:8081` 监听和健康请求成功，手机关闭重开后 Metro 收到 Android bundle 请求且编译完成。仅对本次 USB 启动问题下结论，不将之前 LAN `/hot` 警告全部归入同一原因。
- 原测试会话临时库随正常停止清理成功，新会话使用独立模拟库；不覆盖原库、不清手机应用数据、不修改系统设置。长期 USB 稳定性与手机页面操作仍需复验。

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
