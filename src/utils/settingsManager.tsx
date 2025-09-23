import AsyncStorage from "@react-native-async-storage/async-storage";

const DECK_KEY = "defaultDeck"

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