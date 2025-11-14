
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Pressable, NativeModules, Alert } from 'react-native';
import './global.css';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '~/screens/HomeScreen';
import SettingsScreen from '~/screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { getIsUserSubscribed, getDeviceInfo } from '~/utils/subscriptionMethods';
import VocabListScreen from '~/screens/VocabListScreen';
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
            try {
                await AnkiModule.checkAndRequestPermissions();
            } catch (error: any) {
                console.warn("Failed to check permission on startup");
            }
        })();
    }, [])

    useEffect(() => {
        (async () => {
            try {
                await Purchases.configure({ apiKey: 'goog_YzOjiXxynASmcCsZxbWZrwrQQtQ' });
            } catch (error: any) {
                console.warn("Failed to check permission on startup");
            }
        })();
    }, [])

    useEffect(() => {
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
            <SafeAreaView className='flex-1 bg-black' edges={["bottom", "left", "right"]}>


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
                            component={HomeScreen}
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
                            name='Settings'
                            component={SettingsScreen}
                            options={{
                                title: "Settings",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            }}
                        />

                        <Stack.Screen
                            name='Vocab List'
                            component={VocabListScreen}
                            options={{
                                title: "Vocab List",
                                headerStyle: { backgroundColor: "#050505" },
                                headerTintColor: "#fff",
                            }}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </SafeAreaView>
        </AppContext.Provider>
    );
}
