import { View, Text, Pressable, TextInput, Alert, ScrollView, ActivityIndicator, Linking, Platform, StyleSheet } from "react-native";
import { useEffect, useState, useCallback, useContext } from "react";
import ScreenWrapper from "~/components/ScreenWrapper";
import { loadAPIKeySetting, updateAPIKeySetting } from "~/utils/settingsManager";
import { useFocusEffect, useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Purchases from 'react-native-purchases';
import { attemptToResoreSubscription, getIsUserSubscribed, promptUserSubscription } from "~/utils/subscriptionMethods";
import { AppContext } from "App";
import { colors, withOpacity } from "~/utils/colors";

// Apple's App Review guideline 3.1.2 requires the auto-renewal terms plus functional
// Privacy Policy/Terms of Use links to appear right on the purchase screen, not just
// somewhere else in the app. These point at draft pages on the nihonki-server site —
// swap for updated copy/URLs once the content has had real legal review.
const PRIVACY_POLICY_URL = "https://nihonki-server-udaaiuh2.on-forge.com/privacy-policy";
const TERMS_OF_USE_URL = "https://nihonki-server-udaaiuh2.on-forge.com/terms-of-use";

export default function SettingsScreen() {
    const navigation = useNavigation<NavigationProp<any>>();
    const appContext = useContext(AppContext);
    if (!appContext) return null;
    const { userData, setUserData } = appContext;

    const [loading, setLoading] = useState(false);

    const [debugResponse, setDebugResponse] = useState("");

    const [settingForm, setSettingsForm] = useState({
        apiKey: "",
    });


    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);

                const apiKeySetting = await loadAPIKeySetting();
                setSettingsForm({
                    ...settingForm,
                    apiKey: apiKeySetting != null ? apiKeySetting : "",
                });


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
        // Apple builds don't offer BYOK at all (see the hidden section below) — guarded
        // here too so no code path can write a key on iOS, not just the UI that's hidden.
        if (Platform.OS !== 'ios') {
            await updateAPIKeySetting(settingForm.apiKey);
        }
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
        let userSubscribed = await promptUserSubscription();
        setUserData({ ...userData, isSubscribed: userSubscribed });
    }

    const restorePurchase = async () => {
        let userSubscribed = await attemptToResoreSubscription();
        setUserData({ ...userData, isSubscribed: userSubscribed });

    }

    return (
        <ScreenWrapper>
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >

                    {
                        // Apple builds don't offer bring-your-own-key at all — not shown,
                        // and handleFormSubmit above won't save one even if this were
                        // somehow bypassed.
                        Platform.OS !== 'ios' &&
                        <View style={{ marginBottom: 12 }}>

                            <View style={styles.row}>
                                <Text style={styles.label}>
                                    OpenAi API Key
                                </Text>
                                <Pressable onPress={() => Alert.alert("OpenAi API Key", "If you have your own API key for open AI you can use it instead of a subscription. Your key is never sent to our servers. It is stored on your device and used to communicate with OpenAi directly.")} style={{ alignItems: 'center' }}>
                                    <Ionicons name="help-circle-outline" size={18} color={"#fff"} />
                                </Pressable>
                            </View>


                            <TextInput
                                secureTextEntry={true}
                                style={styles.textInput}
                                placeholderTextColor={withOpacity(colors.purple300, 0.5)}
                                value={settingForm.apiKey}
                                onChangeText={(text) => handleFormChange('apiKey', text)}
                                placeholder='Personal Api Key'
                            />
                        </View>
                    }


                    {
                        // RevenueCat is configured on both platforms now (see App.tsx).
                        (Platform.OS === 'android' || Platform.OS === 'ios') &&
                        (
                            !userData.isSubscribed ?
                                <>
                                    <View style={{ marginHorizontal: 'auto', marginBottom: 12 }}>
                                        <Ionicons name="ellipsis-horizontal-outline" size={50} color={"#fff"} />
                                    </View>

                                    <View style={{ marginBottom: 24 }}>
                                        <Pressable onPress={() => purchaseSubscription()} style={styles.actionButton}>
                                            <Text style={styles.actionButtonText}>Purchase Subscription ($5.99 / month)</Text>
                                        </Pressable>
                                    </View>

                                    <View style={{ marginBottom: 12 }}>
                                        <Pressable onPress={() => restorePurchase()} style={styles.actionButton}>
                                            <Text style={styles.actionButtonText}>Restore Purchase</Text>
                                        </Pressable>
                                    </View>

                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={styles.disclosureText}>
                                            Subscription automatically renews for $5.99/month unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in your account settings.
                                        </Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                                            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                                                <Text style={styles.disclosureLink}>Privacy Policy</Text>
                                            </Pressable>
                                            <Text style={styles.disclosureText}>   •   </Text>
                                            <Pressable onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
                                                <Text style={styles.disclosureLink}>Terms of Use</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                </>
                                :
                                <>
                                    {
                                        !loading &&
                                        <View style={{ marginBottom: 12 }}>
                                            <Text style={styles.subscribedText}>
                                                You are currently subscribed!
                                            </Text>

                                            <Pressable onPress={() => Linking.openURL(
                                                Platform.OS === 'ios'
                                                    ? "https://apps.apple.com/account/subscriptions"
                                                    : "https://play.google.com/store/account/subscriptions"
                                            )}>
                                                <Text style={[styles.subscribedText, { textDecorationLine: 'underline' }]}>Manage Subscriptions Here!</Text>
                                            </Pressable>
                                        </View>
                                    }
                                </>
                        )
                    }



                    <Pressable onPress={() => navigation.navigate("Licenses")} style={{ marginBottom: 12 }}>
                        <Text style={styles.disclosureLink}>Open Source Licenses</Text>
                    </Pressable>

                    {
                        debugResponse &&
                        <Text style={{ color: colors.white }}>
                            Debug Response:{'\n'}
                            {debugResponse}
                        </Text>
                    }


                </ScrollView>
            </View>
            <View style={{ backgroundColor: 'transparent' }}>
                <View style={styles.bottomBar}>
                    <Pressable onPress={handleFormSubmit} style={styles.bottomBarButton}>
                        <Ionicons name="save-outline" size={50} color={"#fff"} />
                        <Text style={styles.bottomBarButtonText}>Save Settings</Text>
                    </Pressable>
                </View>
            </View>



            {
                loading &&
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size={50} color={'#A855F7'} />
                </View>
            }

        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        color: colors.white,
        fontSize: 18,
        marginRight: 8,
    },
    textInput: {
        backgroundColor: colors.black,
        borderWidth: 1,
        borderColor: colors.purple800,
        marginVertical: 4,
        marginBottom: 8,
        borderRadius: 4,
        color: colors.purple300,
        padding: 8,
        shadowColor: colors.purple300,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 4,
    },
    actionButton: {
        borderWidth: 1,
        padding: 12,
        backgroundColor: colors.purple800,
        borderColor: colors.purple600,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButtonText: {
        marginHorizontal: 'auto',
        color: colors.white,
    },
    subscribedText: {
        color: colors.purple400,
        fontSize: 18,
    },
    disclosureText: {
        color: withOpacity(colors.purple300, 0.6),
        fontSize: 12,
        textAlign: 'center',
    },
    disclosureLink: {
        color: colors.purple400,
        fontSize: 12,
        textDecorationLine: 'underline',
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
        width: '33%',
    },
    bottomBarButtonText: {
        color: colors.white,
        fontSize: 12,
        marginTop: 4,
    },
    loadingOverlay: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
