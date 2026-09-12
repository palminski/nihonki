import { forwardRef } from "react";
import { TextInput, TextInputProps } from "react-native";
import { GLOBAL_MAX_FONT_SIZE_MULTIPLIER } from "~/utils/textScaling";

// Drop-in replacement for react-native's TextInput — same rationale as AppText. Forwards
// its ref to the underlying TextInput so callers can still call .focus()/.blur() on it.
const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(props, ref) {
    return <TextInput ref={ref} maxFontSizeMultiplier={GLOBAL_MAX_FONT_SIZE_MULTIPLIER} {...props} />;
});

export default AppTextInput;
