import AsyncStorage from "@react-native-async-storage/async-storage";

const DECK_KEY = "defaultDeck"
const OPENAI_API_KEY = "none"

export async function updateDeckSetting(deckName:string) {
    try {
        await AsyncStorage.setItem(DECK_KEY, deckName);
    } catch (error) {
        console.error("Failed To Save Deck Name", error);
    }
}

export async function loadDeckSetting() {
    try {
       const deckName = await AsyncStorage.getItem(DECK_KEY);
       return deckName;
    } catch (error) {
        console.error("Failed To Load Deck Name", error);
        null;
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