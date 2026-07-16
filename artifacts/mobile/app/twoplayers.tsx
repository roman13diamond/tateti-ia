import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GameBoard from "@/components/Board";
import { useColors } from "@/hooks/useColors";
import { Board, checkWinner, getWinLine } from "@/lib/qlearning";

type Result = "p1" | "p2" | "draw" | null;

export default function TwoPlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [p1Name, setP1Name] = useState("Jugador 1");
  const [p2Name, setP2Name] = useState("Jugador 2");
  const [setup, setSetup] = useState(true);

  const [board, setBoard] = useState<Board>(Array(9).fill(0) as Board);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [result, setResult] = useState<Result>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [score, setScore] = useState({ p1: 0, p2: 0, draw: 0 });
  const [history, setHistory] = useState<Result[]>([]);

  const reset = () => {
    setBoard(Array(9).fill(0) as Board);
    setCurrentPlayer(1);
    setResult(null);
    setWinLine(null);
    setLastMove(undefined);
  };

  const handleCell = (idx: number) => {
    if (result !== null || board[idx] !== 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newBoard = board.slice() as Board;
    newBoard[idx] = currentPlayer;
    setBoard(newBoard);
    setLastMove(idx);
    const winner = checkWinner(newBoard);
    if (winner !== null) {
      setWinLine(getWinLine(newBoard));
      const r: Result =
        winner === "draw" ? "draw" : winner === 1 ? "p1" : "p2";
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 20));
      setScore((s) => ({
        p1: s.p1 + (r === "p1" ? 1 : 0),
        p2: s.p2 + (r === "p2" ? 1 : 0),
        draw: s.draw + (r === "draw" ? 1 : 0),
      }));
      if (r === "draw") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (setup) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>2 Jugadores</Text>
          <View style={{ width: 70 }} />
        </View>

        <Text style={[styles.setupLabel, { color: colors.mutedForeground }]}>Nombre del Jugador 1 (X)</Text>
        <TextInput
          value={p1Name}
          onChangeText={setP1Name}
          style={[styles.input, { backgroundColor: colors.card, borderColor: "#38bdf8", color: "#38bdf8" }]}
          placeholderTextColor={colors.mutedForeground}
          maxLength={16}
        />

        <Text style={[styles.setupLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Nombre del Jugador 2 (O)</Text>
        <TextInput
          value={p2Name}
          onChangeText={setP2Name}
          style={[styles.input, { backgroundColor: colors.card, borderColor: "#a855f7", color: "#a855f7" }]}
          placeholderTextColor={colors.mutedForeground}
          maxLength={16}
        />

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => setSetup(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>¡Empezar!</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const resultLabel =
    result === "p1"
      ? `¡Ganó ${p1Name}! 🎉`
      : result === "p2"
      ? `¡Ganó ${p2Name}! 🎉`
      : result === "draw"
      ? "Empate 🤝"
      : null;

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
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>2 Jugadores</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.scoreRow}>
        {[
          { name: p1Name, value: score.p1, color: "#38bdf8", symbol: "X" },
          { name: "Empate", value: score.draw, color: "#f59e0b", symbol: "=" },
          { name: p2Name, value: score.p2, color: "#a855f7", symbol: "O" },
        ].map(({ name, value, color, symbol }) => (
          <View key={symbol} style={styles.scoreItem}>
            <Text style={[styles.scoreValue, { color }]}>{value}</Text>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{name}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.turnBadge, {
        backgroundColor: currentPlayer === 1 ? "rgba(56,189,248,0.12)" : "rgba(168,85,247,0.12)",
        borderColor: currentPlayer === 1 ? "#38bdf8" : "#a855f7",
      }]}>
        <Text style={[styles.turnText, { color: currentPlayer === 1 ? "#38bdf8" : "#a855f7" }]}>
          {result === null
            ? `Turno de ${currentPlayer === 1 ? p1Name : p2Name} (${currentPlayer === 1 ? "X" : "O"})`
            : resultLabel}
        </Text>
      </View>

      <GameBoard board={board} onCellClick={handleCell} disabled={result !== null} winLine={winLine} lastMove={lastMove} />

      <TouchableOpacity style={styles.newGameBtn} onPress={reset} activeOpacity={0.8}>
        <Text style={styles.newGameText}>Nueva partida</Text>
      </TouchableOpacity>

      {history.length > 0 && (
        <View style={styles.historyRow}>
          {history.slice(0, 10).map((r, i) => (
            <View key={i} style={[styles.historyDot, {
              backgroundColor: r === "p1" ? "#38bdf8" : r === "p2" ? "#a855f7" : "#f59e0b",
            }]} />
          ))}
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
  setupLabel: { alignSelf: "flex-start", fontSize: 14, marginBottom: 8 },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  startBtn: {
    marginTop: 36,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
    alignItems: "center",
  },
  startBtnText: { fontSize: 17, fontWeight: "700", color: "#0f1117" },
  scoreRow: { flexDirection: "row", gap: 32, marginBottom: 20 },
  scoreItem: { alignItems: "center" },
  scoreValue: { fontSize: 28, fontWeight: "700" },
  scoreLabel: { fontSize: 12, marginTop: 2 },
  turnBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8, marginBottom: 20 },
  turnText: { fontSize: 14, fontWeight: "600" },
  newGameBtn: { marginTop: 20, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14, backgroundColor: "#38bdf8" },
  newGameText: { color: "#0f1117", fontSize: 16, fontWeight: "700" },
  historyRow: { flexDirection: "row", gap: 6, marginTop: 20, justifyContent: "center" },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
});
