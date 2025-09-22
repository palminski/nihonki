import { View, Text, Pressable, Alert } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";

export default function TestScreen() {

    const DebugFunction = () =>
    {
        Alert.alert("button pressed!");
    }

    return (
        <ScreenWrapper>
            <Text className="text-white">
                Anki Testing
            </Text>
            <Pressable className="bg-purple-900 rounded p-2" onPress={DebugFunction}>
                <Text>Click Here</Text>
            </Pressable>
        </ScreenWrapper>
    )
}