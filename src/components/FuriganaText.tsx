import { View, Text, StyleProp, TextStyle } from "react-native";

interface FuriganaTextProps {
    text: string;
    textStyle?: StyleProp<TextStyle>;
    furiganaStyle?: StyleProp<TextStyle>;
    boldStyle?: StyleProp<TextStyle>;
}

interface Token {
    text: string;
    furigana?: string;
    bold: boolean;
}

const KANJI_FURIGANA_RE = /([一-鿿々〆ヵヶ]+)\[([^\]]+)\]/g;

function tokenizeSegment(segment: string, bold: boolean): Token[] {
    const tokens: Token[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    KANJI_FURIGANA_RE.lastIndex = 0;
    while ((match = KANJI_FURIGANA_RE.exec(segment)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ text: segment.slice(lastIndex, match.index), bold });
        }
        tokens.push({ text: match[1], furigana: match[2], bold });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < segment.length) {
        tokens.push({ text: segment.slice(lastIndex), bold });
    }
    return tokens;
}

// Parses AI-generated furigana strings like " 彼女[かのじょ]は <b> 犬[いぬ]</b>を飼っている。"
// into plain-text and kanji+furigana tokens, tracking <b> emphasis along the way.
function parseFuriganaText(text: string): Token[] {
    const parts = text.split(/(<b>|<\/b>)/);
    let bold = false;
    const tokens: Token[] = [];
    for (const part of parts) {
        if (part === "<b>") { bold = true; continue; }
        if (part === "</b>") { bold = false; continue; }
        if (!part) continue;
        tokens.push(...tokenizeSegment(part, bold));
    }
    return tokens;
}

export default function FuriganaText({ text, textStyle, furiganaStyle, boldStyle }: FuriganaTextProps) {
    const tokens = parseFuriganaText(text);

    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" }}>
            {tokens.map((token, tokenIndex) => {
                if (token.furigana) {
                    return (
                        <View key={tokenIndex} style={{ alignItems: "center" }}>
                            <Text style={furiganaStyle}>{token.furigana}</Text>
                            <Text style={[textStyle, token.bold && boldStyle]}>{token.text}</Text>
                        </View>
                    );
                }
                return Array.from(token.text).map((char, charIndex) => (
                    <View key={`${tokenIndex}-${charIndex}`} style={{ alignItems: "center" }}>
                        <Text style={furiganaStyle}> </Text>
                        <Text style={[textStyle, token.bold && boldStyle]}>{char}</Text>
                    </View>
                ));
            })}
        </View>
    );
}
