import { useCallback, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";
import { NavigationProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import UmeboshiChan from "../assets/UmeboshiChan.svg";
import { getDueCounts, DueCounts } from "~/utils/srsManager";

const EMPTY_DUE_COUNTS: DueCounts = { newCount: 0, learningCount: 0, reviewCount: 0 };

export default function JapaneseHomeScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const route = useRoute();
    const { languageId = "japanese", languageLabel } = (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};

    const [dueCounts, setDueCounts] = useState<DueCounts>(EMPTY_DUE_COUNTS);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setDueCounts(await getDueCounts(languageId));
            })();
        }, [languageId])
    );

    return (
        <ScreenWrapper>
            <View className="flex-1 items-center justify-center px-4">
                <UmeboshiChan width={160} height={160} style={{ marginBottom: 16 }} />

                <View className="flex-row items-center justify-center bg-black rounded border border-purple-800 px-4 py-2 mb-6">
                    <View className="items-center mx-3">
                        <Text className="text-blue-400 font-semibold text-lg">{dueCounts.newCount}</Text>
                        <Text className="text-purple-300/50 text-xs">New</Text>
                    </View>
                    <View className="items-center mx-3">
                        <Text className="text-red-400 font-semibold text-lg">{dueCounts.learningCount}</Text>
                        <Text className="text-purple-300/50 text-xs">Learning</Text>
                    </View>
                    <View className="items-center mx-3">
                        <Text className="text-green-400 font-semibold text-lg">{dueCounts.reviewCount}</Text>
                        <Text className="text-purple-300/50 text-xs">Review</Text>
                    </View>
                </View>

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
