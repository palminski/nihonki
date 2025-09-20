
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

                            if (route.name === "Home") iconName = "home";
                            if (route.name === "Testing") iconName = "flask";
                            if (route.name === "Settings") iconName = "settings";

                            return <Ionicons name={iconName} size={size} color={color} />
                        },

                    })}
                >
                    <Tab.Screen name="Home" component={HomeScreen} />
                    <Tab.Screen name='Testing' component={TestScreen} />
                    <Tab.Screen name='Settings' component={SettingsScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </>
    );
}
