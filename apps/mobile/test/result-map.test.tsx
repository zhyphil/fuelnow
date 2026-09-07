import { act, createElement, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { ResultMap } from "../src/components/ResultMap";
import { getMessages } from "../src/i18n/catalog";
import type { NearbyPoint } from "../src/search/presentation";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";

const native = vi.hoisted(() => ({
  platform: "android",
  expoGo: true,
  language: "en" as "en" | "fr" | "es",
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Modal: "Modal",
  ActivityIndicator: "ActivityIndicator",
  Platform: {
    get OS() {
      return native.platform;
    },
  },
  StyleSheet: {
    create: (value: unknown) => value,
    absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  },
  Pressable: ({
    children,
    style,
    ...props
  }: {
    children: ReactNode;
    style: (value: { pressed: boolean }) => unknown;
  }) =>
    createElement(
      "Pressable",
      { ...props, style: style({ pressed: false }) },
      children,
    ),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));
vi.mock("expo-constants", () => ({
  default: {
    get executionEnvironment() {
      return native.expoGo ? "storeClient" : "standalone";
    },
    expoConfig: { extra: { androidMapsConfigured: false } },
  },
}));
vi.mock("../src/i18n/context", () => ({
  useLanguage: () => ({ copy: getMessages(native.language) }),
}));
let root: ReturnType<typeof createRoot> | undefined;
const close = vi.fn(),
  select = vi.fn();
async function render(points = sample.results as NearbyPoint[]) {
  vi.useFakeTimers();
  root = createRoot({ textComponentTypes: ["Text"] });
  await act(() =>
    root!.render(<ResultMap points={points} onClose={close} onSelect={select} />),
  );
}
const nodes = (type: string) => root!.container.queryAll((node) => node.type === type);
const text = () => JSON.stringify(root!.container.toJSON());
async function show(width = 320, height = 480) {
  await act(() => {
    nodes("Modal")[0]!.props.onShow();
    root!.container
      .queryAll((node) => !!node.props.onLayout)[0]!
      .props.onLayout({ nativeEvent: { layout: { width, height } } });
  });
}
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.clearAllMocks();
  native.platform = "android";
  native.expoGo = true;
  native.language = "en";
});

it("waits for a shown, measured modal and enables accelerated Android rendering", async () => {
  await render();
  expect(nodes("Modal")[0]!.props.hardwareAccelerated).toBe(true);
  expect(nodes("MapView")).toHaveLength(0);
  await show(0, 480);
  expect(nodes("MapView")).toHaveLength(0);
  await show();
  const map = nodes("MapView")[0]!;
  expect(map.props.provider).toBe("google");
  expect(map.props.showsUserLocation).toBe(false);
  expect(map.props.showsMyLocationButton).toBe(false);
  expect(map.props.toolbarEnabled).toBe(false);
  expect(map.props.style).toMatchObject({ position: "absolute", top: 0, bottom: 0 });
  expect(nodes("Marker")).toHaveLength(sample.results.length);
  await act(() => nodes("Marker")[0]!.props.onPress());
  const details = nodes("Pressable").find(
    (node) => node.props.accessibilityLabel === getMessages("en").evidence.details,
  )!;
  await act(() => details.props.onPress());
  expect(select).toHaveBeenCalledWith(sample.results[0]!.id);
  await act(() => nodes("Modal")[0]!.props.onRequestClose());
  expect(close).toHaveBeenCalledOnce();
});

it.each(["en", "fr", "es"] as const)(
  "shows recoverable initialization and tile timeouts in %s",
  async (language) => {
    native.language = language;
    const copy = getMessages(language);
    await render();
    await show();
    const oldMap = nodes("MapView")[0]!;
    await advance(12_000);
    expect(text()).toContain(copy.evidence.mapStartFailed);
    const retry = nodes("Pressable").find(
      (node) => node.props.accessibilityLabel === copy.results.retry,
    )!;
    await act(() => retry.props.onPress());
    expect(text()).toContain(copy.evidence.mapLoading);
    expect(text()).not.toContain(copy.evidence.mapStartFailed);
    await act(() => oldMap.props.onMapLoaded());
    expect(text()).toContain(copy.evidence.mapLoading);
    const newMap = nodes("MapView")[0]!;
    await act(() => newMap.props.onMapReady());
    expect(text()).toContain(copy.evidence.mapLoading);
    await advance(12_000);
    expect(text()).toContain(copy.evidence.mapTilesFailed);
    await act(() => newMap.props.onMapLoaded());
    expect(text()).not.toContain(copy.evidence.mapTilesFailed);
    expect(text()).not.toContain(copy.evidence.mapLoading);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("accepts Apple Maps ready without waiting for an unsupported Google tile event", async () => {
  native.platform = "ios";
  await render();
  await show();
  expect(nodes("MapView")[0]!.props.provider).toBeUndefined();
  await act(() => nodes("MapView")[0]!.props.onMapReady());
  await advance(20_000);
  expect(text()).not.toContain(getMessages("en").evidence.mapLoading);
  expect(text()).not.toContain(getMessages("en").evidence.mapTilesFailed);
});

it("cancels pending timeouts when closing during loading", async () => {
  await render();
  await show();
  expect(vi.getTimerCount()).toBe(1);
  await act(() => root!.unmount());
  root = undefined;
  expect(vi.getTimerCount()).toBe(0);
  await advance(20_000);
});

it.each(["empty", "unconfigured"])(
  "does not mount or time a map for %s results",
  async (scenario) => {
    native.expoGo = false;
    await render(scenario === "empty" ? [] : (sample.results as NearbyPoint[]));
    await show();
    expect(nodes("MapView")).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(text()).toContain(
      getMessages("en").evidence[
        scenario === "empty" ? "mapNoPoints" : "mapUnavailable"
      ],
    );
  },
);
