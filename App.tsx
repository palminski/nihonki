
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Pressable, NativeModules } from 'react-native';
import './global.css';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '~/screens/HomeScreen';
import SettingsScreen from '~/screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VocabListScreen from '~/screens/VocabListScreen';
import { useEffect } from 'react';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {

    const { AnkiModule } = NativeModules;

    useEffect(() => {
        (async () => {
            try {
                await AnkiModule.checkAndRequestPermissions();
            } catch (error: any) {
                console.warn("Failed to check permission on startup");
            }
        })();
    }, [])

    return (
        <>
            <StatusBar style='light' backgroundColor='#050505' translucent={false}></StatusBar>
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
                            title: "Nihonki",

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
        </>
    );
}
