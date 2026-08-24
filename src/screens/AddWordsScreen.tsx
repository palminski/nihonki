import { View, Text, Pressable, Alert, Image, ScrollView, NativeModules, TextInput, ActivityIndicator, ImageBackground, Platform, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenWrapper from "~/components/ScreenWrapper";
import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { loadAPIKeySetting } from "~/utils/settingsManager";
import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useFocusEffect, useRoute } from "@react-navigation/native";
import VocabCard from "~/components/VocabCard";
import ImageView from "react-native-image-viewing";
import axios from "axios";
import Purchases from "react-native-purchases";
import { getIsUserSubscribed, promptUserSubscription, getDeviceInfo } from "~/utils/subscriptionMethods";
import { translateImage, translateWord, translateWordGeneric, translateWordRomanized } from "~/utils/aiAPICalls";
import { getRequiredCardFields, getCardShape, getRomanizationSystem } from "~/utils/cardTypes";
import { getCardKey } from "~/utils/deckManager";
import { AppContext } from "App";
import UmeboshiChan from "../assets/UmeboshiChan.svg";
import { colors, withOpacity } from "~/utils/colors";

// Subscriptions aren't wired up on iOS yet, so don't point users at an option that isn't there.
const SETUP_REQUIRED_MESSAGE = Platform.OS === 'android'
    ? "To start making cards please go to settings and either purchase a subscription or provide an OpenAI API key."
    : "To start making cards please go to settings and provide an OpenAI API key.";

export default function AddWordsScreen({ navigation }: { navigation: NavigationProp<any> }) {
    const route = useRoute();
    const { languageId = "japanese", languageLabel = "Japanese" } =
        (route.params as { languageId?: string; languageLabel?: string } | undefined) ?? {};
    const isJapanese = languageId === "japanese";
    const cardShape = getCardShape(languageId);
    const romanizationSystem = getRomanizationSystem(languageId);

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
            Alert.alert("Setup Required", SETUP_REQUIRED_MESSAGE)
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

                cardObjectArray.forEach(cardObject => {
                    cardObject.languageId = "japanese";
                });

                setKanjiObjectArray(prev => {
                    const filteredPrev = prev.filter(
                        kanjiObjectArray => !cardObjectArray.some(cardObject => getCardKey(cardObject) === getCardKey(kanjiObjectArray))
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
            Alert.alert("Setup Required", SETUP_REQUIRED_MESSAGE)
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
                if (isJapanese) {
                    jsonString = await translateWord(textToSend);
                } else if (cardShape === "romanized") {
                    jsonString = await translateWordRomanized(textToSend, languageLabel, romanizationSystem);
                } else {
                    jsonString = await translateWordGeneric(textToSend, languageLabel);
                }
            } else {
                try {
                    const appUserId = userData.appUserId;
                    setUserData(prev => ({
                        ...prev,
                        wordsRemaining: Math.max(0, prev.wordsRemaining - 1),
                    }));
                    const response = isJapanese
                        ? await axios.post(
                            `https://nihonki-server-udaaiuh2.on-forge.com/api/ai_translation/single_word`,
                            { wordToTranslate: textToSend, appUserId: appUserId },
                            {})
                        : cardShape === "romanized"
                            ? await axios.post(
                                `https://nihonki-server-udaaiuh2.on-forge.com/api/v2/ai_translation/single_word_romanized`,
                                { wordToTranslate: textToSend, appUserId: appUserId, targetLanguage: languageLabel, romanizationSystem: romanizationSystem },
                                {})
                            : await axios.post(
                                `https://nihonki-server-udaaiuh2.on-forge.com/api/v2/ai_translation/single_word`,
                                { wordToTranslate: textToSend, appUserId: appUserId, targetLanguage: languageLabel },
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
                cardObject.languageId = languageId;
                const { valid, missing } = ValidateCardData(cardObject);
                if (!valid) {
                    Alert.alert("Something was wrong with the response");
                    return;
                }
                //Add Vocab Word To VOcab Word Array
                setKanjiObjectArray(prev => {
                    const filtered = prev.filter(k => getCardKey(k) !== getCardKey(cardObject));
                    return [cardObject, ...filtered]
                })
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
            Alert.alert("Setup Required", SETUP_REQUIRED_MESSAGE)
            return;
        }
        setIsPictureMode(false);


        textInputRef.current?.blur();
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 150);
    }

    function ValidateCardData(data: any): { valid: boolean; missing: string[] } {
        const requiredFields = getRequiredCardFields(data.languageId ?? languageId);
        const missing = requiredFields.filter((key) => !(key in data) || data[key] === "");
        return {
            valid: missing.length === 0,
            missing
        }
    }

    return (
        <ScreenWrapper>
            <View style={{ flex: 1 }}>

                <ScrollView
                    style={{ flex: 1, zIndex: 15 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >

                    {/* INPUT AND STATUS BOX */}
                    {
                        isPictureMode ?
                            <View style={styles.inputBox}>
                                <ScrollView horizontal>
                                    {
                                        snappedImages.length > 0 ?
                                            snappedImages.map((image, index) => (
                                                <Pressable key={index} onPress={() => { setImageViewerVisible(true); setImageIndex(index) }}>
                                                    <Image source={{ uri: image.uri }} style={{ width: 100, height: 100 }} />

                                                </Pressable>
                                            ))
                                            :
                                            <Text style={styles.placeholderText}>Scanned Images Will Appear Here...</Text>
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
                            <View style={styles.inputBox}>
                                <View style={styles.textEntryRow}>
                                    <TextInput
                                        onSubmitEditing={() => handleTextSubmit(inputText)}
                                        ref={textInputRef}
                                        style={styles.textEntryInput}
                                        placeholderTextColor={withOpacity(colors.purple300, 0.5)}
                                        value={inputText}
                                        onChangeText={(text) => HandleFormChange(text)}
                                        placeholder='言葉こちら'
                                    />
                                    <View style={{ justifyContent: 'flex-end' }}>
                                        <Pressable onPress={() => handleTextSubmit(inputText)} style={styles.submitButton}>
                                            <Text style={{ color: colors.white }}>Submit</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                    }


                    {

                        Object.entries(currentRequests).map(([key, value]) => (
                            <View key={key} style={styles.requestCard}>
                                <View style={styles.requestCardRow}>
                                    <View>
                                        <ActivityIndicator size={50} color={'#A855F7'} />
                                    </View>
                                    <View style={{ marginHorizontal: 'auto' }}>
                                        {
                                            value === "text" ?
                                                <Text style={styles.requestText}>Loading Request For <Text style={{ fontWeight: '600' }}>{key}</Text></Text>
                                                :
                                                <Text style={styles.requestText}>Loading Image</Text>
                                        }
                                    </View>
                                    {
                                        (value !== "text") && <Image style={styles.requestImage} source={{ uri: value }} />
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
                                    <View key={getCardKey(kanji)}>
                                        <VocabCard vocabWord={kanji} languageId={languageId} />
                                    </View>
                                ))}
                            </>
                            :
                            <View>
                                <Text style={styles.emptyStateText}>Translated Words Will Appear Here</Text>
                            </View>
                    }

                </ScrollView>
                <UmeboshiChan width={200} height={200} style={{ position: "absolute", bottom: 0, left: 15, zIndex: 10 }}></UmeboshiChan>

            </View>
            {/* Bottom Menu */}
            <View style={{ backgroundColor: 'transparent' }}>
                <View style={styles.bottomBar}>

                    {isJapanese &&
                        <View style={styles.bottomBarButton}>
                            <Pressable onPress={handleOpenCamera}>
                                <Ionicons name="camera" size={50} color={"#fff"} />
                                {(userData.appUserId && !userData.isSubscribed && !hasKey) &&
                                    <View style={[styles.badge, { top: -4, right: -12, width: 28, height: 28 }]}>
                                        <Text style={styles.badgeText}>{userData.imagesRemaining}</Text>
                                    </View>
                                }

                            </Pressable>
                            <Text style={styles.bottomBarLabel}>Scan Text</Text>
                        </View>
                    }
                    <View style={isJapanese ? styles.bottomBarButton : [styles.bottomBarButton, { width: '100%' }]}>
                        <Pressable onPress={handleEnterText}>
                            <Ionicons name="create-outline" size={30} color={"#fff"} />
                            {(userData.appUserId && !userData.isSubscribed && !hasKey) &&
                                <View style={[styles.badge, { top: -4, right: -8, width: 20, height: 20 }]}>
                                    <Text style={[styles.badgeText, { fontSize: 14 }]}>{userData.wordsRemaining}</Text>
                                </View>
                            }
                        </Pressable>
                        <Text style={styles.bottomBarLabel}>Enter Word</Text>
                    </View>
                </View>
            </View>

        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({
    inputBox: {
        flexDirection: 'row',
        backgroundColor: colors.black,
        borderRadius: 4,
        minHeight: 100,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginBottom: 8,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    placeholderText: {
        color: withOpacity(colors.purple400, 0.5),
        fontSize: 18,
        marginTop: 'auto',
        paddingLeft: 12,
        paddingBottom: 8,
    },
    textEntryRow: {
        borderWidth: 1,
        borderRightColor: colors.purple600,
        width: '100%',
        flexDirection: 'row',
    },
    textEntryInput: {
        borderWidth: 1,
        borderColor: 'transparent',
        fontSize: 18,
        color: colors.purple300,
        borderRadius: 4,
        margin: 8,
        flex: 1,
    },
    submitButton: {
        margin: 8,
        borderWidth: 1,
        padding: 8,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    requestCard: {
        marginVertical: 8,
        shadowColor: colors.purple800,
        borderWidth: 1,
        borderColor: colors.purple300,
        padding: 12,
        backgroundColor: withOpacity(colors.black, 0.2),
        borderRadius: 4,
    },
    requestCardRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    requestText: {
        color: colors.purple300,
        fontSize: 18,
    },
    requestImage: {
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.purple800,
        width: 100,
        height: 100,
    },
    emptyStateText: {
        marginTop: 24,
        fontSize: 20,
        fontWeight: '600',
        color: withOpacity(colors.purple300, 0.5),
        marginHorizontal: 'auto',
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        paddingVertical: 4,
        backgroundColor: colors.black,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 12,
    },
    bottomBarButton: {
        alignItems: 'center',
        width: '50%',
        position: 'relative',
    },
    bottomBarLabel: {
        color: colors.white,
        fontSize: 12,
        marginTop: 4,
    },
    badge: {
        position: 'absolute',
        backgroundColor: colors.purple400,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    badgeText: {
        fontWeight: 'bold',
    },
});