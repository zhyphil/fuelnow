import { validCoordinates } from "./map";
export type NavigationTarget = {
  id: string;
  location: { latitude: number; longitude: number };
  lifecycleStatus: string;
  synthetic?: boolean;
};
export type NavigationProvider = "apple" | "google";
export function navigationAllowed(target: NavigationTarget) {
  return (
    target.synthetic !== true &&
    validCoordinates(target.location) &&
    !["permanently_closed", "temporarily_closed"].includes(target.lifecycleStatus)
  );
}
export function navigationUrl(target: NavigationTarget, provider: NavigationProvider) {
  if (!navigationAllowed(target)) return null;
  const destination = `${target.location.latitude},${target.location.longitude}`;
  // Only the public destination is sent; the navigation app chooses the origin.
  return provider === "apple"
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
export async function openNavigation(
  target: NavigationTarget,
  provider: NavigationProvider,
  open: (url: string) => Promise<unknown>,
): Promise<boolean> {
  const url = navigationUrl(target, provider);
  if (!url) return false;
  try {
    await open(url);
    return true;
  } catch {
    return false;
  }
}
