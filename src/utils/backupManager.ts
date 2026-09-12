import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { loadReviewDeck, updateReviewDeck } from "~/utils/deckManager";
import { loadNewCardsPerDay, updateNewCardsPerDay } from "~/utils/srsManager";
import {
    loadDeckSetting,
    updateDeckSetting,
    loadAnkiEnabledSetting,
    updateAnkiEnabledSetting,
    loadAutoPlayAudioSetting,
    updateAutoPlayAudioSetting,
} from "~/utils/settingsManager";

// Bumped only if the backup shape itself changes in a way older imports can't handle.
const BACKUP_TYPE = "nihonki-deck-backup";
const BACKUP_VERSION = 1;

interface DeckBackupFile {
    type: string;
    version: number;
    languageId: string;
    languageLabel: string;
    exportedAt: string;
    deck: Record<string, any>;
    settings: {
        newCardsPerDay: number;
        ankiEnabled: boolean;
        insertDeck: string;
        autoPlayAudio: boolean;
    };
}

// One language's deck + its own settings only — deliberately scoped per-deck rather than
// a whole-app backup, so restoring one language never touches any other language's cards.
export async function exportDeckBackup(languageId: string, languageLabel: string): Promise<void> {
    const deck = await loadReviewDeck(languageId);
    const [newCardsPerDay, ankiEnabled, insertDeck, autoPlayAudio] = await Promise.all([
        loadNewCardsPerDay(languageId),
        loadAnkiEnabledSetting(languageId),
        loadDeckSetting(languageId),
        loadAutoPlayAudioSetting(languageId),
    ]);

    const backup: DeckBackupFile = {
        type: BACKUP_TYPE,
        version: BACKUP_VERSION,
        languageId,
        languageLabel,
        exportedAt: new Date().toISOString(),
        deck,
        settings: {
            newCardsPerDay,
            ankiEnabled,
            insertDeck: insertDeck ?? "",
            autoPlayAudio,
        },
    };

    const fileName = `umeboshi-${languageId}-backup-${Date.now()}.json`;
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true, intermediates: true });
    file.write(JSON.stringify(backup, null, 2));

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
        throw new Error("Sharing isn't available on this device.");
    }
    await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: `${languageLabel} Deck Backup`,
    });
}

export interface DeckBackupPreview {
    languageId: string;
    languageLabel: string;
    cardCount: number;
    exportedAt: string;
    backup: DeckBackupFile;
}

// Lets the user pick a file and validates its shape, without writing anything yet — the
// caller decides how to confirm (e.g. warning that this replaces the current deck) before
// calling restoreDeckBackup. Returns null if the user cancels the picker.
export async function pickDeckBackupFile(): Promise<DeckBackupPreview | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "public.json", "*/*"],
        copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
    }

    const file = new File(result.assets[0].uri);
    const text = await file.text();

    let backup: DeckBackupFile;
    try {
        backup = JSON.parse(text);
    } catch {
        throw new Error("That file isn't valid JSON.");
    }

    if (backup?.type !== BACKUP_TYPE || typeof backup.languageId !== "string" || typeof backup.deck !== "object" || backup.deck === null) {
        throw new Error("That file doesn't look like a Umeboshi deck backup.");
    }

    return {
        languageId: backup.languageId,
        languageLabel: backup.languageLabel ?? backup.languageId,
        cardCount: Object.keys(backup.deck).length,
        exportedAt: backup.exportedAt,
        backup,
    };
}

// Overwrites the target language's deck and settings with what's in the backup. Callers
// should confirm with the user first — this replaces whatever cards are currently there.
export async function restoreDeckBackup(languageId: string, preview: DeckBackupPreview): Promise<void> {
    const { backup } = preview;
    await updateReviewDeck(languageId, backup.deck);

    const settings = backup.settings ?? ({} as DeckBackupFile["settings"]);
    if (typeof settings.newCardsPerDay === "number") {
        await updateNewCardsPerDay(languageId, settings.newCardsPerDay);
    }
    if (typeof settings.ankiEnabled === "boolean") {
        await updateAnkiEnabledSetting(languageId, settings.ankiEnabled);
    }
    if (typeof settings.insertDeck === "string") {
        await updateDeckSetting(languageId, settings.insertDeck);
    }
    if (typeof settings.autoPlayAudio === "boolean") {
        await updateAutoPlayAudioSetting(languageId, settings.autoPlayAudio);
    }
}
