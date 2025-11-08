import Purchases from "react-native-purchases";
import { Alert } from "react-native";
import axios from "axios";

export async function promptUserSubscription(): Promise<boolean> {
    try {
        const offerings = await Purchases.getOfferings();
        if (!offerings.current) {
            Alert.alert("no offerings found in store")
            return false;
        }
        const packageToBuy = offerings.current.availablePackages[0];
        const purchaseResult = await Purchases.purchasePackage(packageToBuy);
        return true;
        // Alert.alert("Purchased " + purchaseResult.transaction.productIdentifier);

    } catch (error: any) {
        if (error.userCancelled) {
            return false;
        }

        if (
            error.code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR ||
            error.message?.toLowerCase().includes("already owned")
        ) {
            try {
                const info = await Purchases.getCustomerInfo();
                if (Object.keys(info.entitlements.active).length > 0) {
                    Alert.alert("You already have a subscription.", "Your access has been restored!");
                    return false
                }
            } catch (error) {
                Alert.alert("You already have a subscription.");
                return false;
            }
        }

        Alert.alert("Purchase Failed!");
        return false;
    }
}

export async function attemptToResoreSubscription(): Promise<boolean> {
    try {
        const info = await Purchases.restorePurchases();

        const activeEntitlements = Object.keys(info.entitlements.active);
        if (activeEntitlements.length > 0) {
            Alert.alert("Purchase Restored!");
            return true;
        }
        else {
            Alert.alert("No Active Subscription Found", "We were unable to restore your purchase. If you belive this to be an error please reach out!");
            return false;
        }
    } catch (error) {
        Alert.alert("Restore Purchase Failed!");
        return false;
    }
}

export async function getIsUserSubscribed() {
    const subscriptionInfo = await Purchases.getCustomerInfo();
    if (!subscriptionInfo.entitlements.active["api_key_access"]) {
        return false;
    }
    return true;
}

export async function getDeviceInfo(appUserId: string) {
    const response = await axios.post(
        // Hard Coding While Testing
        `http://10.0.0.187:8000/api/devices/info`,
        // `https://nihonki-server-udaaiuh2.on-forge.com/devices/get`,
        { appUserId: appUserId },
        {});
    let data = response.data;
    // let data = JSON.parse(jsonString);
    return data;
}