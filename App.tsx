
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Pressable, NativeModules, Alert, Platform, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import JapaneseHomeScreen from '~/screens/JapaneseHomeScreen';
import AddWordsScreen from '~/screens/AddWordsScreen';
import ScanTextScreen from '~/screens/ScanTextScreen';
import LanguageSelectScreen from '~/screens/LanguageSelectScreen';
import ManageLanguagesScreen from '~/screens/ManageLanguagesScreen';
import SettingsScreen from '~/screens/SettingsScreen';
import LanguageSettingsScreen from '~/screens/LanguageSettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { getIsUserSubscribed, getDeviceInfo } from '~/utils/subscriptionMethods';
import { loadAnkiEnabledSetting } from '~/utils/settingsManager';
import CardListScreen from '~/screens/CardListScreen';
import CardEditScreen from '~/screens/CardEditScreen';
import ReviewScreen from '~/screens/ReviewScreen';
import ExtraReviewScreen from '~/screens/ExtraReviewScreen';
import { useEffect, createContext, useState } from 'react';
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


interface UserData {
    appUserId: string,
    isSubscribed: boolean,
    imagesRemaining: number,
    wordsRemaining: number,
}

interface AppContextType {
    userData: UserData,
    setUserData: React.Dispatch<React.SetStateAction<UserData>>;
}

export const AppContext = createContext<AppContextType | null>(null);

export default function App() {

    const { AnkiModule } = NativeModules;
    const [userData, setUserData] = useState<UserData>({
        appUserId: "",
        isSubscribed: false,
        imagesRemaining: 0,
        wordsRemaining: 0,
    })

    useEffect(() => {
        (async () => {
            // AnkiDroid only exists on Android, and only Japanese exposes the Anki
            // integration toggle — skip the native permission prompt entirely unless
            // both are true, rather than always poking a module that may not exist.
            if (Platform.OS !== 'android') return;
            const ankiEnabled = await loadAnkiEnabledSetting('japanese');
            if (!ankiEnabled) return;

            try {
                await AnkiModule.checkAndRequestPermissions();
            } catch (error: any) {
                console.warn("Failed to check permission on startup");
            }
        })();
    }, [])

    useEffect(() => {
        // RevenueCat, the subscription entitlement check, and the free-tier device quota
        // system are all bypassed on iOS for now — RevenueCat isn't configured for the iOS
        // app yet, and both getAppUserID() and the device-quota lookup depend on it being
        // configured. iOS users run purely on their own OpenAI API key until this is set up.
        if (Platform.OS !== 'android') return;

        (async () => {
            try {
                await Purchases.configure({ apiKey: 'goog_YzOjiXxynASmcCsZxbWZrwrQQtQ' });
            } catch (error: any) {
                console.warn("Failed to check permission on startup");
            }
        })();
    }, [])

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const setUpUserData = async () => {
            try {
                const appUserId = await Purchases.getAppUserID();
                let isSubscribed = true;
                if (!await getIsUserSubscribed()) {
                    isSubscribed = false;
                }

                const deviceData = await getDeviceInfo(appUserId);

                const imagesRemaining = deviceData.images_remaining;
                const wordsRemaining = deviceData.words_remaining;

                setUserData({
                    appUserId,
                    isSubscribed,
                    imagesRemaining,
                    wordsRemaining
                })
            } catch (error: any) {
                Alert.alert(error?.message ? error.message : "ERROR");
            }

        }
        setUpUserData();
    }, []);

    return (
        <AppContext.Provider value={{ userData, setUserData }}>
            <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
                <NavigationContainer>
                    <Stack.Navigator
                        screenOptions={({ route, navigation }) => ({
                            headerShown: true,
                            headerShadowVisible: true,
                            headerStyle: {
                                backgroundColor: "#050505",

                            },
                            headerTintColor: "#fff",
                        })}
                    >
                        <Stack.Screen
                            name='Home'
                            component={LanguageSelectScreen}
                            options={({ navigation }) => ({
                                title: "Umeboshi",

                                headerRight: () => (
                                    <Pressable onPress={() => { navigation.navigate("Settings") }} style={{ marginRight: 15 }}>
                                        <Ionicons name="settings-outline" size={24} color="#e6b3ff" />
                                    </Pressable>
                                ),
                            })}
                        />
                        <Stack.Screen
                            name='Japanese'
                            component={JapaneseHomeScreen}
                            options={({ route, navigation }) => ({
                                title: (route.params as { languageLabel?: string } | undefined)?.languageLabel ?? "Umeboshi",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                                headerRight: () => (
                                    <Pressable
                                        onPress={() => { navigation.navigate("Language Settings", route.params) }}
                                        style={{ marginRight: 15 }}
                                    >
                                        <Ionicons name="settings-outline" size={24} color="#e6b3ff" />
                                    </Pressable>
                                ),
                            })}
                        />
                        <Stack.Screen
                            name='Language Settings'
                            component={LanguageSettingsScreen}
                            options={({ route }) => ({
                                title: `${(route.params as { languageLabel?: string } | undefined)?.languageLabel ?? "Language"} Settings`,
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            })}
                        />
                        <Stack.Screen
                            name='Manage Languages'
                            component={ManageLanguagesScreen}
                            options={{
                                title: "Manage Languages",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            }}
                        />
                        <Stack.Screen
                            name='Settings'
                            component={SettingsScreen}
                            options={{
                                title: "Settings",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            }}
                        />

                        <Stack.Screen
                            name='Card List'
                            component={CardListScreen}
                            options={{
                                title: "Card List",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            }}
                        />

                        <Stack.Screen
                            name='Edit Card'
                            component={CardEditScreen}
                            options={({ route }) => ({
                                title: (route.params as { cardKey?: string } | undefined)?.cardKey ? "Edit Card" : "New Card",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            })}
                        />

                        <Stack.Screen
                            name='Review'
                            component={ReviewScreen}
                            options={({ route }) => ({
                                title: `${(route.params as { languageLabel?: string } | undefined)?.languageLabel ?? ""} Review`.trim(),
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            })}
                        />

                        <Stack.Screen
                            name='Extra Review'
                            component={ExtraReviewScreen}
                            options={({ route }) => {
                                const params = route.params as { languageLabel?: string; mode?: "random" | "forgotten" } | undefined;
                                const modeTitle = params?.mode === "forgotten" ? "Forgotten Cards" : "Random Review";
                                return {
                                    title: `${params?.languageLabel ?? ""} ${modeTitle}`.trim(),
                                    headerStyle: { backgroundColor: "#050505" },
                                    headerTintColor: "#fff",
                                };
                            }}
                        />

                        <Stack.Screen
                            name='Add Words'
                            component={AddWordsScreen}
                            options={({ route }) => ({
                                title: `${(route.params as { languageLabel?: string } | undefined)?.languageLabel ?? ""} Add Words`.trim(),
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            })}
                        />

                        <Stack.Screen
                            name='Scan Text'
                            component={ScanTextScreen}
                            options={({ route }) => ({
                                title: `${(route.params as { languageLabel?: string } | undefined)?.languageLabel ?? ""} Scan Text`.trim(),
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            })}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaView>
        </AppContext.Provider>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
