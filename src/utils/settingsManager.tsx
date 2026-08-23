import AsyncStorage from "@react-native-async-storage/async-storage";

const OPENAI_API_KEY = "none"

const DECK_KEY_PREFIX = "defaultDeck_";
const ANKI_ENABLED_KEY_PREFIX = "ankiEnabled_";
// Anki settings used to be global (one deck/toggle for the whole app, back when only
// Japanese existed). Migrated once into the per-language key on first read.
const LEGACY_DECK_KEY = "defaultDeck";
const LEGACY_ANKI_ENABLED_KEY = "ankiEnabled";
const LEGACY_LANGUAGE_ID = "japanese";

export async function updateDeckSetting(languageId: string, deckName: string) {
    try {
        await AsyncStorage.setItem(DECK_KEY_PREFIX + languageId, deckName);
    } catch (error) {
        console.error("Failed To Save Deck Name", error);
    }
}

export async function loadDeckSetting(languageId: string) {
    try {
        const storageKey = DECK_KEY_PREFIX + languageId;
        let deckName = await AsyncStorage.getItem(storageKey);

        if (deckName == null && languageId === LEGACY_LANGUAGE_ID) {
            const legacyDeckName = await AsyncStorage.getItem(LEGACY_DECK_KEY);
            if (legacyDeckName != null) {
                await AsyncStorage.setItem(storageKey, legacyDeckName);
                deckName = legacyDeckName;
            }
        }

        return deckName;
    } catch (error) {
        console.error("Failed To Load Deck Name", error);
        return null;
    }
}

export async function updateAPIKeySetting(apiKey:string) {
    try {
        await AsyncStorage.setItem(OPENAI_API_KEY, apiKey);
    } catch (error) {
        console.error("Failed To Save API Key", error);
    }
}

export async function loadAPIKeySetting() {
    try {
       const apiKey = await AsyncStorage.getItem(OPENAI_API_KEY);
       return apiKey;
    } catch (error) {
        console.error("Failed To Load API Key", error);
        null;
    }
}

export async function updateAnkiEnabledSetting(languageId: string, enabled: boolean) {
    try {
        await AsyncStorage.setItem(ANKI_ENABLED_KEY_PREFIX + languageId, enabled ? "true" : "false");
    } catch (error) {
        console.error("Failed To Save Anki Enabled Setting", error);
    }
}

export async function loadAnkiEnabledSetting(languageId: string) {
    try {
        const storageKey = ANKI_ENABLED_KEY_PREFIX + languageId;
        let ankiEnabled = await AsyncStorage.getItem(storageKey);

        if (ankiEnabled == null && languageId === LEGACY_LANGUAGE_ID) {
            const legacyAnkiEnabled = await AsyncStorage.getItem(LEGACY_ANKI_ENABLED_KEY);
            if (legacyAnkiEnabled != null) {
                await AsyncStorage.setItem(storageKey, legacyAnkiEnabled);
                ankiEnabled = legacyAnkiEnabled;
            }
        }

        return ankiEnabled === "true";
    } catch (error) {
        console.error("Failed To Load Anki Enabled Setting", error);
        return false;
    }
}
