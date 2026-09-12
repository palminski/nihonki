import { useCallback, useState } from "react";
import { View, Pressable, Alert, ScrollView, ActivityIndicator, Switch, Platform, StyleSheet } from "react-native";
import AppText from "~/components/AppText";
import AppTextInput from "~/components/AppTextInput";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadDeckSetting, updateDeckSetting, loadAnkiEnabledSetting, updateAnkiEnabledSetting, loadAutoPlayAudioSetting, updateAutoPlayAudioSetting } from "~/utils/settingsManager";
import { loadNewCardsPerDay, updateNewCardsPerDay, DEFAULT_NEW_CARDS_PER_DAY } from "~/utils/srsManager";
import { exportDeckBackup, pickDeckBackupFile, restoreDeckBackup } from "~/utils/backupManager";
import { colors, withOpacity } from "~/utils/colors";

export default function LanguageSettingsScreen() {
    const route = useRoute();
    const { languageId = "japanese", languageLabel = "Japanese" } =
        (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};
    const isJapanese = languageId === "japanese";
    // AnkiDroid is Android-only and (for now) only ever wired up for Japanese.
    const showAnkiSettings = isJapanese && Platform.OS === "android";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backupBusy, setBackupBusy] = useState(false);
    const [settingForm, setSettingForm] = useState({
        newCardsPerDay: String(DEFAULT_NEW_CARDS_PER_DAY),
        ankiEnabled: false,
        insertDeck: "",
        autoPlayAudio: true,
    });

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                const newCardsPerDay = await loadNewCardsPerDay(languageId);
                const ankiEnabled = showAnkiSettings ? await loadAnkiEnabledSetting(languageId) : false;
                const insertDeck = showAnkiSettings ? await loadDeckSetting(languageId) : "";
                const autoPlayAudio = await loadAutoPlayAudioSetting(languageId);
                setSettingForm({
                    newCardsPerDay: String(newCardsPerDay),
                    ankiEnabled,
                    insertDeck: insertDeck ?? "",
                    autoPlayAudio,
                });
                setLoading(false);
            })();
        }, [languageId])
    );

    function handleFormChange(key: string, value: string | boolean) {
        setSettingForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleFormSubmit() {
        if (saving) return;
        setSaving(true);

        const parsedNewCardsPerDay = parseInt(settingForm.newCardsPerDay, 10);
        await updateNewCardsPerDay(
            languageId,
            Number.isFinite(parsedNewCardsPerDay) && parsedNewCardsPerDay >= 0
                ? parsedNewCardsPerDay
                : DEFAULT_NEW_CARDS_PER_DAY
        );

        if (showAnkiSettings) {
            await updateAnkiEnabledSetting(languageId, settingForm.ankiEnabled);
            await updateDeckSetting(languageId, settingForm.insertDeck);
        }

        await updateAutoPlayAudioSetting(languageId, settingForm.autoPlayAudio);

        setSaving(false);
        Alert.alert("Setting Saved!");
    }

    async function handleExportBackup() {
        if (backupBusy) return;
        setBackupBusy(true);
        try {
            await exportDeckBackup(languageId, languageLabel);
        } catch (error: any) {
            Alert.alert("Backup Failed", error?.message ? error.message : "Something went wrong while creating the backup.");
        } finally {
            setBackupBusy(false);
        }
    }

    async function handleImportBackup() {
        if (backupBusy) return;
        setBackupBusy(true);
        try {
            const preview = await pickDeckBackupFile();
            if (!preview) {
                setBackupBusy(false);
                return;
            }

            if (preview.languageId !== languageId) {
                Alert.alert(
                    "Wrong Language",
                    `This backup is for ${preview.languageLabel}, but you're viewing ${languageLabel} settings. Go to ${preview.languageLabel}'s settings to import it.`
                );
                setBackupBusy(false);
                return;
            }

            const exportedDate = new Date(preview.exportedAt);
            const exportedLabel = Number.isNaN(exportedDate.getTime()) ? "an earlier date" : exportedDate.toLocaleDateString();

            Alert.alert(
                "Restore Backup",
                `This will replace your current ${languageLabel} deck with the ${preview.cardCount} card${preview.cardCount === 1 ? "" : "s"} from this backup (exported ${exportedLabel}). This cannot be undone.`,
                [
                    { text: "Cancel", style: "cancel", onPress: () => setBackupBusy(false) },
                    {
                        text: "Restore",
                        style: "destructive",
                        onPress: async () => {
                            try {
                                await restoreDeckBackup(languageId, preview);
                                Alert.alert("Deck Restored!");
                            } catch (error: any) {
                                Alert.alert("Restore Failed", error?.message ? error.message : "Something went wrong while restoring the backup.");
                            } finally {
                                setBackupBusy(false);
                            }
                        },
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert("Import Failed", error?.message ? error.message : "Something went wrong while reading that file.");
            setBackupBusy(false);
        }
    }

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size={50} color={"#A855F7"} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <AppText style={styles.heading}>{languageLabel} Settings</AppText>

                <View style={{ marginBottom: 12 }}>
                    <View style={styles.row}>
                        <AppText style={styles.label}>New Cards Per Day</AppText>
                        <Pressable
                            onPress={() =>
                                Alert.alert(
                                    "New Cards Per Day",
                                    "The maximum number of brand-new cards introduced into your review queue each day for this language. Cards already due for review are not affected by this limit."
                                )
                            }
                            style={{ alignItems: 'center' }}
                        >
                            <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                        </Pressable>
                    </View>
                    <AppTextInput
                        style={styles.textInput}
                        placeholderTextColor={withOpacity(colors.purple300, 0.5)}
                        value={settingForm.newCardsPerDay}
                        onChangeText={(text) => handleFormChange("newCardsPerDay", text.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                        placeholder={String(DEFAULT_NEW_CARDS_PER_DAY)}
                    />
                </View>

                <View style={{ marginBottom: 12 }}>
                    <View style={[styles.row, { justifyContent: 'space-between' }]}>
                        <View style={styles.row}>
                            <AppText style={styles.label}>Auto-Play Audio on Flip</AppText>
                            <Pressable
                                onPress={() =>
                                    Alert.alert(
                                        "Auto-Play Audio on Flip",
                                        "When enabled, flipping a card automatically reads the word and example sentence aloud. You can always play it manually with the speaker button on the card."
                                    )
                                }
                                style={{ alignItems: 'center' }}
                            >
                                <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                            </Pressable>
                        </View>
                        <Switch
                            value={settingForm.autoPlayAudio}
                            onValueChange={(value) => handleFormChange("autoPlayAudio", value)}
                            trackColor={{ false: "#3f3f46", true: "#7e22ce" }}
                            thumbColor={"#e6b3ff"}
                        />
                    </View>
                </View>

                {showAnkiSettings && (
                    <>
                        <View style={{ marginBottom: 12 }}>
                            <View style={[styles.row, { justifyContent: 'space-between' }]}>
                                <View style={styles.row}>
                                    <AppText style={styles.label}>Enable AnkiDroid Communication</AppText>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Enable AnkiDroid Communication",
                                                "When enabled, cards can be sent directly to the AnkiDroid app on your device. Requires AnkiDroid to be installed."
                                            )
                                        }
                                        style={{ alignItems: 'center' }}
                                    >
                                        <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                    </Pressable>
                                </View>
                                <Switch
                                    value={settingForm.ankiEnabled}
                                    onValueChange={(value) => handleFormChange("ankiEnabled", value)}
                                    trackColor={{ false: "#3f3f46", true: "#7e22ce" }}
                                    thumbColor={"#e6b3ff"}
                                />
                            </View>
                        </View>

                        {settingForm.ankiEnabled && (
                            <View style={{ marginBottom: 12 }}>
                                <View style={styles.row}>
                                    <AppText style={styles.label}>Anki Deck To Insert Into</AppText>
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Anki Deck To Insert Into",
                                                "When send to anki is clicked this is the deck new cards will be inserted into. If no deck with the given name exists a new one will be made. If no text is entered here it will default to Umeboshi"
                                            )
                                        }
                                        style={{ alignItems: 'center' }}
                                    >
                                        <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                    </Pressable>
                                </View>
                                <AppTextInput
                                    style={styles.textInput}
                                    placeholderTextColor={withOpacity(colors.purple300, 0.5)}
                                    value={settingForm.insertDeck}
                                    onChangeText={(text) => handleFormChange("insertDeck", text)}
                                    placeholder="Deck Name (Defaults to Umeboshi)"
                                />
                            </View>
                        )}
                    </>
                )}

                <View style={{ marginBottom: 12 }}>
                    <View style={styles.row}>
                        <AppText style={styles.label}>Backup & Restore</AppText>
                        <Pressable
                            onPress={() =>
                                Alert.alert(
                                    "Backup & Restore",
                                    `Export saves this ${languageLabel} deck to a file you can keep somewhere safe (email, cloud drive, etc.) — handy before switching phones or if you're worried about losing local data. Import restores a previously exported ${languageLabel} backup, replacing the deck currently on this device.`
                                )
                            }
                            style={{ alignItems: 'center' }}
                        >
                            <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                        </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Pressable
                            onPress={handleExportBackup}
                            disabled={backupBusy}
                            style={[styles.backupButton, { flex: 1 }, backupBusy && { opacity: 0.5 }]}
                        >
                            <Ionicons name="cloud-upload-outline" size={18} color={colors.purple300} />
                            <AppText style={styles.backupButtonText}>Export</AppText>
                        </Pressable>
                        <Pressable
                            onPress={handleImportBackup}
                            disabled={backupBusy}
                            style={[styles.backupButton, { flex: 1 }, backupBusy && { opacity: 0.5 }]}
                        >
                            <Ionicons name="cloud-download-outline" size={18} color={colors.purple300} />
                            <AppText style={styles.backupButtonText}>Import</AppText>
                        </Pressable>
                    </View>
                </View>

                <Pressable
                    onPress={handleFormSubmit}
                    disabled={saving}
                    style={styles.saveButton}
                >
                    <AppText style={styles.saveButtonText}>{saving ? "Saving..." : "Save Settings"}</AppText>
                </Pressable>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    heading: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 18,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        color: colors.white,
        fontSize: 18,
        marginRight: 8,
    },
    textInput: {
        backgroundColor: colors.black,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginVertical: 4,
        marginBottom: 8,
        borderRadius: 4,
        color: colors.purple300,
        padding: 8,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    backupButton: {
        borderWidth: 1,
        padding: 10,
        backgroundColor: colors.black,
        borderColor: colors.purple800,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    backupButtonText: {
        color: colors.purple300,
        fontSize: 15,
    },
    saveButton: {
        borderWidth: 1,
        padding: 12,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 18,
    },
});
