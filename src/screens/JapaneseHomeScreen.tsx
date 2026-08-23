import { View, Text, Pressable } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { NavigationProp, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import UmeboshiChan from "../assets/UmeboshiChan.svg";

export default function JapaneseHomeScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const route = useRoute();
    const { languageId, languageLabel } = (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};

    return (
        <ScreenWrapper>
            <View className="flex-1 items-center justify-center px-4">
                <UmeboshiChan width={160} height={160} style={{ marginBottom: 24 }} />

                <View className="flex-row w-full justify-around">
                    <Pressable onPress={() => navigation.navigate("Card List", { languageId, languageLabel })} className="items-center w-1/3">
                        <View className="border border-purple-800 bg-black rounded-full p-4 shadow-lg shadow-purple-300">
                            <Ionicons name="list" size={30} color="#e6b3ff" />
                        </View>
                        <Text className="text-white text-xs mt-2 text-center">Card List</Text>
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate("Review", { languageId, languageLabel })} className="items-center w-1/3">
                        <View className="border border-purple-800 bg-black rounded-full p-5 shadow-lg shadow-purple-300">
                            <Ionicons name="layers" size={40} color="#e6b3ff" />
                        </View>
                        <Text className="text-white text-xs mt-2 text-center">Review</Text>
                    </Pressable>

                    <Pressable onPress={() => navigation.navigate("Add Words", { languageId, languageLabel })} className="items-center w-1/3">
                        <View className="border border-purple-800 bg-black rounded-full p-4 shadow-lg shadow-purple-300">
                            <Ionicons name="add-circle-outline" size={30} color="#e6b3ff" />
                        </View>
                        <Text className="text-white text-xs mt-2 text-center">Add Words</Text>
                    </Pressable>
                </View>
            </View>
        </ScreenWrapper>
    );
}
