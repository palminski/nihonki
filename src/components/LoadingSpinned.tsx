import { View, Text } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function LoadingSpinner() {

    const rotateValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start()
    }, [rotateValue]);

    const rotate = rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View className="items-center justify-center h-20 w-20">
<Animated.View
            style={{
                transform: [{ rotate }]
            }}>
            <Ionicons className="ml-2" name="refresh-outline" size={50} color={"#C084FC"} />

        </Animated.View>
        </View>
        

    )
}

var styles = StyleSheet.create({

});