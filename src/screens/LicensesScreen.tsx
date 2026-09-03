import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { colors, withOpacity } from "~/utils/colors";
import thirdPartyLicenses from "~/data/thirdPartyLicenses.json";

interface LicenseEntry {
    name: string;
    version: string;
    license: string;
    author: string;
    text: string;
}

function LicenseCard({ entry }: { entry: LicenseEntry }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Pressable onPress={() => setIsOpen(!isOpen)} style={styles.card}>
            <View style={styles.headerRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.name}>{entry.name}</Text>
                    <Text style={styles.meta}>v{entry.version} — {entry.license} — {entry.author}</Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? "▼" : "▲"}</Text>
            </View>
            {isOpen && (
                <Text style={styles.licenseText} selectable>
                    {entry.text}
                </Text>
            )}
        </Pressable>
    );
}

export default function LicensesScreen() {
    const licenses = thirdPartyLicenses as LicenseEntry[];

    return (
        <ScreenWrapper>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.introText}>
                    Umeboshi is built with the open-source packages below. Tap any entry to view its full
                    license text.
                </Text>
                {licenses.map((entry) => (
                    <LicenseCard key={entry.name} entry={entry} />
                ))}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    introText: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 14,
        marginBottom: 16,
    },
    card: {
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.purple800,
        backgroundColor: colors.purple950,
        borderRadius: 4,
        padding: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    name: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    meta: {
        color: colors.purple300,
        fontSize: 12,
        marginTop: 2,
    },
    chevron: {
        color: colors.purple300,
        fontSize: 12,
    },
    licenseText: {
        color: withOpacity(colors.purple300, 0.8),
        fontSize: 12,
        fontFamily: 'monospace',
        marginTop: 12,
        lineHeight: 18,
    },
});
