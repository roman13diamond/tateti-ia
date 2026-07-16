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
import { loadStats, type GameStats } from "@/lib/qlearning";

interface ModeCard {
  route: "/game" | "/twoplayers" | "/puzzle";
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  bg: string;
}

const MODES: ModeCard[] = [
  {
    route: "/game",
    icon: "🤖",
    title: "vs IA",
    subtitle: "Jugá contra la inteligencia artificial Q-Learning",
    accent: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
  },
  {
    route: "/twoplayers",
    icon: "👥",
    title: "2 Jugadores",
    subtitle: "Modo local — dos jugadores en el mismo dispositivo",
    accent: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
  },
  {
    route: "/puzzle",
    icon: "🧩",
    title: "Puzzles",
    subtitle: "8 desafíos tácticos para afilar el pensamiento",
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    loadStats().then(setStats);
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: topPad + 24, paddingBottom: botPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.titleX}>Ta-Te-Ti</Text>
        <Text style={styles.titleIA}> IA</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Elegí un modo de juego
      </Text>

      {stats && stats.totalGames > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Ganadas", value: stats.playerWins, color: "#38bdf8" },
            { label: "Total", value: stats.totalGames, color: colors.foreground },
            { label: "Perdidas", value: stats.aiWins, color: "#a855f7" },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statItem}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cards}>
        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.route}
            style={[
              styles.card,
              { backgroundColor: mode.bg, borderColor: mode.accent + "40" },
            ]}
            onPress={() => router.push(mode.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardIcon}>{mode.icon}</Text>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {mode.title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                {mode.subtitle}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: mode.accent }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={() => router.push("/stats")} style={styles.statsLink}>
        <Text style={[styles.statsLinkText, { color: colors.mutedForeground }]}>
          Ver estadísticas →
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  titleX: {
    fontSize: 40,
    fontWeight: "800",
    color: "#38bdf8",
    letterSpacing: -1,
  },
  titleIA: {
    fontSize: 40,
    fontWeight: "800",
    color: "#a855f7",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 32,
    marginBottom: 28,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 2 },
  cards: { width: "100%", gap: 12, marginBottom: 28 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardIcon: { fontSize: 32 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 26, fontWeight: "300" },
  statsLink: { paddingVertical: 8 },
  statsLinkText: { fontSize: 14 },
});
