import { afterEach, expect, it, vi } from "vitest";
import { act, createElement, useEffect, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { getMessages } from "../src/i18n/catalog";
import { SearchProvider } from "../src/search/context";
import WelcomeScreen from "../src/app/index";
import SourcesScreen from "../src/app/sources";
import { sourceNotices, sourcePageCopy } from "../src/content/sourceNotices";
import { EvidenceSummary } from "../src/components/EvidenceSummary";
import { NavigationButtons } from "../src/components/NavigationButtons";
import ResultsScreen from "../src/app/results";
import PointScreen from "../src/app/point/[id]";
import {
  ApiFailure,
  type NearbyResponse,
  type ServicePointResponse,
} from "../src/api/client";
import type { NearbyPoint } from "../src/search/presentation";
import { analytics } from "../src/analytics/recorder";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import detail from "../../../docs/api/examples/service-point-detail.json";

const ports = vi.hoisted(() => ({
  os: "ios",
  language: "en" as "en" | "fr" | "es",
  nearby: vi.fn(),
  servicePoint: vi.fn(),
  openURL: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  id: "",
  fuelType: undefined as string | string[] | undefined,
  origin: { latitude: 48.8566, longitude: 2.3522, source: "manual", label: "Paris" },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("../src/api/runtime", () => ({
  api: { nearby: ports.nearby, servicePoint: ports.servicePoint },
}));
vi.mock("../src/i18n/context", () => ({
  useLanguage: () => ({
    language: ports.language,
    copy: getMessages(ports.language),
    preference: ports.language,
    storageFailed: false,
    selectLanguage: vi.fn(),
  }),
}));
vi.mock("../src/location/context", () => ({
  useLocation: () => ({
    state: { status: "ready", origin: ports.origin },
    request: vi.fn(),
    clear: vi.fn(),
    selectManual: vi.fn(),
  }),
}));
vi.mock("expo-router", () => ({
  useRouter: () => ports,
  useLocalSearchParams: () => ({ id: ports.id, fuelType: ports.fuelType }),
  useFocusEffect: (effect: () => (() => void) | void) => useEffect(effect, [effect]),
}));
vi.mock("react-native", () => ({
  useWindowDimensions: () => ({ width: 360, height: 800, fontScale: 1 }),
  Text: "Text",
  View: "View",
  ScrollView: "ScrollView",
  Modal: "Modal",
  ActivityIndicator: "ActivityIndicator",
  TextInput: "TextInput",
  Platform: {
    get OS() {
      return ports.os;
    },
  },
  // Native Linking.openURL uses this._validateURL; a bare vi.fn hides lost receivers.
  Linking: {
    _validateURL(url: string) {
      if (typeof url !== "string") throw new Error("Invalid URL");
    },
    openURL(url: string) {
      this._validateURL(url);
      return ports.openURL(url);
    },
  },
  StyleSheet: { create: (styles: unknown) => styles },
  Pressable: ({
    children,
    style,
    disabled,
    onPress,
    ...props
  }: {
    children: ReactNode;
    style: (state: { pressed: boolean }) => unknown;
    disabled: boolean;
    onPress: () => void;
  }) =>
    createElement(
      "Pressable",
      {
        ...props,
        disabled,
        onPress: disabled ? undefined : onPress,
        style: style({ pressed: false }),
      },
      children,
    ),
  FlatList: ({
    data,
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ...props
  }: {
    data: NearbyPoint[];
    renderItem: (entry: { item: NearbyPoint; index: number }) => ReactNode;
    ListHeaderComponent: ReactNode;
    ListEmptyComponent: ReactNode;
  }) =>
    createElement(
      "FlatList",
      props,
      ListHeaderComponent,
      data.length
        ? data.map((item, index) =>
            createElement("View", { key: item.id }, renderItem({ item, index })),
          )
        : ListEmptyComponent,
    ),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));
vi.mock("expo-constants", () => ({ default: { executionEnvironment: "storeClient" } }));

const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  analytics.setEnabled(false);
  vi.clearAllMocks();
  ports.fuelType = undefined;
  ports.os = "ios";
});
it.each(["android", "ios"])(
  "preserves the native Linking receiver and can retry a failed %s handoff",
  async (os) => {
    ports.os = os;
    ports.language = "en";
    const root = createRoot({ textComponentTypes: ["Text"] });
    roots.push(root);
    await act(async () =>
      root.render(
        <NavigationButtons
          target={{
            id: "real-point",
            location: { latitude: 43.6047, longitude: 1.4442 },
            lifecycleStatus: "active",
          }}
        />,
      ),
    );
    const button = () =>
      root.container.queryAll((node) => node.type === "Pressable")[0]!;
    ports.openURL.mockRejectedValueOnce(new Error("handoff failed"));
    await act(async () => button().props.onPress());
    expect(ports.openURL).toHaveBeenCalledOnce();
    expect(JSON.stringify(root.container.toJSON())).toContain(
      getMessages("en").evidence.navigationFailed,
    );
    ports.openURL.mockResolvedValue(undefined);
    await act(async () => button().props.onPress());
    expect(ports.openURL).toHaveBeenCalledTimes(2);
    expect(ports.openURL).toHaveBeenLastCalledWith(
      expect.stringContaining(
        os === "android"
          ? "https://www.google.com/maps/dir/?api=1"
          : "https://maps.apple.com/",
      ),
    );
    expect(JSON.stringify(root.container.toJSON())).not.toContain(
      getMessages("en").evidence.navigationFailed,
    );
    expect(button().props.disabled).toBe(false);
  },
);
const cases = (["en", "fr", "es"] as const).flatMap((language) =>
  (["fuel", "charging", "air", "wash"] as const).map((service) => ({
    language,
    service,
  })),
);
it.each(["en", "fr", "es"] as const)(
  "exposes sources and licences in %s",
  async (language) => {
    ports.language = language;
    const copy = sourcePageCopy[language];
    const root = createRoot({ textComponentTypes: ["Text"] });
    roots.push(root);
    const button = (label: string) =>
      root.container.queryAll(
        (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
      )[0]!;
    await act(async () =>
      root.render(
        <SearchProvider>
          <WelcomeScreen />
        </SearchProvider>,
      ),
    );
    await act(async () => button(copy.title).props.onPress());
    expect(ports.push).toHaveBeenLastCalledWith("/sources");
    await act(async () => root.render(<SourcesScreen />));
    for (const source of sourceNotices)
      expect(button(`${copy.source}: ${source.name}`)).toBeDefined();
    ports.openURL.mockRejectedValueOnce(new Error("cannot open"));
    await act(async () =>
      button(`${copy.source}: ${sourceNotices[0].name}`).props.onPress(),
    );
    expect(
      root.container.queryAll(
        (node) => node.type === "Text" && node.props.accessibilityRole === "alert",
      ),
    ).toHaveLength(1);
    ports.openURL.mockResolvedValue(undefined);
    await act(async () =>
      button(`${copy.source}: ${sourceNotices[0].name}`).props.onPress(),
    );
    expect(
      root.container.queryAll(
        (node) => node.type === "Text" && node.props.accessibilityRole === "alert",
      ),
    ).toHaveLength(0);
    await act(async () => button(copy.back).props.onPress());
    expect(ports.back).toHaveBeenCalledOnce();
  },
);
it("keeps source attribution visible before expanding compact evidence", async () => {
  ports.language = "en";
  const evidence = structuredClone(
    sample.results[0]!.evidence,
  ) as NearbyResponse["results"][number]["evidence"];
  evidence.source!.attributionText = "© OpenStreetMap contributors";
  const root = createRoot({ textComponentTypes: ["Text"] });
  roots.push(root);
  await act(async () => root.render(<EvidenceSummary evidence={evidence} compact />));
  expect(
    root.container.queryAll(
      (node) =>
        node.type === "Text" && node.props.children === "© OpenStreetMap contributors",
    ),
  ).toHaveLength(1);
});
it.each(cases)(
  "connects $service home → list → detail → navigation in $language",
  async ({ language, service }) => {
    ports.language = language;
    const copy = getMessages(language);
    const response = structuredClone(sample) as NearbyResponse;
    response.service = service;
    response.ranking.requestedSort = "nearest";
    response.ranking.appliedSort = "nearest";
    const first = response.results[0]!;
    ports.id = first.id;
    // Synthetic transport fixtures are test-only; domain field edge cases have separate tests.
    if (service !== "fuel") {
      first.evidence.price = null;
      first.evidence.details.fuel = null;
    }
    const point = structuredClone(detail) as ServicePointResponse;
    point.servicePoint.id = first.id;
    point.servicePoint.name = first.name;
    point.servicePoint.location = first.location;
    point.servicePoint.country = first.country;
    point.servicePoint.serviceTypes = [service];
    point.servicePoint.services = [{ serviceType: service, evidence: first.evidence }];
    ports.nearby.mockResolvedValue(response);
    ports.servicePoint.mockResolvedValue(point);
    ports.openURL.mockResolvedValue(undefined);
    const root = createRoot({ textComponentTypes: ["Text"] });
    roots.push(root);
    const render = async (screen: ReactNode) => {
      await act(async () => root.render(<SearchProvider>{screen}</SearchProvider>));
    };
    const button = (label: string) =>
      root.container.queryAll(
        (n) => n.type === "Pressable" && n.props.accessibilityLabel === label,
      )[0]!;
    const press = async (label: string) => {
      const target = button(label);
      expect(target).toBeDefined();
      expect(target.props.disabled).not.toBe(true);
      await act(async () => target.props.onPress());
    };
    await render(<WelcomeScreen />);
    expect(button(copy.results.search).props.disabled).toBe(true);
    await press(
      `${copy.services.names[service]}. ${copy.services.descriptions[service]}`,
    );
    await press(copy.results.search);
    expect(ports.push).toHaveBeenLastCalledWith("/results");
    analytics.setEnabled(true);
    await render(<ResultsScreen />);
    expect(ports.nearby.mock.calls[0]![0]).toMatchObject({
      latitude: ports.origin.latitude,
      longitude: ports.origin.longitude,
      service,
      sort: "nearest",
    });
    expect(root.container.queryAll((n) => n.type === "FlatList")).toHaveLength(1);
    expect(root.container.queryAll((n) => n.type === "MapView")).toHaveLength(0);
    const text = JSON.stringify(root.container.toJSON());
    expect(text).toContain(first.name);
    expect(text).toContain(copy.evidence.confidence);
    await press(`${copy.evidence.navigate} · Apple Maps`);
    expect(ports.openURL).toHaveBeenCalledWith(
      expect.stringContaining("https://maps.apple.com/"),
    );
    expect(ports.openURL.mock.calls[0]![0]).not.toContain("saddr");
    await press(copy.evidence.map);
    const showMap = async () => {
      await act(() => {
        root.container.queryAll((n) => n.type === "Modal")[0]!.props.onShow();
        root.container
          .queryAll((n) => !!n.props.onLayout)[0]!
          .props.onLayout({
            nativeEvent: { layout: { width: 320, height: 480 } },
          });
      });
    };
    await showMap();
    expect(root.container.queryAll((n) => n.type === "Marker")).toHaveLength(
      response.results.length,
    );
    const map = root.container.queryAll((n) => n.type === "MapView")[0]!;
    expect(map.props.showsUserLocation).toBe(false);
    await press(copy.evidence.back);
    expect(root.container.queryAll((n) => n.type === "MapView")).toHaveLength(0);
    await press(copy.evidence.details);
    expect(ports.push).toHaveBeenLastCalledWith({
      pathname: "/point/[id]",
      params: {
        id: first.id,
        ...(service === "fuel" ? { fuelType: response.fuelType } : {}),
      },
    });
    // Map selection must carry exactly the same context as list selection.
    await press(copy.evidence.map);
    await showMap();
    await act(async () =>
      root.container.queryAll((n) => n.type === "Marker")[0]!.props.onPress(),
    );
    await press(copy.evidence.details);
    expect(ports.push).toHaveBeenLastCalledWith({
      pathname: "/point/[id]",
      params: {
        id: first.id,
        ...(service === "fuel" ? { fuelType: response.fuelType } : {}),
      },
    });
    ports.fuelType = service === "fuel" ? (response.fuelType ?? undefined) : undefined;
    await render(<PointScreen />);
    expect(ports.servicePoint.mock.calls[0]![0]).toBe(first.id);
    expect(ports.servicePoint.mock.calls[0]![2]).toEqual(
      service === "fuel" ? { fuelType: response.fuelType } : {},
    );
    await press("Google Maps");
    expect(analytics.beta.getSnapshot().attempts).toMatchObject([
      { status: "success", exposed: true, clicked: true, handedOff: true },
    ]);
    expect(ports.openURL).toHaveBeenLastCalledWith(
      expect.stringContaining("https://www.google.com/maps/dir/"),
    );
  },
);

it("disables synthetic station navigation in both result and detail screens", async () => {
  ports.language = "en";
  const copy = getMessages("en");
  const response = structuredClone(sample) as NearbyResponse;
  response.results[0]!.evidence.source!.id = "__fixture__fr_fuel";
  const point = structuredClone(detail) as ServicePointResponse;
  ports.id = point.servicePoint.id = response.results[0]!.id;
  for (const service of point.servicePoint.services)
    if (service.evidence.source) service.evidence.source.id = "__fixture__fr_fuel";
  ports.nearby.mockResolvedValue(response);
  ports.servicePoint.mockResolvedValue(point);
  const root = createRoot({ textComponentTypes: ["Text"] });
  roots.push(root);
  const button = (label: string) =>
    root.container.queryAll(
      (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
    )[0]!;
  await act(async () =>
    root.render(
      <SearchProvider>
        <WelcomeScreen />
      </SearchProvider>,
    ),
  );
  await act(async () =>
    button(
      `${copy.services.names.fuel}. ${copy.services.descriptions.fuel}`,
    ).props.onPress(),
  );
  await act(async () =>
    root.render(
      <SearchProvider>
        <ResultsScreen />
      </SearchProvider>,
    ),
  );
  expect(button(`${copy.evidence.navigate} · Apple Maps`).props.disabled).toBe(true);
  expect(JSON.stringify(root.container.toJSON())).toContain(
    copy.evidence.demoNavigationDisabled,
  );
  await act(async () =>
    root.render(
      <SearchProvider>
        <PointScreen />
      </SearchProvider>,
    ),
  );
  expect(button("Google Maps").props.disabled).toBe(true);
  expect(ports.openURL).not.toHaveBeenCalled();
});

it("reloads detail on fuel changes, retries the same fuel and rejects invalid route fuel", async () => {
  ports.language = "en";
  ports.id = detail.servicePoint.id;
  ports.fuelType = "diesel";
  ports.servicePoint.mockResolvedValue(detail);
  const root = createRoot({ textComponentTypes: ["Text"] });
  roots.push(root);
  await act(async () => root.render(<PointScreen />));
  expect(ports.servicePoint).toHaveBeenLastCalledWith(
    ports.id,
    expect.any(AbortSignal),
    { fuelType: "diesel" },
  );
  ports.fuelType = "sp95_e10";
  ports.servicePoint.mockRejectedValueOnce(new ApiFailure("network"));
  await act(async () => root.render(<PointScreen />));
  expect(ports.servicePoint).toHaveBeenLastCalledWith(
    ports.id,
    expect.any(AbortSignal),
    { fuelType: "sp95_e10" },
  );
  const retry = root.container.queryAll(
    (node) =>
      node.type === "Pressable" &&
      node.props.accessibilityLabel === getMessages("en").results.retry,
  )[0]!;
  await act(async () => retry.props.onPress());
  expect(ports.servicePoint).toHaveBeenLastCalledWith(
    ports.id,
    expect.any(AbortSignal),
    { fuelType: "sp95_e10" },
  );
  const calls = ports.servicePoint.mock.calls.length;
  ports.fuelType = ["diesel", "sp95_e10"];
  await act(async () => root.render(<PointScreen />));
  expect(ports.servicePoint).toHaveBeenCalledTimes(calls);
  expect(JSON.stringify(root.container.toJSON())).toContain(
    getMessages("en").evidence.invalidPoint,
  );
  ports.fuelType = undefined;
  await act(async () => root.render(<PointScreen />));
  expect(ports.servicePoint).toHaveBeenLastCalledWith(
    ports.id,
    expect.any(AbortSignal),
    {},
  );
});

it("shows a safe network error and retries the same service without exposing URLs", async () => {
  ports.language = "en";
  const copy = getMessages("en");
  ports.nearby
    .mockRejectedValueOnce(new ApiFailure("network"))
    .mockResolvedValueOnce(sample);
  const root = createRoot({ textComponentTypes: ["Text"] });
  roots.push(root);
  await act(async () =>
    root.render(
      <SearchProvider>
        <WelcomeScreen />
      </SearchProvider>,
    ),
  );
  const button = (label: string) =>
    root.container.queryAll(
      (n) => n.type === "Pressable" && n.props.accessibilityLabel === label,
    )[0]!;
  await act(async () =>
    button(
      `${copy.services.names.fuel}. ${copy.services.descriptions.fuel}`,
    ).props.onPress(),
  );
  await act(async () =>
    root.render(
      <SearchProvider>
        <ResultsScreen />
      </SearchProvider>,
    ),
  );
  expect(JSON.stringify(root.container.toJSON())).toContain(copy.evidence.network);
  await act(async () => button(copy.results.retry).props.onPress());
  expect(ports.nearby).toHaveBeenCalledTimes(2);
  expect(root.container.queryAll((n) => n.type === "FlatList")).toHaveLength(1);
});
