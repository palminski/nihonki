import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { NavigationProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import UmeboshiChan from "../assets/UmeboshiChan.svg";
import { getDueCounts, DueCounts } from "~/utils/srsManager";
import { colors, withOpacity } from "~/utils/colors";

const EMPTY_DUE_COUNTS: DueCounts = { newCount: 0, learningCount: 0, reviewCount: 0 };

export default function JapaneseHomeScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const route = useRoute();
    const { languageId = "japanese", languageLabel } = (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};

    const [dueCounts, setDueCounts] = useState<DueCounts>(EMPTY_DUE_COUNTS);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setDueCounts(await getDueCounts(languageId));
            })();
        }, [languageId])
    );

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <UmeboshiChan width={160} height={160} style={{ marginBottom: 16 }} />

                <View style={styles.dueCountsBox}>
                    <View style={styles.dueCountItem}>
                        <Text style={[styles.dueCountNumber, { color: colors.blue400 }]}>{dueCounts.newCount}</Text>
                        <Text style={styles.dueCountLabel}>New</Text>
                    </View>
                    <View style={styles.dueCountItem}>
                        <Text style={[styles.dueCountNumber, { color: colors.red400 }]}>{dueCounts.learningCount}</Text>
                        <Text style={styles.dueCountLabel}>Learning</Text>
                    </View>
                    <View style={styles.dueCountItem}>
                        <Text style={[styles.dueCountNumber, { color: colors.green400 }]}>{dueCounts.reviewCount}</Text>
                        <Text style={styles.dueCountLabel}>Review</Text>
                    </View>
                </View>

                <View style={styles.iconRow}>
                    <Pressable onPress={() => navigation.navigate("Card List", { languageId, languageLabel })} style={styles.iconButton}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="list" size={30} color="#e6b3ff" />
                        </View>
                        <Text style={styles.iconLabel}>Card List</Text>
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate("Review", { languageId, languageLabel })} style={styles.iconButton}>
                        <View style={[styles.iconCircle, { padding: 20 }]}>
                            <Ionicons name="layers" size={40} color="#e6b3ff" />
                        </View>
                        <Text style={styles.iconLabel}>Review</Text>
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate("Add Words", { languageId, languageLabel })} style={styles.iconButton}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="add-circle-outline" size={30} color="#e6b3ff" />
                        </View>
                        <Text style={styles.iconLabel}>Add Words</Text>
                    </Pressable>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    dueCountsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.black,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 24,
    },
    dueCountItem: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    dueCountNumber: {
        fontWeight: '600',
        fontSize: 18,
    },
    dueCountLabel: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 12,
    },
    iconRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    iconButton: {
        alignItems: 'center',
        width: '33%',
    },
    iconCircle: {
        borderWidth: 1,
        borderColor: colors.purple800,
        backgroundColor: colors.black,
        borderRadius: 9999,
        padding: 16,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    iconLabel: {
        color: colors.white,
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
});
