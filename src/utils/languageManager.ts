import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export interface Language {
    id: string;
    label: string;
    nativeLabel: string;
    icon: keyof typeof Ionicons.glyphMap;
}

export const LANGUAGE_CATALOG: Language[] = [
    { id: "japanese", label: "Japanese", nativeLabel: "日本語", icon: "language" },
    { id: "spanish", label: "Spanish", nativeLabel: "Español", icon: "language" },
    { id: "french", label: "French", nativeLabel: "Français", icon: "language" },
    { id: "korean", label: "Korean", nativeLabel: "한국어", icon: "language" },
    { id: "mandarin", label: "Mandarin", nativeLabel: "中文", icon: "language" },
    { id: "cantonese", label: "Cantonese", nativeLabel: "廣東話", icon: "language" },
    { id: "german", label: "German", nativeLabel: "Deutsch", icon: "language" },
    { id: "italian", label: "Italian", nativeLabel: "Italiano", icon: "language" },
    { id: "portuguese", label: "Portuguese", nativeLabel: "Português", icon: "language" },
    { id: "russian", label: "Russian", nativeLabel: "Русский", icon: "language" },
    { id: "dutch", label: "Dutch", nativeLabel: "Nederlands", icon: "language" },
];

const ENABLED_LANGUAGES_KEY = "enabledLanguages";
const DEFAULT_ENABLED_LANGUAGES = ["japanese"];

export async function loadEnabledLanguages(): Promise<string[]> {
    try {
        const json = await AsyncStorage.getItem(ENABLED_LANGUAGES_KEY);
        if (!json) return DEFAULT_ENABLED_LANGUAGES;
        return JSON.parse(json);
    } catch (error) {
        console.error("Failed To Load Enabled Languages", error);
        return DEFAULT_ENABLED_LANGUAGES;
    }
}

export async function updateEnabledLanguages(languageIds: string[]) {
    try {
        await AsyncStorage.setItem(ENABLED_LANGUAGES_KEY, JSON.stringify(languageIds));
    } catch (error) {
        console.error("Failed To Save Enabled Languages", error);
    }
}
