import { View, Text, Pressable, TextInput, Alert } from "react-native";
import { useEffect, useState } from "react";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadDeckSetting, updateDeckSetting } from "~/utils/settingsManager";

export default function SettingsScreen() {

    const [loading, setLoading] = useState(false);

    const [deckName, setDeckName] = useState("");

    useEffect(() => {
        setLoading(true);
        loadDeckSetting().then((savedName) => {
            if(savedName != null) setDeckName(savedName);
            setLoading(false);
        })
    }, []);

    const HandleFormChange = async (value: string) => {
        setDeckName(value);
    }

    const handleUpdateDeckNameSetting = async () => {
        await updateDeckSetting(deckName);
        Alert.alert("UPDATED!");
    }

    return (
        <ScreenWrapper>
                    <Text className="text-white text-2xl">
                        Deck To Insert Into
                    </Text>
        
                    <TextInput className='bg-white text-3xl placeholder:text-gray-300 my-1 rounded mb-2' value={deckName} onChangeText={(text) => HandleFormChange(text)} placeholder='DEV DECK' />
                    {
                        loading ?
                            <>
                                <Pressable className="bg-purple-500/50 rounded p-2 mb-5">
                                    <Text className="text-3xl text-white">Loading...</Text>
                                </Pressable>
                            </>
                            :
                            <>
                                <Pressable className="bg-purple-500/50 rounded p-2 mb-5" onPress={handleUpdateDeckNameSetting}>
                                    <Text className="text-3xl text-white">Update Default Deck</Text>
                                </Pressable>
                            </>
                    }
        
        
        
                </ScreenWrapper>
    )
}