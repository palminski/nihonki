package com.palminski.nihonki;

import android.content.Context;

import com.ichi2.anki.api.AddContentApi;

import java.util.Map;

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
}
