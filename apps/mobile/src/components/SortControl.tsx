import { useState, type ComponentProps } from "react";
import { View } from "react-native";
import { SortPicker } from "./SortPicker";
import { ActionButton } from "./ActionButton";
import { useLanguage } from "../i18n/context";
export function SortControl(props: ComponentProps<typeof SortPicker>) {
  const [expanded, setExpanded] = useState(false);
  const { copy } = useLanguage();
  return (
    <View style={{ gap: 12 }}>
      <ActionButton
        secondary
        expanded={expanded}
        label={`${copy.evidence.filters} · ${copy.results[props.sort]}`}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded && (
        <SortPicker
          {...props}
          onSort={(sort) => {
            props.onSort(sort);
            setExpanded(false);
          }}
        />
      )}
    </View>
  );
}
