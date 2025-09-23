
import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';

import './global.css';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '~/screens/HomeScreen';
import TestScreen from '~/screens/TestScreen';
import SettingsScreen from '~/screens/SettingsScreen';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function App() {
    

    
    return (
        <>
            <StatusBar style='light'></StatusBar>
            <NavigationContainer>
                <Tab.Navigator
                    screenOptions={({ route }) => ({
                        headerShown: true,
                        headerStyle: { backgroundColor: "#112" },
                        headerTintColor: "#fff",
                        tabBarStyle: { backgroundColor: "#112" },
                        tabBarActiveTintColor: "#b84beb",
                        tabBarIcon: ({ color, size }) => {
                            let iconName: keyof typeof Ionicons.glyphMap = "home";

                            if (route.name === "ホーム") iconName = "home";
                            if (route.name === "テスト") iconName = "flask";
                            if (route.name === "設定") iconName = "settings";

                            return <Ionicons name={iconName} size={size} color={color} />
                        },

                    })}
                >
                    <Tab.Screen name="ホーム" component={HomeScreen} />
                    <Tab.Screen name='テスト' component={TestScreen} />
                    <Tab.Screen name='設定' component={SettingsScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </>
    );
}
