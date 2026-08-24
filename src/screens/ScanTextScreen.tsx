import { View, StyleSheet } from "react-native";
import { useRoute } from "@react-navigation/native";
import ScreenWrapper from "~/components/ScreenWrapper";
import CameraOcrView from "~/components/CameraOcrView";

export default function ScanTextScreen() {
    const route = useRoute();
    // onWordPress is AddWordsScreen's own handleTextSubmit, passed through as a route
    // param — AddWordsScreen stays mounted underneath this screen (React Navigation
    // doesn't unmount screens on blur by default), so calling it here still updates
    // its request/results state normally; the results are just waiting when you
    // navigate back via the header's back button.
    const { languageId = "japanese", onWordPress } =
        (route.params as { languageId?: string; onWordPress?: (word: string) => void } | undefined) ?? {};

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <CameraOcrView languageId={languageId} onWordPress={onWordPress ?? (() => { })} />
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
