import { View, Text, StyleSheet } from "react-native";
import { colors, withOpacity } from "~/utils/colors";

interface ReviewForecastChartProps {
    // Index 0 = today, index 1 = tomorrow, etc — see getForecastCounts.
    counts: number[];
}

const BAR_AREA_HEIGHT = 70;

// Y-axis tick spacing scales with the data so the axis stays readable whether someone has
// a handful of cards due or a few hundred piled up.
function pickYAxisStep(max: number): number {
    if (max <= 20) return 5;
    if (max <= 50) return 10;
    if (max <= 200) return 50;
    return 100;
}

export default function ReviewForecastChart({ counts }: ReviewForecastChartProps) {
    const max = Math.max(0, ...counts);
    const step = pickYAxisStep(max);
    const niceMax = Math.max(step, Math.ceil(max / step) * step);
    const ticks: number[] = [];
    for (let tick = 0; tick <= niceMax; tick += step) ticks.push(tick);

    return (
        <View>
            <Text style={styles.title}>Upcoming Reviews</Text>
            <View style={styles.chartRow}>
                <View style={styles.yAxisColumn}>
                    <View style={styles.yAxisTicks}>
                        {ticks.slice().reverse().map((tick) => (
                            <Text key={tick} style={styles.yAxisLabel}>{tick}</Text>
                        ))}
                    </View>
                </View>

                <View style={styles.barRow}>
                    {counts.map((count, index) => (
                        <View key={index} style={styles.barColumn}>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.bar,
                                        { height: count > 0 ? Math.max(2, (count / niceMax) * BAR_AREA_HEIGHT) : 0 },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>{index % 5 === 0 ? String(index) : ""}</Text>
                        </View>
                    ))}
                </View>
            </View>
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
    chartRow: {
        flexDirection: "row",
    },
    yAxisColumn: {
        width: 24,
        marginRight: 4,
    },
    yAxisTicks: {
        height: BAR_AREA_HEIGHT,
        justifyContent: "space-between",
    },
    yAxisLabel: {
        color: withOpacity(colors.purple300, 0.4),
        fontSize: 9,
        textAlign: "right",
    },
    barRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
    },
    barColumn: {
        flex: 1,
        alignItems: "center",
    },
    barTrack: {
        height: BAR_AREA_HEIGHT,
        justifyContent: "flex-end",
        width: "60%",
    },
    bar: {
        width: "100%",
        backgroundColor: colors.purple500,
        borderRadius: 2,
    },
    barLabel: {
        color: withOpacity(colors.purple300, 0.5),
        fontSize: 9,
        marginTop: 4,
    },
});
