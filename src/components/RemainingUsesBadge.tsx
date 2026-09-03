import { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppContext } from "App";
import { loadAPIKeySetting } from "~/utils/settingsManager";
import { colors, withOpacity } from "~/utils/colors";

// Mirrors AddWordsScreen's "Enter Word" badge condition: hidden for a subscribed user or
// anyone using their own OpenAI key (unmetered), and naturally hidden on iOS too, since
// the free-tier quota system isn't wired up there yet and userData.appUserId stays empty.
export default function RemainingUsesBadge() {
    const appContext = useContext(AppContext);
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        (async () => {
            const key = await loadAPIKeySetting();
            setHasKey(!(key == null || key === ""));
        })();
    }, []);

    if (!appContext) return null;
    const { userData } = appContext;
    if (!userData.appUserId || userData.isSubscribed || hasKey) return null;

    return (
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.max(0, userData.wordsRemaining)} left</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: withOpacity(colors.black, 0.6),
        borderWidth: 1,
        borderColor: colors.purple600,
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    badgeText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
});
