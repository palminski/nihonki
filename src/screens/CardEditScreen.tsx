import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { removeCardFromReviewDeck, addCardToReviewDeck } from "~/utils/deckManager";
import { JAPANESE_CARD_FIELDS, ROMANIZED_CARD_FIELDS, SIMPLE_CARD_FIELDS, isJapaneseCard, isRomanizedCard, VocabCard } from "~/utils/cardTypes";
import { colors } from "~/utils/colors";

export default function CardEditScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { cardKey, vocabWord, languageId = "japanese" } = route.params as {
        cardKey: string;
        vocabWord: Record<string, string>;
        languageId?: string;
    };

    // Based on the card's own shape rather than the deck's nominal language — a card can
    // end up filed under the wrong language's deck, and editing it should still show the
    // fields that actually match its data instead of a mismatched blank form.
    const cardForShapeCheck = vocabWord as unknown as VocabCard;
    const FIELDS = isJapaneseCard(cardForShapeCheck)
        ? JAPANESE_CARD_FIELDS
        : isRomanizedCard(cardForShapeCheck)
            ? ROMANIZED_CARD_FIELDS
            : SIMPLE_CARD_FIELDS;

    const [form, setForm] = useState<Record<string, string>>(vocabWord);
    const [saving, setSaving] = useState(false);

    function handleChange(key: string, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
        const missing = FIELDS.filter((field) => !form[field.key]);
        if (missing.length > 0) {
            Alert.alert("Missing Fields", "Please fill in every field before saving.");
            return;
        }
        setSaving(true);
        await removeCardFromReviewDeck(languageId, cardKey);
        await addCardToReviewDeck(languageId, form);
        setSaving(false);
        navigation.goBack();
    }

    function handleDelete() {
        Alert.alert(
            "Delete Card",
            "Are you sure you want to remove this card from the deck? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await removeCardFromReviewDeck(languageId, cardKey);
                        navigation.goBack();
                    },
                },
            ]
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {FIELDS.map((field) => (
                    <View key={field.key} style={{ marginBottom: 12 }}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                        <TextInput
                            style={styles.textInput}
                            value={form[field.key]}
                            onChangeText={(text) => handleChange(field.key, text)}
                            multiline={field.multiline}
                        />
                    </View>
                ))}

                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    style={styles.saveButton}
                >
                    <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Card"}</Text>
                </Pressable>

                <Pressable
                    onPress={handleDelete}
                    disabled={saving}
                    style={styles.deleteButton}
                >
                    <Text style={styles.deleteButtonText}>Delete Card</Text>
                </Pressable>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    fieldLabel: {
        color: colors.white,
        fontSize: 16,
        marginBottom: 4,
    },
    textInput: {
        backgroundColor: colors.black,
        borderWidth: 1,
        borderColor: colors.purple800,
        borderRadius: 4,
        color: colors.purple300,
        padding: 8,
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
    deleteButton: {
        borderWidth: 1,
        padding: 12,
        borderColor: colors.red800,
        backgroundColor: colors.black,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 12,
    },
    deleteButtonText: {
        color: colors.red400,
        fontSize: 18,
    },
});
