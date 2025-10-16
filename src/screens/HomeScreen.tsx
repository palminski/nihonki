import { View, Text, Pressable, Alert, Image, ScrollView, NativeModules, TextInput, ActivityIndicator } from "react-native";
import { systemInstructionText, imageInstructionText, generateInstructionsForWord } from "~/utils/aiInstructions";
import * as ImagePicker from "expo-image-picker";
import ScreenWrapper from "~/components/ScreenWrapper";
import { useState, useRef } from "react";
import { loadDeckSetting, loadAPIKeySetting } from "~/utils/settingsManager";
import { loadVocabList, updateVocabList } from "~/utils/asyncStorageManager";
import OpenAI from "openai";
import { Ionicons } from "@expo/vector-icons";
import LinearGradient from "react-native-linear-gradient";
import { NavigationProp } from "@react-navigation/native";
import VocabCard from "~/components/VocabCard";
import ImageView from "react-native-image-viewing";
import axios from "axios";


export default function HomeScreen({ navigation }: { navigation: NavigationProp<any> }) {

    const { AnkiModule } = NativeModules;

    const [currentRequests, setCurrentRequests] = useState<Record<string, string>>({});

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [inputText, setInputText] = useState<string>("");

    const [isPictureMode, setIsPictureMode] = useState<boolean>(true);

    const [operationResponse, setOperationRespone] = useState<any>(null);
    const [kanjiObjectArray, setKanjiObjectArray] = useState<Array<any>>([]);
    const [addedKanjiMap, setAddedKanjiMap] = useState<Record<string, boolean>>({});

    const [snappedImages, setSnappedImages] = useState<any[]>([]);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const textInputRef = useRef<TextInput>(null);

    async function handleOpenCamera() {

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
            allowsEditing: false,
            exif: false,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            setImageUri(asset.uri);

            const key = await loadAPIKeySetting();
            if (key == null || key == "") {
                // setOperationRespone(`An API key is required`);
                // return;
            };

            setCurrentRequests(prev => ({
                ...prev,
                [cameraRequestId]: asset.uri
            }));

            try {
                const response = await axios.post(
                // Hard Coding While Testing
                `http://10.0.0.187:8000/api/ai_translation/image`,
                {imageBase64: asset.base64},
                {});

                setCurrentRequests(prev => {
                    const { [cameraRequestId]: _, ...rest } = prev
                    return rest
                });
                setSnappedImages(prevItems => [{uri: asset.uri}, ...prevItems])

                const jsonString = response.data.message;
                
                let cardObjectArray = [];

                if (jsonString) {
                    cardObjectArray = JSON.parse(jsonString);
                }
                if (!Array.isArray(cardObjectArray)) {
                    setOperationRespone(`AI call resulted in response that was not a JSON array ${jsonString}`);
                    return;
                }
                setOperationRespone("Complete!");

                let vocabList = await loadVocabList()
                cardObjectArray.forEach(cardObject => {
                    const { valid, missing } = ValidateCardData(cardObject);
                    if (!valid) {
                        setOperationRespone(`There was an issue getting card data. Please Try Again. Response:${jsonString}`);
                        return;
                    }
                    vocabList[cardObject.kanji] = cardObject;
                });
                await updateVocabList(vocabList);

                
                setKanjiObjectArray(prev => {
                    const filteredPrev = prev.filter(
                        kanjiObjectArray => !cardObjectArray.some(cardObject => cardObject.kanji === kanjiObjectArray.kanji)
                    );
                    return [...cardObjectArray, ...filteredPrev]
                });

            } catch (error: any) {
                // setOperationRespone("ERROR");
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
        
        
        //Handle Provided Key Here Later
        const key = await loadAPIKeySetting();
        if (key == null || key == "") {
            // setOperationRespone(`An API key is required`);
            // return;
        };

        try {
            setInputText("");
            setCurrentRequests(prev => ({
                ...prev,
                [textToSend]: "text"
            }));

            const response = await axios.post(
                // Hard Coding While Testing
                `http://10.0.0.187:8000/api/ai_translation/single_word`,
                {wordToTranslate: textToSend},
                {});

            setCurrentRequests(prev => {
                const { [textToSend]: _, ...rest } = prev
                return rest
            });

            const jsonString = response.data.message;

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
                vocabList[cardObject.kanji] = cardObject;
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

    const handleEnterText = () => {
        setIsPictureMode(false);

        setTimeout(() => {
            textInputRef.current?.focus();
        }, 1)
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
                    style={{ flex: 1 }}
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
                                        snappedImages.reverse().map((image, index) => (
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
                                <View className="border border-r-purple-600">
                                    <TextInput onSubmitEditing={() => handleTextSubmit(inputText)} ref={textInputRef} className='border border-purple-600 text-lg text-purple-300 placeholder:text-purple-300/50 rounded m-2' value={inputText} onChangeText={(text) => HandleFormChange(text)} placeholder='言葉こちら' />
                                    <Pressable onPress={() => handleTextSubmit(inputText)} className="m-2 border p-2 bg-purple-800 border-purple-600 rounded flex-row items-center">
                                        <Text className=" text-white">Submit Word</Text>
                                    </Pressable>
                                </View>
                                <View className="p-2 flex-1">
                                    <Text className="text-purple-300">{operationResponse ?? "Awaiting Action"}</Text>
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
                    {kanjiObjectArray.map((kanji: any, index: number) => (
                        <View key={kanji.kanji}>
                            <VocabCard vocabWord={kanji} />
                        </View>
                    ))}

                </ScrollView>
                <LinearGradient
                    style={{ position: 'absolute', bottom: 0, width: "100%", height: 50 }}
                    colors={['#52525200', '#050505']}
                    pointerEvents={'none'}
                />
            </View>
            {/* Bottom Menu */}
            <View className="relative bg-transparent">
                <View className="flex-row justify-around items-end py-1 bg-[#050505]">
                    <Pressable onPress={() => { navigation.navigate("Vocab List") }} className="items-center w-1/3">
                        <Ionicons name="list" size={30} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Vocab List</Text>
                    </Pressable>
                    <Pressable onPress={handleOpenCamera} className="items-center w-1/3">
                        <Ionicons name="camera" size={50} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Scan Text</Text>
                    </Pressable>
                    <Pressable onPress={handleEnterText} className="items-center w-1/3">
                        <Ionicons name="create-outline" size={30} color={"#fff"} />
                        <Text className="text-white text-xs mt-1">Enter Word</Text>
                    </Pressable>
                </View>
            </View>

        </ScreenWrapper>
    )
}