import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { removeCardFromReviewDeck, addCardToReviewDeck } from "~/utils/deckManager";
import { JAPANESE_CARD_FIELDS, ROMANIZED_CARD_FIELDS, SIMPLE_CARD_FIELDS, isJapaneseCard, isRomanizedCard, VocabCard } from "~/utils/cardTypes";

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
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {FIELDS.map((field) => (
                    <View key={field.key} className="mb-3">
                        <Text className="text-white text-base mb-1">{field.label}</Text>
                        <TextInput
                            className="bg-black border border-purple-800 rounded text-purple-300 p-2"
                            value={form[field.key]}
                            onChangeText={(text) => handleChange(field.key, text)}
                            multiline={field.multiline}
                        />
                    </View>
                ))}

                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    className="border p-3 bg-purple-800 border-purple-600 rounded items-center mt-2"
                >
                    <Text className="text-white text-lg">{saving ? "Saving..." : "Save Card"}</Text>
                </Pressable>

                <Pressable
                    onPress={handleDelete}
                    disabled={saving}
                    className="border p-3 border-red-800 bg-black rounded items-center mt-3"
                >
                    <Text className="text-red-400 text-lg">Delete Card</Text>
                </Pressable>
            </ScrollView>
        </ScreenWrapper>
    );
}
