package com.palminski.nihonki;

import android.database.Cursor;
import android.net.Uri;
import android.util.Log;
import android.util.SparseArray;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Arrays;
import java.util.List;

import org.json.JSONArray;

import com.ichi2.anki.api.NoteInfo;
import com.ichi2.anki.api.AddContentApi;

public class AnkiModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private final AnkiDroidHelper helper;

    public AnkiModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.helper = new AnkiDroidHelper(context);
    }

    @Override
    public String getName() {
        return "AnkiModule";
    }

    // ==============================================================================================================

    // Methods To Be Called From Native App

    // ==============================================================================================================

    @ReactMethod
    public void addNote(
            String kanji,
            String kana,
            String furigana,
            String meaning,
            String partOfSpeech,
            String exampleSentenceKanji,
            String exampleSentenceFurigana,
            String exampleSentenceKana,
            String exampleSentenceEnglish,
            Promise promise
            ) {
        try {
            String pkg = AddContentApi.getAnkiDroidPackageName(reactContext);
            if (pkg == null) {
                promise.reject("ANKI_UNAVAILABLE", "ANKIDROID API is not available");
                return;
            }

            // Ensure Deck Exists
            Long deckId = helper.findDeckIdByName("DEV DECK");
            if (deckId == null) {
                deckId = helper.getApi().addNewDeck("DEV DECK");
            }

            Long modelId = helper.findModelIdByName("Core 2000", 18);
            if (modelId == null) {
                promise.resolve("Core 2000 Note Type Not Found");
                return;
            }

            List<String> keys = Arrays.asList(kanji);
            SparseArray<List<NoteInfo>> duplicateNotes = helper.getApi().findDuplicateNotes(modelId, keys);
            if(duplicateNotes != null && duplicateNotes.size() > 0) {
                promise.resolve("Duplicate Found. Note Not Added");
                return;
            }

            long noteId = helper.getApi().addNote(
                    modelId,
                    deckId,
                    new String[] {
                            kanji, // 1. Index
                            kanji, // 2. Vocab Kanji
                            furigana, // 3. Vocab Kanji With Furigana
                            kana, // 4. Vocab Kana
                            meaning, // 5. Vocabulary English
                            "", // 6. Vocabulary Audio
                            partOfSpeech, // 7. Vocabulary Pos (Type of Speech)
                            "", // 8. Caution
                            exampleSentenceKanji, // 9. Example Sentance Kanji
                            exampleSentenceFurigana, // 10. Example Sentance Kanji with Furigana
                            exampleSentenceKana, // 11. Example Sentence Only Kana
                            exampleSentenceEnglish, // 12. English Sentences
                            "", // 13. Sentence Clozed (?)
                            "", // 14. Sentence Audio
                            "", // 15. Notes
                            kanji, // 16. Core Index
                            kanji, // 17. Optimised Sentence Index
                            "", // 18. Fequency
                    },
                    null);
            // "日の出", "sunrise"
            if (noteId == -1) {
                promise.resolve("Duplicate note skipped");
            } else {
                promise.resolve("Note added with Id: " + noteId);
            }

            promise.resolve("Note Added");
        } catch (Exception e) {
            Log.e("AnkiModule", "ERROR ADDING TEST NOTE", e);
            promise.reject("ANKI_ERROR", e);
        }
    }

    @ReactMethod
    public void addTestNote(Promise promise) {
        try {
            String pkg = AddContentApi.getAnkiDroidPackageName(reactContext);
            if (pkg == null) {
                promise.reject("ANKI_UNAVAILABLE", "ANKIDROID API is not available");
                return;
            }

            // Ensure Deck Exists
            Long deckId = helper.findDeckIdByName("DEV DECK");
            if (deckId == null) {
                deckId = helper.getApi().addNewDeck("DEV DECK");
            }

            Long modelId = helper.findModelIdByName("Core 2000", 18);
            if (modelId == null) {
                promise.resolve("Duplicate Core 2000 Note Type Not Found");
                return;
            }

            long noteId = helper.getApi().addNote(
                    modelId,
                    deckId,
                    new String[] {
                            Long.toString(modelId), // 1. Index
                            "暗記", // 2. Vocab Kanji
                            "暗記[あんき]", // 3. Vocab Kanji With Furigana
                            "あんき", // 4. Vocab Kana
                            "Memorization", // 5. Vocabulary English
                            "", // 6. Vocabulary Audio
                            "Noun, Suru Verb", // 7. Vocabulary Pos (Type of Speech)
                            "", // 8. Caution
                            "毎日<b>暗記</b>します。", // 9. Example Sentance Kanji
                            "毎日[まいにち]<b>暗記[あんき]</b>します。", // 10. Example Sentance Kanji with Furigana
                            "まいにち<b>あんき</b>します。", // 11. Example Sentence Only Kana
                            "I memorize Every Day", // 12. English Sentences
                            "", // 13. Sentence Clozed (?)
                            "", // 14. Sentence Audio
                            "", // 15. Notes
                            "", // 16. Core Index
                            "", // 17. Optimised Sentence Index
                            "", // 18. Fequency
                    },
                    null);
            // "日の出", "sunrise"
            if (noteId == -1) {
                promise.resolve("Duplicate note skipped");
            } else {
                promise.resolve("Note added with Id: " + noteId);
            }

            promise.resolve("Note Added");
        } catch (Exception e) {
            Log.e("AnkiModule", "ERROR ADDING TEST NOTE", e);
            promise.reject("ANKI_ERROR", e);
        }
    }
}