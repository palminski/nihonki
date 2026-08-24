import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { NavigationProp, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LANGUAGE_CATALOG, Language, loadEnabledLanguages } from "~/utils/languageManager";
import { getDueCounts, DueCounts } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

const EMPTY_DUE_COUNTS: DueCounts = { newCount: 0, learningCount: 0, reviewCount: 0 };

export default function LanguageSelectScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const [enabledLanguages, setEnabledLanguages] = useState<Language[]>(
        LANGUAGE_CATALOG.filter((language) => language.id === "japanese")
    );
    const [dueCounts, setDueCounts] = useState<Record<string, DueCounts>>({});

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const enabledIds = await loadEnabledLanguages();
                const languages = LANGUAGE_CATALOG.filter((language) => enabledIds.includes(language.id));
                setEnabledLanguages(languages);

                const counts: Record<string, DueCounts> = {};
                await Promise.all(
                    languages.map(async (language) => {
                        counts[language.id] = await getDueCounts(language.id);
                    })
                );
                setDueCounts(counts);
            })();
        }, [])
    );

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.heading}>Select a language to study</Text>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {enabledLanguages.length === 0 && (
                        <Text style={styles.emptyText}>
                            No languages added yet.{"\n"}Tap "Add Language" below to get started.
                        </Text>
                    )}
                    {enabledLanguages.map((language) => (
                        <Pressable
                            key={language.id}
                            onPress={() =>
                                navigation.navigate("Japanese", {
                                    languageId: language.id,
                                    languageLabel: language.label,
                                })
                            }
                            style={styles.languageRow}
                        >
                            <Text style={{ fontSize: 32 }}>{language.flagEmoji}</Text>
                            <View style={styles.languageLabels}>
                                <Text style={styles.languageLabel}>{language.label}</Text>
                                <Text style={styles.languageNativeLabel}>{language.nativeLabel}</Text>
                            </View>
                            <View style={styles.dueCountsRow}>
                                <Text style={[styles.dueCountText, { color: colors.blue400 }]}>
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).newCount}
                                </Text>
                                <Text style={styles.dueCountSlash}>/</Text>
                                <Text style={[styles.dueCountText, { color: colors.red400 }]}>
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).learningCount}
                                </Text>
                                <Text style={styles.dueCountSlash}>/</Text>
                                <Text style={[styles.dueCountText, { color: colors.green400 }]}>
                                    {(dueCounts[language.id] ?? EMPTY_DUE_COUNTS).reviewCount}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>

                <Pressable onPress={() => navigation.navigate("Manage Languages")} style={styles.manageButton}>
                    <Ionicons name="language" size={22} color="#e6b3ff" />
                    <Text style={styles.manageButtonText}>Manage Languages</Text>
                </Pressable>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    heading: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 18,
        marginBottom: 16,
    },
    emptyText: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 16,
        textAlign: 'center',
        marginTop: 24,
    },
    languageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.black,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginBottom: 12,
        padding: 16,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    languageLabels: {
        marginLeft: 16,
        flex: 1,
    },
    languageLabel: {
        color: colors.white,
        fontSize: 20,
        fontWeight: '600',
    },
    languageNativeLabel: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 16,
    },
    dueCountsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dueCountText: {
        fontWeight: '600',
        fontSize: 14,
    },
    dueCountSlash: {
        color: withOpacity(colors.purple300, 0.3),
        marginHorizontal: 4,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.black,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginTop: 12,
        padding: 16,
    },
    manageButtonText: {
        color: colors.purple300,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
