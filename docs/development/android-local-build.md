# Android 本地独立测试包

范围：仅用于已授权 USB 真机测试，不是公开 Beta 或商店发布包。不使用 EAS 云构建，不开启真实采集、付费路线或远程分析。

## 身份和数据边界

- `EXPO_PUBLIC_APP_ENV=test` 时，名称为 `Fuel Now Test`，Android application ID 为 `com.fuelnow.localtest`，链接 scheme 为 `fuelnow-test`。
- 非 test 环境保留原有应用名称和 scheme，不自动决定正式发布 application ID。
- 测试包与 Expo Go 并存，拥有独立应用数据；Expo Go 中保存的语言偏好不会自动迁移过来。不卸载 Expo Go，不清除其数据。
- 本地 debug 包需要运行中的 Metro 和测试 API，通过既有 USB 转发使用回环地址。它不是脱离电脑可用的正式离线安装包。
- 原生工程 `apps/mobile/android/` 已被 Git 忽略。APK、签名私钥、环境文件和地图密钥均不提交仓库。

## 本机构建环境（2026-09-07）

使用 Google [官方命令行工具](https://developer.android.com/studio/index.html)，不安装 Android Studio 或模拟器。Mac ARM command-line tools build `15859902`（CLI 22.0），下载 SHA-256 为 `835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e`，已与官方值核对。

SDK 安装目录：`/Users/haoyuzuo/Library/Android/sdk`。项目要求的已安装组件：

- `platforms;android-36` revision 2
- `build-tools;36.0.0`
- `ndk;27.1.12297006`
- `cmake;3.30.5`
- `platform-tools` 37.0.1

首次 Gradle 构建还按依赖要求自动补装 Build-Tools 35.0.0 和 CMake 3.22.1；这些也是本地免费构建组件。

沿用本机已有 JDK 21，仅对构建命令设置路径，不改全局 Java 或 shell 配置。项目 Node 24 / pnpm 版本不变。

## 构建步骤

先按 [手机测试说明](./local-phone-testing.md)运行本地模拟 API / Metro，保留 USB 的 3001 和 8081 转发。以下命令在 `apps/mobile` 中运行：

```sh
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
export ANDROID_HOME=/Users/haoyuzuo/Library/Android/sdk
export EXPO_PUBLIC_APP_ENV=test
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
export NODE_ENV=development
pnpm exec expo prebuild --platform android --no-install
```

Expo prebuild 会自动将 package.json 的 ios/android 脚本改成原生构建命令；检查差异，保留仓库原来的 Expo Go 启动脚本，不提交这类自动变化。不要使用 `--clean` 删除未确认的原生修改。

在生成的 `apps/mobile/android` 目录中运行（沿用上述环境）：

```sh
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain --max-workers=4
```

目标产物为 `app/build/outputs/apk/debug/app-debug.apk`，仅构建本次华为设备的 ARM64 架构。安装前核对最终合并权限、应用身份及签名；不得用开发默认签名作为正式发布签名。

## Google 地图待办

用户已确认目前没有 Google Cloud 项目和地图密钥。当前构建不提供密钥，Android 独立包按既有逻辑禁用地图，不能将此包能安装/启动记作底图修复成功。

后续先获得用户对结算账户步骤的单独确认，再配置 Maps SDK for Android。测试密钥应只允许该 SDK，并限制为测试 application ID + 专用本地测试签名证书 SHA-1；不要使用 Expo/RN 模板内通用 debug 签名作为地图密钥限制的信任依据。配置密钥前需准备独立本地测试签名，并核对重新签名后实际 APK 的证书；不索取聊天明文密钥，不输出包含密钥的完整 Expo config。

`GOOGLE_MAPS_ANDROID_API_KEY` 仅供原生地图插件注入；`extra` 只保存是否已配置的布尔值。Android 客户端密钥会随 APK 分发，不能依靠隐藏值代替应用/API 限制。密钥与签名变更需要重新生成/构建原生包，不能仅刷新 JS。

改为专用测试签名后，已有同包名的默认签名包不能直接覆盖安装。需要先说明测试包数据重置影响并获得用户确认，或使用另一个明确的测试 application ID；不要自动卸载现有测试包。

Google Maps SDK 的[使用和结算要求](https://developers.google.com/maps/documentation/android-sdk/usage-and-billing)与[价格表](https://developers.google.com/maps/billing-and-pricing/pricing)应在配置时再次核对；基础原生 Maps SDK 与路线、Places、Street View 等不同服务不可混为一项。本轮没有创建云项目、密钥或结算账户，也没有付费 API 调用。

## 验证状态

- [x] 本地工具安装和版本核对。
- [x] 测试身份与调试权限处理 6 项回归，全量 `pnpm check` 1018 tests、test 环境原生配置隐私检查通过。
- [x] ARM64 APK 编译及最终权限核对：Gradle `assembleDebug` 成功，APK v2 签名有效，application ID / 显示名 / ARM64 / min SDK 24 / target SDK 36 已通过 APK 工具核对。
- [x] USB 安装与启动：设备返回安装成功，前台 Activity 为独立测试应用，截图确认法语 TEST LOCAL 首页，不是 Expo Go 容器。
- [x] 本机测试 API 搜索冒烟：独立包选择 Carburant → 手动 Toulouse → 搜索；截图显示最近排序 2 个结果和主 DEMO 卡片。未选择真实定位，未测试真实导航或地图底图。
- [ ] 自有受限密钥配置后的华为地图底图/标记和点击验收。

安装与地图验收按实际结果更新，不用 JS export 或单元测试替代原生构建和真机结果。

### 最终包权限边界

首次 APK 检查发现调试模板的悬浮窗声明优先于主 manifest 的删除标记；依赖 WorkManager 还带入 Wake Lock、开机通知与前台服务。新增仅 test 环境运行的 prebuild 处理，删除 debug/debugOptimized 模板的悬浮窗声明，并在主配置禁止未使用的三个 WorkManager 权限。重新构建后，APK 只保留 INTERNET、ACCESS_NETWORK_STATE、COARSE/FINE 前台定位，以及应用自身 signature 级动态接收器保护权限；backup=false，无悬浮窗、存储、后台定位、开机通知或前台服务权限。

ACCESS_NETWORK_STATE 来自地图 SDK，用于连接状态判断，不是新增定位权限；应用自身 signature 权限不授予访问其他应用数据的能力。配置 introspect 不包含所有依赖合并结果，因此仍必须检查最终 APK。debug 包启用调试和 HTTP，只用于 USB 回环测试，不满足正式发布安全门槛。本轮未授予定位权限、未启动后台任务或修改手机系统设置。
