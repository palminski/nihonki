package com.palminski.nihonki;

import android.database.Cursor;
import android.net.Uri;
import android.util.Log;
import android.util.SparseArray;
import android.app.Activity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReadableArray;

import com.facebook.react.bridge.ReactMethod;

import java.util.ArrayList;
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
            String deckToInsertInto,
            Promise promise) {
        try {
            String pkg = AddContentApi.getAnkiDroidPackageName(reactContext);
            if (pkg == null) {
                promise.reject("ANKI_UNAVAILABLE", "ANKIDROID API is not available");
                return;
            }

            if (!handlePermissions(promise))
                return;

            // Ensure Deck Exists
            Long deckId = helper.findDeckIdByName(deckToInsertInto);
            if (deckId == null) {
                deckId = helper.getApi().addNewDeck(deckToInsertInto);
            }

            Long modelId = helper.findModelIdByName("Nihonki Card", 18);
            if (modelId == null) {
                modelId = addNihonkiNoteType(deckId);
            }
            if (modelId == null) {
                promise.resolve("Model Could Not Be Added");
                return;
            }

            List<String> keys = Arrays.asList(kanji);
            SparseArray<List<NoteInfo>> duplicateNotes = helper.getApi().findDuplicateNotes(modelId, keys);
            if (duplicateNotes != null && duplicateNotes.size() > 0) {
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
    public void getDuplicateNotes(
            String deckToCheck,
            ReadableArray vocabArray,
            Promise promise) {
        try {
            String pkg = AddContentApi.getAnkiDroidPackageName(reactContext);
            if (pkg == null) {
                promise.reject("ANKI_UNAVAILABLE", "ANKIDROID API is not available");
                return;
            }

            if (!handlePermissions(promise))
                return;

            Long modelId = helper.findModelIdByName("Nihonki Card", 18);
            if (modelId == null) {
                promise.resolve("Nihonki Card Note Type Not Found");
                return;
            }

            List<String> keys = new ArrayList<>();
            for (int i = 0; i < vocabArray.size(); i++) {
                keys.add(vocabArray.getString(i));
            }

            SparseArray<List<NoteInfo>> duplicates = helper.getApi().findDuplicateNotes(modelId, keys);

            JSONArray duplicatesArray = new JSONArray();

            if (duplicates != null && duplicates.size() > 0) {
                {
                    for (int i = 0; i < duplicates.size(); i++) {
                        int keyIndex = duplicates.keyAt(i);
                        List<NoteInfo> noteInfos = duplicates.valueAt(i);

                        for (NoteInfo info : noteInfos) {
                            duplicatesArray.put(keys.get(keyIndex));
                        }
                    }
                }
                promise.resolve(duplicatesArray.toString());
            }

        } catch (Exception e) {
            Log.e("AnkiModule", "Error Getting Cards", e);
            promise.reject("ANKI_ERROR", e);
        }
    }

    @ReactMethod
    public void checkAndRequestPermissions(Promise promise) {
        handlePermissions(promise);
    }

    // ==============================================================================================================

    // Private Methods

    // ==============================================================================================================

    private Long addNihonkiNoteType(Long deckIdString) {
        AddContentApi api = helper.getApi();
        String[] fields = new String[] {
                "Optimized-Voc-Index",
                "Vocabulary-Kanji",
                "Vocabulary-Furigana",
                "Vocabulary-Kana",
                "Vocabulary-English",
                "Vocabulary-Audio",
                "Vocabulary-Pos",
                "Caution",
                "Expression",
                "Reading",
                "Sentence-Kana",
                "Sentence-English",
                "Sentence-Clozed",
                "Sentence-Audio",
                "Notes",
                "Core-Index",
                "Optimized-Sent-Index",
                "Frequency",

        };
        String frontTemplate = """
                <div class="japanese" style="font-size:60px;">{{Vocabulary-Kanji}}</div>

                <div style="font-size: 16px; ">{{Vocabulary-Pos}}</div>
                <br/><br/><br/><br/><br/>
                <div id="example-sentence" class="japanese" style="font-size:40px;">{{Expression}}</div>
                                                """;
        String backTemplate = """
                <div>{{Vocabulary-Audio}}{{Sentence-Audio}}</div>
                <div class="japanese" style="font-size:60px;">{{furigana:Vocabulary-Furigana}}</div>

                <div style="font-size: 14px; ">{{Vocabulary-Pos}}</div>

                <hr id=answer>

                <div style="font-size: 30px; ">{{Vocabulary-English}}</div>

                <div class="japanese" style="font-size: 50px; ">{{furigana:Reading}}</div>
                <div style="font-size: 20px; ">{{Sentence-English}}</div>
                <!---->

                <div style="font-size: 14pt;">
                <a class="japanese ios-only" href="mkdaijirin://jp.monokakido.DAIJIRIN/search?text={{Vocabulary-Kanji}}&srcname=Anki&src=anki://">大辞林</a><a class="japanese ios-only" href="mkwisdom2://jp.monokakido.WISDOM2/search?text={{Vocabulary-Kanji}}&srcname=Anki&src=anki://">ウィズダム</a><a class="japanese" href="http://dictionary.goo.ne.jp/srch/thsrs/{{Vocabulary-Kanji}}/m0u/">類語辞典</a><a class="ios-only" href="ebpocket://search?text={{Vocabulary-Kanji}}#anki://">EBPocket</a><a href="http://jisho.org/search/{{Vocabulary-Kanji}}">jisho</a><a href="http://ejje.weblio.jp/content/{{Vocabulary-Kanji}}">weblio</a>
                <br/>
                <div style="font-size: 10pt;">{{Frequency}}</div>
                                                """;
        String css = """
                                @font-face { font-family: stroke; src: url('_stroke.ttf'); }
                @font-face { font-family: textbook; src: url('_HGSKyokashotai.ttf'); }
                @font-face {
                   font-family: 'notosans';
                   font-style: normal;
                   font-weight: 400;
                   src: url(http://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Regular.otf) format('opentype');
                 }
                @font-face {
                   font-family: 'localnoto';
                   font-style: normal;
                   font-weight: 400;
                   src: url('_NotoSansJP-Medium.otf') format('opentype');
                 }

                .card {
                 font-family:  'localnoto', 'notosans', 'ヒラギノ明朝 ProN', 'Hiragino Mincho Pro', 'serif';
                 font-size: 25px;
                 text-align: center;
                 color: White;
                 background-color: Black;
                }

                html, body {
                    min-height: 100%;
                    margin: 0px;
                    padding: 0px;
                }

                body {
                    background-size: cover;
                    background: linear-gradient(to top, #2c0042 1%, rgba(0,0,0,0) 99%);
                    background-repeat: no-repeat;
                    background-position: bottom;
                }

                img {
                 max-height: 150px;
                 margin: 10px;
                }

                div {
                 padding-top:5px;
                 padding-bottom:5px;
                }

                a {
                 color: turquoise;
                 margin: 5px;
                }

                .ios-only { display: none; }
                .mac-only { display: none; }

                .mobile .ios-only { display: inline; }
                .mac .mac-only { display: inline; }

                .stroke { font-family: "stroke"; }
                .japanese { font-family: "textbook"; }

                .mac { font-family: 'ヒラギノ明朝 ProN', 'Hiragino Mincho Pro', 'serif'; }
                .mac .stroke { font-family: stroke; }
                .mac .japanese { font-family: textbook; }

                .mobile { font-family: textbook, 'Hiragino Mincho Pro', 'serif'; }
                                """;
        String[] cards = new String[] { "Recognition" };
        String[] qfmt = new String[] { frontTemplate };
        String[] afmt = new String[] { backTemplate };

        Long newModelId = api.addNewCustomModel(
                "Nihonki Card",
                fields,
                cards,
                qfmt,
                afmt,
                css,
                deckIdString,
                0);
        return newModelId;
    }

    private boolean handlePermissions(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ANKI_NO_ACTIVITY", "No active activity to request this permission");
            return false;
        }
        if (helper.shouldRequestPermission()) {
            helper.requestPermission(activity, 0);
            promise.resolve("requested permissions");
            return false;
        }
        return true;
    }

    // ==============================================================================================================

    // Development Methods

    // ==============================================================================================================

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
                promise.resolve("Card Added!");
            }

            promise.resolve("Note Added");
        } catch (Exception e) {
            Log.e("AnkiModule", "ERROR ADDING TEST NOTE", e);
            promise.reject("ANKI_ERROR", e);
        }
    }
}