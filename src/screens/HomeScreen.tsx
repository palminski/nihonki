import { View, Text, Pressable, Alert, Image, ScrollView, NativeModules, TextInput, ActivityIndicator, ImageBackground } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenWrapper from "~/components/ScreenWrapper";
import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { loadAPIKeySetting } from "~/utils/settingsManager";
import { loadVocabList, updateVocabList } from "~/utils/asyncStorageManager";
import { Ionicons } from "@expo/vector-icons";
import LinearGradient from "react-native-linear-gradient";
import { NavigationProp, useFocusEffect } from "@react-navigation/native";
import VocabCard from "~/components/VocabCard";
import ImageView from "react-native-image-viewing";
import axios from "axios";
import Purchases from "react-native-purchases";
import { getIsUserSubscribed, promptUserSubscription, getDeviceInfo } from "~/utils/subscriptionMethods";
import { translateImage, translateWord } from "~/utils/aiAPICalls";
import { AppContext } from "App";
import UmeboshiChan from "../assets/UmeboshiChan.svg";

export default function HomeScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const [currentRequests, setCurrentRequests] = useState<Record<string, string>>({});

    const [inputText, setInputText] = useState<string>("");

    const [isPictureMode, setIsPictureMode] = useState<boolean>(true);

    const [kanjiObjectArray, setKanjiObjectArray] = useState<Array<any>>([]);

    const [snappedImages, setSnappedImages] = useState<any[]>([]);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const [hasKey, setHasKey] = useState(false);

    const appContext = useContext(AppContext);
    if (!appContext) return null;
    const { userData, setUserData } = appContext;

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const key = await loadAPIKeySetting();
                if (!(key == null || key == "")) {
                    setHasKey(true);
                }
                else {
                    setHasKey(false);
                }
            })();
        }, [])
    )


    const textInputRef = useRef<TextInput>(null);

    async function handleOpenCamera() {

        const key = await loadAPIKeySetting();
        if (userData.imagesRemaining <= 0 && !await getIsUserSubscribed() && (key == null || key == "")) {
            Alert.alert("Setup Required", "To start making cards please go to settings and either purchase a subscription or provide an OpenAI API key.")
            return;
        }

        const cameraRequestId = `Camera_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        setIsPictureMode(true);
        if (permission.status !== 'granted') {
            Alert.alert("You must grant application access to camera to take pictures of text");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.back,
            base64: true,
            quality: 1,
            allowsEditing: true,
            exif: false,
        });
        if (!result.canceled) {
            const asset = result.assets[0];

            setCurrentRequests(prev => ({
                ...prev,
                [cameraRequestId]: asset.uri
            }));

            try {

                let jsonString = "";
                if (key) {
                    jsonString = await translateImage(asset.base64);
                } else {
                    try {
                        const appUserId = userData.appUserId;
                        setUserData(prev => ({
                            ...prev,
                            imagesRemaining: Math.max(0, prev.imagesRemaining - 1),
                        }));
                        const response = await axios.post(
                            // Hard Coding While Testing
                            // `http://10.0.0.187:8000/api/ai_translation/image`,
                            `https://nihonki-server-udaaiuh2.on-forge.com/api/ai_translation/image`,
                            { imageBase64: asset.base64, appUserId: appUserId },
                            {});
                        jsonString = response.data.message;
                    } catch (error: any) {
                        setUserData(prev => ({
                            ...prev,
                            imagesRemaining: prev.imagesRemaining + 1,
                        }));
                        throw error;
                    }
                }

                setCurrentRequests(prev => {
                    const { [cameraRequestId]: _, ...rest } = prev
                    return rest
                });
                setSnappedImages(prevItems => [{ uri: asset.uri }, ...prevItems])


                let cardObjectArray = [];

                if (jsonString) {
                    cardObjectArray = JSON.parse(jsonString);
                }
                if (!Array.isArray(cardObjectArray)) {
                    return;
                }

                let vocabList = await loadVocabList()
                cardObjectArray.forEach(cardObject => {
                    const { valid, missing } = ValidateCardData(cardObject);
                    if (!valid) {
                        return;
                    }
                    vocabList[cardObject.kanji + "_" + cardObject.kana] = cardObject;
                });
                await updateVocabList(vocabList);


                setKanjiObjectArray(prev => {
                    const filteredPrev = prev.filter(
                        kanjiObjectArray => !cardObjectArray.some(cardObject => cardObject.kanji === kanjiObjectArray.kanji)
                    );
                    return [...cardObjectArray, ...filteredPrev]
                });

            } catch (error: any) {
                setCurrentRequests(prev => {
                    const { [cameraRequestId]: _, ...rest } = prev
                    return rest
                });
                alert(error?.message);
            }
        }
    }

    const handleTextSubmit = async (textToSend: string) => {
        setIsPictureMode(true);

        if (textToSend == null || textToSend == "") return;

        const key = await loadAPIKeySetting();
        if (userData.wordsRemaining <= 0 && !await getIsUserSubscribed() && (key == null || key == "")) {
            Alert.alert("Setup Required", "To start making cards please go to settings and either purchase a subscription or provide an OpenAI API key.")
            return;
        }

        try {
            setInputText("");
            setCurrentRequests(prev => ({
                ...prev,
                [textToSend]: "text"
            }));

            let jsonString = "";

            // Make request from app or from server depending on if user input a key
            if (key) {
                jsonString = await translateWord(textToSend);
            } else {
                try {
                    const appUserId = userData.appUserId;
                    setUserData(prev => ({
                        ...prev,
                        wordsRemaining: Math.max(0, prev.wordsRemaining - 1),
                    }));
                    const response = await axios.post(
                        // `http://10.0.0.187:8000/api/ai_translation/single_word`,
                        `https://nihonki-server-udaaiuh2.on-forge.com/api/ai_translation/single_word`,
                        { wordToTranslate: textToSend, appUserId: appUserId },
                        {});
                    jsonString = response.data.message;
                } catch (error: any) {
                    setUserData(prev => ({
                        ...prev,
                        wordsRemaining: prev.wordsRemaining + 1,
                    }));
                    throw error;
                }
            }


            setCurrentRequests(prev => {
                const { [textToSend]: _, ...rest } = prev
                return rest
            });


            if (jsonString !== null) {
                //Validate Response
                const cardObject = JSON.parse(jsonString);
                const { valid, missing } = ValidateCardData(cardObject);
                if (!valid) {
                    Alert.alert("Something was wrong with the response");
                    return;
                }
                //Add Vocab Word To VOcab Word Array
                setKanjiObjectArray(prev => {
                    const filtered = prev.filter(k => k.kanji !== cardObject.kanji);
                    return [cardObject, ...filtered]
                })
                // Update App Vocab List
                let vocabList = await loadVocabList()
                vocabList[cardObject.kanji + "_" + cardObject.kana] = cardObject;
                updateVocabList(vocabList);
            }

        } catch (error: any) {
            setCurrentRequests(prev => {
                const { [textToSend]: _, ...rest } = prev
                return rest
            });
            alert(error?.message);
        }
    }

    const HandleFormChange = async (value: string) => {
        setInputText(value);
    }

    const handleEnterText = async () => {
        const key = await loadAPIKeySetting();
        if (userData.wordsRemaining <= 0 && !await getIsUserSubscribed() && (key == null || key == "")) {
            Alert.alert("Setup Required", "To start making cards please go to settings and either purchase a subscription or provide an OpenAI API key.")
            return;
        }
        setIsPictureMode(false);


        textInputRef.current?.blur();
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 150);
    }

    function ValidateCardData(data: any): { valid: boolean; missing: string[] } {
        let requiredFields = [
            "kanji",
            "kana",
            "furigana",
            "meaning",
            "partOfSpeech",
            "exampleSentenceKanji",
            "exampleSentenceFurigana",
            "exampleSentenceKana",
            "exampleSentenceEnglish"
        ]
        const missing = requiredFields.filter((key) => !(key in data) || data[key] === "");
        return {
            valid: missing.length === 0,
            missing
        }
    }

    return (
        <ScreenWrapper>
            <View className="flex-1 ">

                <ScrollView
                    style={{ flex: 1, zIndex: 15 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    className="p-4"
                >

                    {/* INPUT AND STATUS BOX */}
                    {
                        isPictureMode ?
                            <View className="flex flex-row bg-black rounded min-h-[100px] border mb-2 shadow-lg shadow-purple-300 border-purple-800">
                                <ScrollView horizontal className="">
                                    {
                                        snappedImages.length > 0 ?
                                            snappedImages.map((image, index) => (
                                                <Pressable key={index} onPress={() => { setImageViewerVisible(true); setImageIndex(index) }}>
                                                    <Image source={{ uri: image.uri }} style={{ width: 100, height: 100 }} />

                                                </Pressable>
                                            ))
                                            :
                                            <Text className="text-purple-400/50 text-lg mt-auto  pl-3 pb-2">Scanned Images Will Appear Here...</Text>
                                    }
                                    <ImageView
                                        images={snappedImages}
                                        imageIndex={imageIndex}
                                        visible={imageViewerVisible}
                                        onRequestClose={() => setImageViewerVisible(false)}
                                    />
                                </ScrollView>
                            </View>
                            :
                            <View className="flex flex-row bg-black rounded min-h-[100px] border mb-2 shadow-lg shadow-purple-300 border-purple-800">
                                <View className="border border-r-purple-600 w-full flex flex-row">
                                    <TextInput onSubmitEditing={() => handleTextSubmit(inputText)} ref={textInputRef} className='border text-lg text-purple-300 placeholder:text-purple-300/50 rounded m-2 flex-1' value={inputText} onChangeText={(text) => HandleFormChange(text)} placeholder='言葉こちら' />
                                    <View className="flex justify-end">
                                        <Pressable onPress={() => handleTextSubmit(inputText)} className="m-2 border p-2 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                            <Text className=" text-white">Submit</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                    }


                    {

                        Object.entries(currentRequests).map(([key, value]) => (
                            <View key={key} className="my-2  shadow-purple-800 border border-purple-300 p-3 bg-black/20  rounded">
                                <View className="flex flex-row justify-start items-center ">
                                    <View>
                                        <ActivityIndicator size={50} color={'#A855F7'} />
                                    </View>
                                    <View className="mx-auto">
                                        {
                                            value === "text" ?
                                                <Text className="text-purple-300 text-lg">Loading Request For <Text className="font-semibold">{key}</Text></Text>
                                                :
                                                <Text className="text-purple-300 text-lg">Loading Image</Text>
                                        }
                                    </View>
                                    {
                                        (value !== "text") && <Image className="rounded border border-purple-800" source={{ uri: value }} style={{ width: 100, height: 100 }} />
                                    }

                                </View>
                            </View>
                        ))
                    }



                    {/* Kanji List */}
                    {
                        (kanjiObjectArray.length > 0 || Object.entries(currentRequests).length > 0) ?
                            <>
                                {kanjiObjectArray.map((kanji: any, index: number) => (
                                    <View key={kanji.kanji}>
                                        <VocabCard vocabWord={kanji} />
                                    </View>
                                ))}
                            </>
                            :
                            <View>
                                <Text className="mt-6 text-xl font-semibold text-purple-300/50 mx-auto">Translated Words Will Appear Here</Text>
                            </View>
                    }

                    {/* Comment In To See Test Vocab Card */}
                    {/* <View className="my-2 shadow-lg shadow-purple-800 border border-purple-500 p-3 bg-purple-950  rounded">
                        <View className="flex flex-row justify-between items-end ">
                            <Pressable className="flex-1 mr-2">
                                <Text className="text-purple-300 mb-1">
                                    <Text className="text-2xl text-purple-200">TEST CARD</Text> - <Text className="text text-purple-200">[ TEST CARD ]</Text>
                                </Text>
                                <Text className=" text-purple-300 text-sm">
                                    TEST CARD
                                </Text>
                            </Pressable>
                        </View>
                    </View> */}


                </ScrollView>
                {/* <Image source={require("../assets/UmeboshiChan2.png")} style={{ width: 200, height: 200, opacity: 0.5, position: "absolute", bottom: 0, zIndex:10 }} /> */}
                <UmeboshiChan width={200} height={200} style={{position: "absolute", bottom: 0, left:15, zIndex:10}}></UmeboshiChan>

                <LinearGradient
                    style={{ position: 'absolute', bottom: 0, width: "100%", height: 50, zIndex: 20 }}
                    colors={['#52525200', '#000000']}
                    pointerEvents={'none'}
                />

            </View>
            {/* Bottom Menu */}
            <View className="relative bg-transparent">
                <View className="flex-row justify-around items-end py-1 bg-[#000000]">
                    <Pressable onPress={() => { navigation.navigate("Vocab List") }} className="items-center w-1/3">
                        <Ionicons name="list" size={30} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Vocab List</Text>
                    </Pressable>
                    <View className="items-center w-1/3 relative">
                        <Pressable onPress={handleOpenCamera} className="">
                            <Ionicons name="camera" size={50} color={"#fff"} />
                            {(userData.appUserId && !userData.isSubscribed && !hasKey) &&
                                <View className="absolute -top-1 -right-3 bg-purple-400 rounded-full w-7 h-7 items-center justify-center shadow">
                                    <Text className="font-bold">{userData.imagesRemaining}</Text>
                                </View>
                            }

                        </Pressable>
                        <Text className="text-white text-xs mt-1">Scan Text</Text>
                    </View>
                    <View className="items-center w-1/3 relative">
                        <Pressable onPress={handleEnterText}>
                            <Ionicons name="create-outline" size={30} color={"#fff"} />
                            {(userData.appUserId && !userData.isSubscribed && !hasKey) &&
                                <View className="absolute -top-1 -right-2 bg-purple-400 rounded-full w-5 h-5 items-center justify-center shadow">
                                    <Text className="font-bold text-sm">{userData.wordsRemaining}</Text>
                                </View>
                            }
                        </Pressable>
                        <Text className="text-white text-xs mt-1">Enter Word</Text>
                    </View>
                </View>
            </View>

        </ScreenWrapper>
    )
}