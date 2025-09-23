
import { View, Text, Pressable, Alert, NativeModules, TextInput } from "react-native";
import OpenAI from "openai";

import ScreenWrapper from "~/components/ScreenWrapper";
import { useState } from "react";
import { loadDeckSetting } from "~/utils/settingsManager";
// import { EXPO_PUBLIC_OPENAI_KEY } from "@env";

const { AnkiModule } = NativeModules;


export default function TestScreen() {

    const API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;

    const [input, setInput] = useState("");
    const [aiResponse, setAiRespone] = useState<any>(null);

    const DebugFunction = async () => {

        try {
            const result = await AnkiModule.addTestNote();
            alert(result);

        } catch (error) {
            console.error("ERROR FETCHING DECKS!", error);
            Alert.alert("ERROR: ");
        }
    }

    const DebugOpenAi = async () => {
        if(input == null || input == "") return;
        setAiRespone(`Loading...`);
        try {
            const openai = new OpenAI({
                apiKey: `${API_KEY}`
            });

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `You are a Japanese study assistant. 
Always respond ONLY with valid JSON. 
When bolding words, you MUST use <b></b> tags exactly. 
Do NOT use <strong>, <em>, or any other tags. 
When writing furigana, you MUST use square brackets [] immediately after kanji compounds.
When writing the exampleSentenceFurigana, you MUST include it for ALL kanji compounds.
Make sure the example sentence provides contextual information about the word.
IMPORTANT: In example sentences, every kanji compound that has furigana MUST be preceded by a space.
   Example: " 私[わたし]は <b> 暗記[あんき]</b>します。"
   (Notice the space before 暗記).
If you output a kanji compound with furigana and do not put a space before it, your response is invalid.
If you output a kanji compound without furigana in the exampleSentenceFurigana field, your response is invalid.

Here are some example outputs to follow:

{
  "kanji": "刀",
  "kana": "かたな",
  "furigana": "刀[かたな]",
  "meaning": "sword; katana",
  "partOfSpeech": "noun",
  "exampleSentenceKanji": "彼は <b>刀</b>を持っている。",
  "exampleSentenceFurigana": " 彼[かれ]は <b> 刀[かたな]</b>を 持[も]っている。",
  "exampleSentenceKana": "かれは <b>かたな</b>をもっている。",
  "exampleSentenceEnglish": "He carries a sword."
}

{
  "kanji": "走る",
  "kana": "はしる",
  "furigana": "走[はし]る",
  "meaning": "to run",
  "partOfSpeech": "verb",
  "exampleSentenceKanji": "毎朝公園で <b>走る</b>。",
  "exampleSentenceFurigana": " 毎朝[まいあさ] 公園[こうえん]で <b> 走[はし]る</b>。",
  "exampleSentenceKana": "まいあさこうえんで <b>はしる</b>。",
  "exampleSentenceEnglish": "I run in the park every morning."
}

{
  "kanji": "勉強",
  "kana": "べんきょう",
  "furigana": "勉強[べんきょう]",
  "meaning": "study",
  "partOfSpeech": "noun, suru verb",
  "exampleSentenceKanji": "図書館で <b>勉強</b>しています。",
  "exampleSentenceFurigana": " 図書館[としょかん]で <b> 勉強[べんきょう]</b>しています。",
  "exampleSentenceKana": "としょかんで <b>べんきょう</b>しています。",
  "exampleSentenceEnglish": "I am studying at the library."
}
`
                    },
                    {
                        role: "user",
                        content: `Create card data for the Japanese word ${input}.
                        If the word is in English find the Japanese word and then proceede as if that word had been entered.
      Include the following fields:
      - kanji
      - kana
      - furigana (e.g. 暗記[あんき])
      - meaning (English)
      - partOfSpeech
      - exampleSentenceKanji
      - exampleSentenceFurigana
      - exampleSentenceKana
      - exampleSentenceEnglish

      Output only a JSON object with these keys.`
                    }
                ]
            });

            const jsonString = response.choices[0].message.content;

            if (jsonString !== null) {
                const cardObject = JSON.parse(jsonString);
                const { valid, missing } = ValidateCardData(cardObject);

                if (!valid) {
                    setAiRespone(`There was an issue getting card data. Please Try Again`);
                    return;
                }

                const deckToInsertInto = await loadDeckSetting();

                const result = await AnkiModule.addNote(
                    cardObject.kanji,
                    cardObject.kana,
                    cardObject.furigana,
                    cardObject.meaning,
                    cardObject.partOfSpeech,
                    cardObject.exampleSentenceKanji,
                    cardObject.exampleSentenceFurigana,
                    cardObject.exampleSentenceKana,
                    cardObject.exampleSentenceEnglish,
                    deckToInsertInto ? deckToInsertInto : "DEV DECK"
                );
                setInput("");
                setAiRespone(
                    `${result}!
${cardObject.furigana}
${cardObject.meaning} `
                );
            }

            console.log(jsonString);


        } catch (error) {
            setAiRespone("ERROR");
        }
    }

    const HandleFormChange = async (value: string) => {
        setInput(value);
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

    // const RequestPermission = async () => {

    //     try {
    //         const result = await AnkiModule.requestPermission();
    //         alert(result);

    //     } catch (error) {
    //         console.error("ERROR FETCHING DECKS!", error);
    //         Alert.alert("ERROR: ");
    //     }
    // }

    return (
        <ScreenWrapper>
            <Text className="text-white text-2xl">
                Japanese Vocab
            </Text>

            <TextInput className='bg-white text-3xl placeholder:text-gray-300 my-1 rounded mb-2' value={input} onChangeText={(text) => HandleFormChange(text)} placeholder='言葉こちら' />
            {
                aiResponse === "Loading..." ?
                    <>
                        <Pressable className="bg-purple-500/50 rounded p-2 mb-5">
                            <Text className="text-3xl text-white">Loading...</Text>
                        </Pressable>
                    </>
                    :
                    <>
                        <Pressable className="bg-purple-500/50 rounded p-2 mb-5" onPress={DebugOpenAi}>
                            <Text className="text-3xl text-white">Create Card</Text>
                        </Pressable>
                    </>
            }

            <View className="bg-black rounded min-h-64 py-2 px-3">
                <Text className="text-purple-300">{aiResponse ?? "Awaiting API Call"}</Text>
            </View>


        </ScreenWrapper>
    )
}