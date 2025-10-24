import { View, Text, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, NativeModules, Linking } from "react-native";
import { useEffect, useState, useCallback } from "react";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadDeckSetting, updateDeckSetting, loadAPIKeySetting, updateAPIKeySetting } from "~/utils/settingsManager";
import { useFocusEffect } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { loadVocabList } from "~/utils/asyncStorageManager";
import axios from "axios";
import Purchases from 'react-native-purchases';
import { attemptToResoreSubscription, getIsUserSubscribed, promptUserSubscription } from "~/utils/subscriptionMethods";

export default function SettingsScreen() {

    const [loading, setLoading] = useState(false);

    const [debugResponse, setDebugResponse] = useState("");

    const [settingForm, setSettingsForm] = useState({
        insertDeck: "",
        apiKey: ""
    });

    const [isSubscribed, setIsSubscribed] = useState(true);

    const { AnkiModule } = NativeModules;

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);

                const deckSetting = await loadDeckSetting();
                const apiKeySetting = await loadAPIKeySetting();
                setSettingsForm({
                    ...settingForm,
                    insertDeck: deckSetting != null ? deckSetting : "",
                    apiKey: apiKeySetting != null ? apiKeySetting : "",
                });

                if (!await getIsUserSubscribed()) {
                    setIsSubscribed(false);
                }

                setLoading(false);
            })();
        }, [])
    )

    const handleFormChange = (key: string, value: string) => {
        setSettingsForm({
            ...settingForm,
            [key]: value,
        })
    }

    const handleFormSubmit = async () => {
        if (loading) return;
        setLoading(true);
        await updateAPIKeySetting(settingForm.apiKey);
        await updateDeckSetting(settingForm.insertDeck);
        setLoading(false);
        Alert.alert("Setting Saved!")
    }

    const debug = async () => {
        if (!__DEV__) {
            Alert.alert("Can't access purchases yet.", "Purchases are currently only set up on development build. Please use API key");

        }
        try {
            promptUserSubscription();
            setLoading(false);
        } catch (error: any) {
            setLoading(false);
            Alert.alert(error?.message ? error.message : "ERROR");
        }
    }

    const purchaseSubscription = async () => {
        if (!__DEV__) {
            Alert.alert("Can't access purchases yet.", "Purchases are currently only set up on development build. Please use API key");

        }
        let userSubscribed = await promptUserSubscription();
        setIsSubscribed(userSubscribed);
    }

    const restorePurchase = async () => {
        if (!__DEV__) {
            Alert.alert("Can't access purchases yet.", "Purchases are currently only set up on development build. Please use API key");

        }
        let userSubscribed = await attemptToResoreSubscription();
        setIsSubscribed(userSubscribed);
    }

    return (
        <ScreenWrapper>
            <View className="flex-1">
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    className="p-4"
                >

                    <View className="mb-3">
                        <View className="flex-row items-center">
                            <Text className="text-white text-lg mr-2">
                                Anki Deck To Insert Into
                            </Text>
                            <Pressable onPress={() => Alert.alert("Anki Deck To Insert Into", "When send to anki is clicked this is the deck new cards will be inserted into. If no deck with the given name exists a new one will be made. If no text is entered here it will default to Umeboshi")} className="items-center">
                                <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                            </Pressable>
                        </View>
                        <TextInput className='bg-black border mb-2 shadow-lg shadow-purple-300 border-purple-800 my-1 rounded text-purple-300 placeholder:text-purple-300/50' value={settingForm.insertDeck} onChangeText={(text) => handleFormChange('insertDeck', text)} placeholder='Deck Name (Defaults to Umeboshi)' />
                    </View>

                    <View className="mb-3">

                        <View className="flex-row items-center">
                            <Text className="text-white text-lg mr-2">
                                OpenAi API Key
                            </Text>
                            <Pressable onPress={() => Alert.alert("OpenAi API Key", "If you have your own API key for open AI you can use it instead of a subscription. Your key is never sent to our servers. It is stored on your device and used to communicate with OpenAi directly.")} className="items-center">
                                <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                            </Pressable>
                        </View>


                        <TextInput secureTextEntry={true} className='bg-black border mb-2 shadow-lg shadow-purple-300 border-purple-800 my-1 rounded text-purple-300 placeholder:text-purple-300/50' value={settingForm.apiKey} onChangeText={(text) => handleFormChange('apiKey', text)} placeholder='Personal Api Key' />
                    </View>


                    {
                        !isSubscribed ?
                            <>
                                <View className="mx-auto mb-3">
                                    <Ionicons name="ellipsis-horizontal-outline" size={50} color={"#fff"} />
                                </View>

                                <View className="mb-6">
                                    <Pressable onPress={() => purchaseSubscription()} className="border p-3 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                        <Text className="mx-auto text-white">Purchase Subscription ($5.99 / month)</Text>
                                    </Pressable>
                                </View>

                                <View className="mb-3">
                                    <Pressable onPress={() => restorePurchase()} className="border p-3 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                        <Text className="mx-auto text-white">Restore Purchase</Text>
                                    </Pressable>
                                </View>
                            </>
                            :
                            <>
                                {
                                    !loading &&
                                    <View className="mb-3">
                                        <Text className="text-purple-400 text-lg">
                                            You are currently subscribed!
                                        </Text>

                                        <Pressable onPress={() => Linking.openURL("https://play.google.com/store/account/subscriptions")}>
                                            <Text className="underline text-purple-400 text-lg">Manage Subscriptions Here!</Text>
                                        </Pressable>
                                    </View>
                                }
                            </>
                    }



                    {
                        debugResponse &&
                        <Text className="text-white">
                            Debug Response:{'\n'}
                            {debugResponse}
                        </Text>
                    }


                </ScrollView>
                <LinearGradient
                    style={{ position: 'absolute', bottom: 0, width: "100%", height: 50 }}
                    colors={['#52525200', '#050505']}
                    pointerEvents={'none'}
                />
            </View>
            <View className="relative bg-transparent">
                <View className="flex-row justify-around items-end py-1 bg-[#050505]">
                    <Pressable className="items-center w-1/3">
                        {/* <Ionicons name="list" size={30} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Vocab List</Text> */}
                    </Pressable>
                    <Pressable onPress={handleFormSubmit} className="items-center w-1/3">
                        <Ionicons name="save-outline" size={50} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Save Settings</Text>
                    </Pressable>
                    <Pressable onPress={debug} className="items-center w-1/3">
                        <Ionicons name="bug-outline" size={30} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Debug</Text>
                    </Pressable>
                </View>
            </View>



            {
                loading &&
                <View className="w-full h-full absolute bg-black/20 flex items-center justify-center">
                    <ActivityIndicator size={50} color={'#A855F7'} />
                </View>
            }

        </ScreenWrapper>
    )
}