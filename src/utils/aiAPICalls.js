import { loadDeckSetting, updateDeckSetting, loadAPIKeySetting, updateAPIKeySetting } from "~/utils/settingsManager";
import { imageInstructionText, singleWordInstructionText, systemInstructionText } from "./aiInstructions";
import OpenAI from "openai";

export async function translateWord(word) {
    const key = await loadAPIKeySetting();
    try {
        const openai = new OpenAI({
            apiKey: `${key}`
        });

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
                { role: "system", content: systemInstructionText },
                { role: "system", content: singleWordInstructionText },
                { role: "user", content: word },
            ],
        });

        const jsonString = response.output_text?.trim();
        return jsonString;
    } catch (error) {
        if (error?.message && error?.message.toLowerCase().includes('incorrect api key')) {
            throw new Error(
                "The API key sent to OpenAi was incorrect. Please input the correct key in this app's settings"
            )
        }
        throw new Error(
            error?.message || "Something went wrong while making the request. Please make sure your API key is correctly configured"
        )
    }
}

export async function translateImage(imageBase64) {
    const key = await loadAPIKeySetting();
    try {
        const openai = new OpenAI({
            apiKey: `${key}`
        });

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: [
                { role: "system", content: systemInstructionText },
                { role: "system", content: imageInstructionText },
                { role: "user", content: [
                    {
                        type: "input_image",
                        image_url: `data:image/jpeg;base64,${imageBase64}`
                    }
                ] },
            ],
        });

        const jsonString = response.output_text?.trim();
        return jsonString;
    } catch (error) {
        if (error?.message && error?.message.toLowerCase().includes('incorrect api key')) {
            throw new Error(
                "The API key sent to OpenAi was incorrect. Please input the correct key in this app's settings"
            )
        }
        throw new Error(
            error?.message || "Something went wrong while making the request. Please make sure your API key is correctly configured"
        )
    }
}