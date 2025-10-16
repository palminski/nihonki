package com.palminski.nihonki;

import android.content.Context;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.app.Activity;

import com.ichi2.anki.api.AddContentApi;

import java.util.Map;

import static com.ichi2.anki.api.AddContentApi.READ_WRITE_PERMISSION;

public class AnkiDroidHelper {
    private final AddContentApi mApi;
    private final Context mContext;

    public AnkiDroidHelper(Context context) {
        // store application wide context
        mContext = context.getApplicationContext();
        //create API client bount to abive context
        mApi = new AddContentApi(mContext);
    }

    public AddContentApi getApi() {
        return mApi;
    }

    //Look Up Deck By Name
    public Long findDeckIdByName(String deckName) {
        Map<Long, String> deckList = mApi.getDeckList();
        if (deckList != null) {
            for(Map.Entry<Long, String> entry : deckList.entrySet()) {
                if(entry.getValue().equalsIgnoreCase(deckName)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    public Long findModelIdByName(String modelName, int numFields) {
        Map<Long, String> modelList = mApi.getModelList(numFields);
        if (modelList != null) {
            for(Map.Entry<Long, String> entry : modelList.entrySet()) {
                if(entry.getValue().equalsIgnoreCase(modelName)) {
                    return entry.getKey();
                }
            }
        }
        return null;
    }

    public boolean shouldRequestPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return false;
        }
        return ContextCompat.checkSelfPermission(mContext, READ_WRITE_PERMISSION) != PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Request permission from the user to access the AnkiDroid API (for SDK 23+)
     * @param callbackActivity An Activity which implements onRequestPermissionsResult()
     * @param callbackCode The callback code to be used in onRequestPermissionsResult()
     */
    public void requestPermission(Activity callbackActivity, int callbackCode) {
        ActivityCompat.requestPermissions(callbackActivity, new String[]{READ_WRITE_PERMISSION}, callbackCode);
    }

    
}
