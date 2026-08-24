import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet } from "react-native";

export default function ScreenWrapper({ children }: { children: ReactNode }) {
    return (
        <LinearGradient colors={['#2c0042', '#220a2e', '#050505']} style={styles.gradient}>
            <View style={styles.topShadowStrip}></View>
            {children}
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        backgroundColor: '#112233',
    },
    topShadowStrip: {
        width: '100%',
        shadowColor: '#d8b4fe',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        borderColor: '#6b21a8',
    },
});
