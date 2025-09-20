import { View, Text } from "react-native";
import { ReactNode } from "react";

export default function ScreenWrapper({children}: {children: ReactNode}) {
    return (
        <View className="flex-1 p-4 bg-[#3b2247]">
            {children}
        </View>
    )
}