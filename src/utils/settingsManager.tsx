import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// A user's own OpenAI key is a real credential, so it lives in the platform keychain/
// keystore via SecureStore rather than plaintext AsyncStorage like everything else here.
const OPENAI_API_KEY_STORAGE_KEY = "openai_api_key";
// Where the key used to live (under this oddly-generic literal name) before the move to
// SecureStore — migrated once on first read below, then cleared out.
const LEGACY_OPENAI_API_KEY_ASYNC_STORAGE_KEY = "none";

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

export async function updateAPIKeySetting(apiKey: string) {
    try {
        if (apiKey) {
            await SecureStore.setItemAsync(OPENAI_API_KEY_STORAGE_KEY, apiKey);
        } else {
            await SecureStore.deleteItemAsync(OPENAI_API_KEY_STORAGE_KEY);
        }
    } catch (error) {
        console.error("Failed To Save API Key", error);
    }
}

export async function loadAPIKeySetting() {
    try {
        let apiKey = await SecureStore.getItemAsync(OPENAI_API_KEY_STORAGE_KEY);

        if (apiKey == null) {
            const legacyApiKey = await AsyncStorage.getItem(LEGACY_OPENAI_API_KEY_ASYNC_STORAGE_KEY);
            if (legacyApiKey) {
                await SecureStore.setItemAsync(OPENAI_API_KEY_STORAGE_KEY, legacyApiKey);
                await AsyncStorage.removeItem(LEGACY_OPENAI_API_KEY_ASYNC_STORAGE_KEY);
                apiKey = legacyApiKey;
            }
        }

        return apiKey;
    } catch (error) {
        console.error("Failed To Load API Key", error);
        return null;
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
