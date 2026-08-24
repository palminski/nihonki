import { useCallback, useState } from "react";
import { View, Text, Switch, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { useFocusEffect } from "@react-navigation/native";
import { LANGUAGE_CATALOG, loadEnabledLanguages, updateEnabledLanguages } from "~/utils/languageManager";
import { colors, withOpacity } from "~/utils/colors";

export default function ManageLanguagesScreen() {
    const [enabledIds, setEnabledIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const ids = await loadEnabledLanguages();
                setEnabledIds(ids);
                setLoading(false);
            })();
        }, [])
    );

    async function handleToggle(id: string, value: boolean) {
        const nextIds = value ? [...enabledIds, id] : enabledIds.filter((existingId) => existingId !== id);
        setEnabledIds(nextIds);
        await updateEnabledLanguages(nextIds);
    }

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.helpText}>
                    Toggle which languages show up on your language select screen. Turning a language off will
                    not delete any cards you've already made for it.
                </Text>
                {LANGUAGE_CATALOG.map((language) => (
                    <View key={language.id} style={styles.languageRow}>
                        <View style={styles.languageInfo}>
                            <Text style={{ fontSize: 28 }}>{language.flagEmoji}</Text>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.languageLabel}>{language.label}</Text>
                                <Text style={styles.languageNativeLabel}>{language.nativeLabel}</Text>
                            </View>
                        </View>
                        <Switch
                            value={enabledIds.includes(language.id)}
                            onValueChange={(value) => handleToggle(language.id, value)}
                            trackColor={{ false: "#3f3f46", true: "#7e22ce" }}
                            thumbColor="#e6b3ff"
                        />
                    </View>
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
        padding: 16,
    },
    helpText: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 16,
        marginBottom: 16,
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.black,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginBottom: 12,
        padding: 16,
    },
    languageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageLabel: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '600',
    },
    languageNativeLabel: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 14,
    },
});
