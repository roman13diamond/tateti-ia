import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GameBoard from "@/components/Board";
import { useColors } from "@/hooks/useColors";
import {
  Board,
  QLearningAgent,
  checkWinner,
  getWinLine,
  loadAgent,
  loadStats,
  saveAgent,
  saveStats,
} from "@/lib/qlearning";

type Difficulty = "fácil" | "medio" | "difícil";
type Result = "player" | "ai" | "draw" | null;

const DIFF_EPSILON: Record<Difficulty, number> = {
  fácil: 0.7,
  medio: 0.35,
  difícil: 0,
};

export default function GameScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const agentRef = useRef<QLearningAgent>(new QLearningAgent());
  const [ready, setReady] = useState(false);
  const [board, setBoard] = useState<Board>(Array(9).fill(0) as Board);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [aiStartsNext, setAiStartsNext] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [score, setScore] = useState({ player: 0, ai: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<Result[]>([]);

  useEffect(() => {
    loadAgent().then((a) => { agentRef.current = a; setReady(true); });
  }, []);

  const resetGame = useCallback((aiFirst = false) => {
    setBoard(Array(9).fill(0) as Board);
    setIsPlayerTurn(!aiFirst);
    setResult(null);
    setWinLine(null);
    setLastMove(undefined);
    setThinking(false);
  }, []);

  const recordResult = useCallback(async (r: NonNullable<Result>, finalBoard: Board) => {
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 20));
    setScore((s) => ({
      player: s.player + (r === "player" ? 1 : 0),
      ai: s.ai + (r === "ai" ? 1 : 0),
      draw: s.draw + (r === "draw" ? 1 : 0),
    }));
    setAiStartsNext(r === "player");
    const stats = await loadStats();
    stats.totalGames++;
    if (r === "player") stats.playerWins++;
    else if (r === "ai") stats.aiWins++;
    else stats.draws++;
    await saveStats(stats);
    await saveAgent(agentRef.current);
    if (r === "player") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (r === "ai") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const makeAiMove = useCallback(
    (currentBoard: Board) => {
      const eps = DIFF_EPSILON[difficulty];
      const avail = currentBoard.reduce<number[]>((a, c, i) => (c === 0 ? [...a, i] : a), []);
      const action =
        Math.random() < eps
          ? avail[Math.floor(Math.random() * avail.length)]
          : agentRef.current.chooseAction(currentBoard, false);
      if (action === -1) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newBoard = currentBoard.slice() as Board;
      newBoard[action] = 2;
      setBoard(newBoard);
      setLastMove(action);
      const winner = checkWinner(newBoard);
      if (winner !== null) {
        setWinLine(getWinLine(newBoard));
        recordResult(winner === "draw" ? "draw" : winner === 1 ? "player" : "ai", newBoard);
      } else {
        setIsPlayerTurn(true);
      }
    },
    [difficulty, recordResult]
  );

  useEffect(() => {
    if (!ready || isPlayerTurn || result !== null) return;
    setThinking(true);
    const t = setTimeout(() => {
      setThinking(false);
      makeAiMove(board);
    }, 500 + Math.random() * 300);
    return () => clearTimeout(t);
  }, [ready, isPlayerTurn, result, board, makeAiMove]);

  const handleCell = (idx: number) => {
    if (!isPlayerTurn || result !== null || board[idx] !== 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newBoard = board.slice() as Board;
    newBoard[idx] = 1;
    setBoard(newBoard);
    setLastMove(idx);
    const winner = checkWinner(newBoard);
    if (winner !== null) {
      setWinLine(getWinLine(newBoard));
      recordResult(winner === "draw" ? "draw" : winner === 1 ? "player" : "ai", newBoard);
    } else {
      setIsPlayerTurn(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const resultConfig: Record<NonNullable<Result>, { label: string; color: string }> = {
    player: { label: "¡Ganaste! 🎉", color: "#38bdf8" },
    ai: { label: "Ganó la IA 🤖", color: "#a855f7" },
    draw: { label: "Empate 🤝", color: "#f59e0b" },
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Volver</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>vs IA</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.diffRow}>
        {(["fácil", "medio", "difícil"] as Difficulty[]).map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.diffBtn,
              {
                backgroundColor: difficulty === d ? "rgba(56,189,248,0.15)" : colors.card,
                borderColor: difficulty === d ? "#38bdf8" : colors.border,
              },
            ]}
            onPress={() => { setDifficulty(d); resetGame(false); }}
          >
            <Text style={[styles.diffText, { color: difficulty === d ? "#38bdf8" : colors.mutedForeground }]}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.scoreRow}>
        {[
          { label: "Tú (X)", value: score.player, color: "#38bdf8" },
          { label: "Empate", value: score.draw, color: "#f59e0b" },
          { label: "IA (O)", value: score.ai, color: "#a855f7" },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.scoreItem}>
            <Text style={[styles.scoreValue, { color }]}>{value}</Text>
            <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>

      {!ready ? (
        <ActivityIndicator color="#38bdf8" style={{ marginVertical: 60 }} />
      ) : (
        <GameBoard board={board} onCellClick={handleCell} disabled={!isPlayerTurn || result !== null} winLine={winLine} lastMove={lastMove} />
      )}

      <View style={styles.statusArea}>
        {thinking && !result && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator color="#a855f7" size="small" />
            <Text style={[styles.statusText, { color: "#a855f7" }]}> La IA está pensando...</Text>
          </View>
        )}
        {!thinking && result === null && (
          <Text style={[styles.statusText, { color: isPlayerTurn ? "#38bdf8" : "#a855f7" }]}>
            {isPlayerTurn ? "Tu turno — elegí una celda" : "Turno de la IA"}
          </Text>
        )}
        {result && (
          <Text style={[styles.resultText, { color: resultConfig[result].color }]}>
            {resultConfig[result].label}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.newGameBtn}
        onPress={() => resetGame(aiStartsNext)}
        activeOpacity={0.8}
      >
        <Text style={styles.newGameText}>Nueva partida</Text>
      </TouchableOpacity>

      {history.length > 0 && (
        <View style={styles.historyRow}>
          {history.slice(0, 10).map((r, i) => (
            <View
              key={i}
              style={[
                styles.historyDot,
                { backgroundColor: r === "player" ? "#38bdf8" : r === "ai" ? "#a855f7" : "#f59e0b" },
              ]}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 20 },
  navRow: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 70 },
  backText: { fontSize: 15 },
  screenTitle: { fontSize: 18, fontWeight: "700" },
  diffRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  diffBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  diffText: { fontSize: 13, fontWeight: "600" },
  scoreRow: { flexDirection: "row", gap: 36, marginBottom: 24 },
  scoreItem: { alignItems: "center" },
  scoreValue: { fontSize: 28, fontWeight: "700" },
  scoreLabel: { fontSize: 12, marginTop: 1 },
  statusArea: { height: 48, justifyContent: "center", alignItems: "center", marginTop: 16 },
  thinkingRow: { flexDirection: "row", alignItems: "center" },
  statusText: { fontSize: 15, fontWeight: "500" },
  resultText: { fontSize: 22, fontWeight: "800" },
  newGameBtn: {
    marginTop: 12,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#38bdf8",
  },
  newGameText: { color: "#0f1117", fontSize: 16, fontWeight: "700" },
  historyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 20, justifyContent: "center" },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
});
