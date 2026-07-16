import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { loadStats, loadAgent, type GameStats } from "@/lib/qlearning";

export default function StatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [trainingGames, setTrainingGames] = useState(0);

  useEffect(() => {
    loadStats().then(setStats);
    loadAgent().then((a) => setTrainingGames(a.getTrainingGames()));
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const winRate = stats && stats.totalGames > 0
    ? Math.round((stats.playerWins / stats.totalGames) * 100)
    : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Estadísticas</Text>
        <View style={{ width: 70 }} />
      </View>

      {stats && stats.totalGames > 0 ? (
        <>
          <View style={[styles.winRateCircle, { borderColor: "#38bdf8" }]}>
            <Text style={[styles.winRateNum, { color: "#38bdf8" }]}>{winRate}%</Text>
            <Text style={[styles.winRateLabel, { color: colors.mutedForeground }]}>victorias</Text>
          </View>

          <View style={styles.grid}>
            {[
              { label: "Partidas jugadas", value: stats.totalGames, color: colors.foreground },
              { label: "Ganadas 🎉", value: stats.playerWins, color: "#38bdf8" },
              { label: "Perdidas 🤖", value: stats.aiWins, color: "#a855f7" },
              { label: "Empates 🤝", value: stats.draws, color: "#f59e0b" },
              { label: "Entren. de la IA", value: trainingGames, color: "#22c55e" },
            ].map(({ label, value, color }) => (
              <View key={label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statCardValue, { color }]}>{value}</Text>
                <Text style={[styles.statCardLabel, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.barSection, { borderColor: colors.border }]}>
            <Text style={[styles.barTitle, { color: colors.foreground }]}>Distribución</Text>
            {[
              { label: "Victorias", count: stats.playerWins, color: "#38bdf8" },
              { label: "Derrotas", count: stats.aiWins, color: "#a855f7" },
              { label: "Empates", count: stats.draws, color: "#f59e0b" },
            ].map(({ label, count, color }) => {
              const pct = stats.totalGames > 0 ? (count / stats.totalGames) : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
                    <View style={[styles.barFill, { backgroundColor: color, width: `${Math.max(pct * 100, 2)}%` as unknown as number }]} />
                  </View>
                  <Text style={[styles.barPct, { color }]}>{Math.round(pct * 100)}%</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin datos aún</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Jugá algunas partidas para ver tus estadísticas.
          </Text>
          <TouchableOpacity style={styles.playBtn} onPress={() => router.back()}>
            <Text style={styles.playBtnText}>Jugar ahora</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 20 },
  navRow: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", marginBottom: 24 },
  backText: { fontSize: 15 },
  screenTitle: { fontSize: 18, fontWeight: "700" },
  winRateCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  winRateNum: { fontSize: 38, fontWeight: "800" },
  winRateLabel: { fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%", marginBottom: 24 },
  statCard: { borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", width: "47%" },
  statCardValue: { fontSize: 26, fontWeight: "700" },
  statCardLabel: { fontSize: 12, marginTop: 4, textAlign: "center" },
  barSection: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  barTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 70, fontSize: 13 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barPct: { width: 36, fontSize: 13, fontWeight: "600", textAlign: "right" },
  empty: { flex: 1, alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 28 },
  playBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, backgroundColor: "#38bdf8" },
  playBtnText: { color: "#0f1117", fontWeight: "700", fontSize: 15 },
});
