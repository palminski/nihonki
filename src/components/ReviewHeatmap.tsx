import { useMemo, useRef } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, withOpacity } from "~/utils/colors";

interface ReviewHeatmapProps {
    activity: Record<string, number>;
    weeks?: number;
}

const CELL_SIZE = 14;
const CELL_GAP = 4;

function dateKeyFor(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function levelColor(count: number): string {
    if (count <= 0) return withOpacity(colors.purple800, 0.25);
    if (count < 5) return withOpacity(colors.purple500, 0.45);
    if (count < 15) return withOpacity(colors.purple500, 0.75);
    return colors.purple400;
}

// GitHub-commit-graph-style activity grid — one column per week (Sun top, Sat bottom),
// oldest week on the left, today always the bottom-most filled cell in the last column.
// 53 weeks (371 days) rather than exactly 52 so a full calendar year is always covered
// regardless of which day of the week today happens to be.
export default function ReviewHeatmap({ activity, weeks = 53 }: ReviewHeatmapProps) {
    const scrollRef = useRef<ScrollView>(null);

    const columns = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysSinceSunday = today.getDay();
        const gridStart = new Date(today);
        gridStart.setDate(today.getDate() - daysSinceSunday - (weeks - 1) * 7);

        const cols: { date: Date; count: number }[][] = [];
        for (let w = 0; w < weeks; w++) {
            const col: { date: Date; count: number }[] = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(gridStart);
                date.setDate(gridStart.getDate() + w * 7 + d);
                col.push({ date, count: activity[dateKeyFor(date)] ?? 0 });
            }
            cols.push(col);
        }
        return cols;
    }, [activity, weeks]);

    return (
        <View>
            <Text style={styles.title}>Review Activity</Text>
            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
                <View style={{ flexDirection: "row" }}>
                    {columns.map((col, i) => (
                        <View key={i} style={{ marginRight: CELL_GAP }}>
                            {col.map((cell, j) => {
                                const isFuture = cell.date.getTime() > Date.now();
                                return (
                                    <View
                                        key={j}
                                        style={[
                                            styles.cell,
                                            { backgroundColor: isFuture ? "transparent" : levelColor(cell.count) },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        color: withOpacity(colors.purple300, 0.7),
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: 3,
        marginBottom: CELL_GAP,
    },
});
