
import { View, Text, Pressable, Alert, NativeModules } from "react-native";
import ScreenWrapper from "~/components/ScreenWrapper";

const { AnkiModule } = NativeModules;

export default function TestScreen() {

    const DebugFunction = async () => {

        try {
            const result = await AnkiModule.addTestNote();
            alert(result);

        } catch (error) {
            console.error("ERROR FETCHING DECKS!", error);
            Alert.alert("ERROR: ");
        }
    }

    // const RequestPermission = async () => {

    //     try {
    //         const result = await AnkiModule.requestPermission();
    //         alert(result);

    //     } catch (error) {
    //         console.error("ERROR FETCHING DECKS!", error);
    //         Alert.alert("ERROR: ");
    //     }
    // }

    return (
        <ScreenWrapper>
            <Text className="text-white">
                Anki Testing
            </Text>
            <Pressable className="bg-purple-500/50 rounded p-2" onPress={DebugFunction}>
                <Text>Add Card</Text>
            </Pressable>

            
        </ScreenWrapper>
    )
}