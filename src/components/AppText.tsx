import { Text, TextProps } from "react-native";
import { GLOBAL_MAX_FONT_SIZE_MULTIPLIER } from "~/utils/textScaling";

// Drop-in replacement for react-native's Text used everywhere EXCEPT actual card content
// (SwipeCard/FuriganaText render plain Text on purpose, so vocabulary the user is trying
// to read always honors their device's accessibility text-size setting exactly). Caps
// scaling here so a bumped-up system font size doesn't blow out badges/counters/labels
// that were laid out assuming roughly-default text size. Spread after the default so a
// caller can still override maxFontSizeMultiplier (or pass allowFontScaling={false}) when
// a specific piece of text needs different treatment (e.g. small fixed-size badges).
export default function AppText(props: TextProps) {
    return <Text maxFontSizeMultiplier={GLOBAL_MAX_FONT_SIZE_MULTIPLIER} {...props} />;
}
