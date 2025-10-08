import AsyncStorage from "@react-native-async-storage/async-storage";

const VOCAB_LIST_KEY = "vocab_list"

export async function updateVocabList(vocabList) {
    try {
        const vocabListJSON = JSON.stringify(vocabList);
        await AsyncStorage.setItem(VOCAB_LIST_KEY, vocabListJSON);
    } catch (error) {
        console.error("Failed To Save Vocab List");
    }
}

export async function loadVocabList() {
    try {
       const vocabListJSON = await AsyncStorage.getItem(VOCAB_LIST_KEY);
       if (!vocabListJSON) return {};
       const vocabList = JSON.parse(vocabListJSON)
       return vocabList;
    } catch (error) {
        console.error("Failed To Load Vocab List");
        null;
    }
}
