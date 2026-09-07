import { afterEach, expect, it, vi } from "vitest";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { getMessages } from "../src/i18n/catalog";
import { ActionButton } from "../src/components/ActionButton";
import { ServicePicker } from "../src/components/ServicePicker";
import { SearchProvider } from "../src/search/context";
import { SortControl } from "../src/components/SortControl";
import { EvidenceSummary } from "../src/components/EvidenceSummary";
import type { Evidence } from "../src/search/evidence";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";

const state = vi.hoisted(() => ({
  language: "en" as "en" | "fr" | "es",
  fontScale: 1,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("../src/i18n/context", () => ({
  useLanguage: () => ({ language: state.language, copy: getMessages(state.language) }),
}));
// Native host adapters only: real React components, state and event handlers run.
vi.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  ScrollView: "ScrollView",
  Modal: "Modal",
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: () => ({ fontScale: state.fontScale }),
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
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
const roots: ReturnType<typeof createRoot>[] = [];
async function render(element: Parameters<ReturnType<typeof createRoot>["render"]>[0]) {
  const root = createRoot({ textComponentTypes: ["Text"] });
  roots.push(root);
  await act(() => root.render(element));
  return root;
}
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  state.language = "en";
  state.fontScale = 1;
});

it("reflows service cards for measured width and font changes without restricting text", async () => {
  state.language = "es";
  const element = (
    <SearchProvider>
      <ServicePicker />
    </SearchProvider>
  );
  const root = await render(element);
  const grid = () => root.container.queryAll((node) => !!node.props.onLayout)[0]!;
  const cards = () => root.container.queryAll((node) => node.type === "Pressable");
  const bases = () =>
    cards().map(
      (node) => Object.assign({}, ...node.props.style.filter(Boolean)).flexBasis,
    );
  expect(bases()).toEqual(Array(4).fill("100%"));
  for (const [width, fontScale, expected] of [
    [320, 1, "100%"],
    [800, 1, "45%"],
    [800, 2, "100%"],
    [320, 1.3, "100%"],
    [800, 1, "45%"],
  ] as const) {
    state.fontScale = fontScale;
    await act(() => {
      grid().props.onLayout({ nativeEvent: { layout: { width } } });
      root.render(
        <SearchProvider>
          <ServicePicker />
        </SearchProvider>,
      );
    });
    expect(bases()).toEqual(Array(4).fill(expected));
    await act(() => cards()[0]!.props.onPress());
    expect(cards()[0]!.props.accessibilityState.selected).toBe(true);
    expect(JSON.stringify(cards()[0]!.toJSON())).toContain("Combustible");
  }
  for (const node of root.container.queryAll((node) => node.type === "Text")) {
    expect(node.props.allowFontScaling).not.toBe(false);
    expect(node.props.numberOfLines).toBeUndefined();
    expect(node.props.adjustsFontSizeToFit).not.toBe(true);
  }
});

it("provides 48+ touch targets, explicit selection, expanded and disabled semantics", async () => {
  const onPress = vi.fn();
  const root = await render(
    <ActionButton label="Choose" selected expanded disabled onPress={onPress} />,
  );
  const button = root.container.queryAll((n) => n.type === "Pressable")[0]!;
  expect(button.props.accessibilityRole).toBe("button");
  expect(button.props.accessibilityLabel).toBe("Choose");
  expect(button.props.accessibilityState).toEqual({
    selected: true,
    disabled: true,
    expanded: true,
  });
  expect(button.props.onPress).toBeUndefined();
  const style = Object.assign({}, ...button.props.style.filter(Boolean)) as Record<
    string,
    number
  >;
  expect(style.minHeight).toBeGreaterThanOrEqual(48);
  expect(style.minWidth).toBeGreaterThanOrEqual(48);
  expect(JSON.stringify(root.container.toJSON())).toContain("✓ Choose");
  expect(
    root.container
      .queryAll((n) => n.type === "Text")
      .every(
        (n) =>
          n.props.allowFontScaling !== false && n.props.numberOfLines === undefined,
      ),
  ).toBe(true);
});

it.each(["en", "fr", "es"] as const)(
  "selects all four labelled services in %s without relying on color",
  async (language) => {
    state.language = language;
    const root = await render(
      <SearchProvider>
        <ServicePicker />
      </SearchProvider>,
    );
    const buttons = root.container.queryAll((n) => n.type === "Pressable");
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      await act(() => button.props.onPress());
      expect(button.props.accessibilityState.selected).toBe(true);
      expect(JSON.stringify(button.toJSON())).toContain("✓ ");
      expect(button.props.accessibilityLabel).toBeTruthy();
    }
  },
);

it.each(["en", "fr", "es"] as const)(
  "keeps filters collapsed and capability-disabled controls explained in %s",
  async (language) => {
    state.language = language;
    const onSort = vi.fn(),
      copy = getMessages(language);
    const root = await render(
      <SortControl
        service="charging"
        sort="nearest"
        fuelType={undefined}
        response={null}
        onSort={onSort}
        onFuel={vi.fn()}
      />,
    );
    const buttons = () => root.container.queryAll((n) => n.type === "Pressable");
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0]!.props.accessibilityState.expanded).toBe(false);
    await act(() => buttons()[0]!.props.onPress());
    const cheapest = buttons().find(
      (n) => n.props.accessibilityLabel === copy.results.cheapest,
    )!;
    expect(cheapest.props.accessibilityState.disabled).toBe(true);
    const nearest = buttons().find(
      (n) => n.props.accessibilityLabel === copy.results.nearest,
    )!;
    await act(() => nearest.props.onPress());
    expect(onSort).toHaveBeenCalledWith("nearest");
    expect(buttons()).toHaveLength(1);
  },
);

it.each(["en", "fr", "es"] as const)(
  "keeps price, state, confidence and warnings visible while evidence is collapsed in %s",
  async (language) => {
    state.language = language;
    const copy = getMessages(language);
    const evidence = { ...sample.results[0]!.evidence, freshness: "stale" } as Evidence;
    const root = await render(
      <EvidenceSummary compact evidence={evidence} country="FR" />,
    );
    const json = () => JSON.stringify(root.container.toJSON());
    expect(json()).toContain(copy.evidence.confidence);
    expect(json()).toContain(copy.evidence.staleData);
    const toggle = () => root.container.queryAll((n) => n.type === "Pressable")[0]!;
    expect(toggle().props.accessibilityState.expanded).toBe(false);
    const collapsedCount = root.container.queryAll((n) => n.type === "Text").length;
    await act(() => toggle().props.onPress());
    expect(toggle().props.accessibilityState.expanded).toBe(true);
    expect(root.container.queryAll((n) => n.type === "Text").length).toBeGreaterThan(
      collapsedCount,
    );
    await act(() => toggle().props.onPress());
    expect(root.container.queryAll((n) => n.type === "Text")).toHaveLength(
      collapsedCount,
    );
  },
);

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
it.each([
  ["#173E32", "#FFFFFF", 4.5],
  ["#173E32", "#F5F4ED", 4.5],
  ["#4F5D54", "#F5F4ED", 4.5],
  ["#263E32", "#FFFFFF", 4.5],
  ["#5B431D", "#F5E8CD", 4.5],
  ["#627369", "#F5F4ED", 3],
] as const)("verifies contrast %s on %s >= %s", (foreground, background, minimum) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  expect((values[0]! + 0.05) / (values[1]! + 0.05)).toBeGreaterThanOrEqual(minimum);
});
