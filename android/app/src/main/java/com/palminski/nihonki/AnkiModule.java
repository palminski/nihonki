package com.palminski.nihonki;

import android.database.Cursor;
import android.net.Uri;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;

import com.ichi2.anki.api.AddContentApi;

public class AnkiModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public AnkiModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "AnkiModule";
    }

    @ReactMethod
    public void getDecks(Promise promise) {
        try {
            Uri uri = Uri.parse("content://com.ichi2.anki.api/deckList");
            Cursor cursor = reactContext.getContentResolver().query(uri, null, null, null, null);
            Log.d("AnkiModule", "HERE");

            JSONArray decks = new JSONArray();
            if (cursor != null) {
                Log.d("AnkiModule", "Deck count: " + cursor.getCount());

                int index = cursor.getColumnIndexOrThrow("name");

                while (cursor.moveToNext()) {
                    String deckName = cursor.getString(index);
                    decks.put(deckName);
                }
                cursor.close();
            }
            promise.resolve(decks.toString());
        } catch (Exception e) {
            Log.e("AnkiModule", "Error Getting Decks", e);
            promise.reject("ANKI_ERROR", e);
        }
    }
//-----------------------------------------------------------------
// @ReactMethod
// public void requestPermission(Promise promise) {
//     try {
//         AddContentApi api = new AddContentApi(reactContext);
//         boolean hasPermission = api.checkDatabasePermission();

//         if(!hasPermission) {
//             api.requestPermission((Activity) getCurrentActivity());
//             promise.resolve("Permission requested _ approve in AnkiDroid.");
//         }
//         else{
//             promise.resolve("Permission already granted");

//         }
//     } catch (Exception e) {
//                     promise.reject("ANKI_ERROR", e);

//     }
// }
    @ReactMethod
    public void addTestNote(Promise promise) {
        try {
            String pkg = AddContentApi.getAnkiDroidPackageName(reactContext);
            if (pkg == null) {
                promise.reject("ANKI_UNAVAILABLE", "ANKIDROID API is not available");
                return;
            }
            AddContentApi api = new AddContentApi(reactContext);

            long deckId = api.addNewDeck("Deck From App");
            long modelId = api.addNewBasicModel("com.something.myapp");
            api.addNote(modelId, deckId, new String[] {"日の出", "sunrise"}, null);

                    promise.resolve("Note Added");
        } catch (Exception e) {
            promise.reject("ANKI_ERROR", e);
        }
    }

}