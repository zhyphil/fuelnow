const ANDROID_ALLOWED = new Set([
  "android.permission.INTERNET",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
]);
const IOS_ALLOWED = new Set(["NSLocationWhenInUseUsageDescription"]);

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing native privacy configuration");
  return value as Record<string, unknown>;
}

/** Check generated plugin configuration, not the final merged native binary. */
export function auditNativePrivacy(config: unknown): void {
  const mods = object(object(object(config)._internal).modResults);
  const manifest = object(object(object(mods.android).manifest).manifest);
  const permissions = manifest["uses-permission"];
  if (!Array.isArray(permissions)) throw new Error("Missing Android permissions");
  const active = permissions
    .map((value) => object(object(value).$))
    .filter((value) => value["tools:node"] !== "remove")
    .map((value) => value["android:name"]);
  if (
    active.length !== ANDROID_ALLOWED.size ||
    active.some((name) => typeof name !== "string" || !ANDROID_ALLOWED.has(name)) ||
    new Set(active).size !== ANDROID_ALLOWED.size
  )
    throw new Error("Unexpected Android permission set");
  const applications = manifest.application;
  if (
    !Array.isArray(applications) ||
    applications.length !== 1 ||
    object(object(applications[0]).$)["android:allowBackup"] !== "false"
  )
    throw new Error("Android application backup must be disabled");
  const plist = object(object(mods.ios).infoPlist);
  const permissionKeys = Object.keys(plist).filter((key) =>
    key.endsWith("UsageDescription"),
  );
  if (
    permissionKeys.length !== 1 ||
    permissionKeys.some((key) => !IOS_ALLOWED.has(key)) ||
    typeof plist.NSLocationWhenInUseUsageDescription !== "string" ||
    plist.NSLocationWhenInUseUsageDescription.trim() === ""
  )
    throw new Error("Unexpected iOS permission descriptions");
  const modes = plist.UIBackgroundModes;
  if (modes !== undefined && (!Array.isArray(modes) || modes.length !== 0))
    throw new Error("Background capabilities require a privacy review");
}
