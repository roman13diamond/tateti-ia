import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { Board } from "@/lib/qlearning";
import { PUZZLES, type Puzzle } from "@/lib/puzzles";

type PuzzleState = "idle" | "wrong" | "correct";

export default function PuzzleScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Puzzle | null>(null);
  const [state, setState] = useState<PuzzleState>("idle");
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState<Set<number>>(new Set());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCell = (idx: number) => {
    if (!selected || state !== "idle") return;
    if (idx === selected.solution) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setState("correct");
      setStreak((s) => s + 1);
      setSolved((s) => new Set([...s, selected.id]));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setState("wrong");
      setStreak(0);
    }
  };

  const diffColor: Record<string, string> = {
    fácil: "#22c55e",
    medio: "#f59e0b",
    difícil: "#ef4444",
  };

  if (!selected) {
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
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Puzzles</Text>
          <View style={{ width: 70 }} />
        </View>

        {streak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "#f59e0b" }]}>
            <Text style={{ color: "#f59e0b", fontWeight: "700", fontSize: 14 }}>🔥 Racha: {streak}</Text>
          </View>
        )}

        <View style={styles.puzzleList}>
          {PUZZLES.map((p) => {
            const isSolved = solved.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.puzzleCard, {
                  backgroundColor: isSolved ? "rgba(34,197,94,0.06)" : colors.card,
                  borderColor: isSolved ? "#22c55e40" : colors.border,
                }]}
                onPress={() => { setSelected(p); setState("idle"); setShowHint(false); }}
                activeOpacity={0.75}
              >
                <View style={styles.puzzleCardLeft}>
                  <Text style={[styles.puzzleNum, { color: colors.mutedForeground }]}>#{p.id}</Text>
                  <View>
                    <Text style={[styles.puzzleTitle, { color: isSolved ? "#22c55e" : colors.foreground }]}>
                      {isSolved ? "✓ " : ""}{p.title}
                    </Text>
                    <Text style={[styles.puzzleDesc, { color: colors.mutedForeground }]}>{p.description}</Text>
                  </View>
                </View>
                <Text style={[styles.diffBadge, { color: diffColor[p.difficulty] }]}>{p.difficulty}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  const displayBoard = selected.board.slice() as Board;
  const winLine = state === "correct" ? [selected.solution] : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Puzzles</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>#{selected.id} {selected.title}</Text>
        <View style={{ width: 70 }} />
      </View>

      <Text style={[styles.puzzleInstruction, { color: colors.mutedForeground }]}>
        {selected.description}
      </Text>

      {state === "idle" && (
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Tocás una celda vacía para jugar tu movimiento.
          </Text>
        </View>
      )}
      {state === "wrong" && (
        <View style={[styles.infoBox, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "#ef4444" }]}>
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>❌ Movimiento incorrecto. Intentá de nuevo.</Text>
        </View>
      )}
      {state === "correct" && (
        <View style={[styles.infoBox, { backgroundColor: "rgba(34,197,94,0.08)", borderColor: "#22c55e" }]}>
          <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 16 }}>✅ ¡Correcto! Bien jugado.</Text>
        </View>
      )}

      <View style={{ marginVertical: 12 }}>
        <GameBoard
          board={state === "correct" ? (() => { const b = displayBoard.slice() as Board; b[selected.solution] = 1; return b; })() : displayBoard}
          onCellClick={handleCell}
          disabled={state === "correct"}
          winLine={state === "correct" ? [selected.solution] : null}
          highlightSolution={showHint && state === "idle" ? selected.solution : undefined}
        />
      </View>

      <View style={styles.actionRow}>
        {state === "idle" && (
          <TouchableOpacity
            style={[styles.hintBtn, { borderColor: colors.border }]}
            onPress={() => setShowHint((h) => !h)}
          >
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              {showHint ? "🙈 Ocultar pista" : "💡 Ver pista"}
            </Text>
          </TouchableOpacity>
        )}
        {state === "correct" && (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => {
              const next = PUZZLES.find((p) => p.id === selected.id + 1);
              if (next) { setSelected(next); setState("idle"); setShowHint(false); }
              else setSelected(null);
            }}
          >
            <Text style={styles.nextText}>{selected.id < PUZZLES.length ? "Siguiente puzzle →" : "Ver todos los puzzles"}</Text>
          </TouchableOpacity>
        )}
        {state === "wrong" && (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setState("idle")}>
            <Text style={styles.nextText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {showHint && state === "idle" && (
        <Text style={[styles.hintLabel, { color: "#f59e0b" }]}>💡 {selected.hint}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 20 },
  navRow: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", marginBottom: 16 },
  backText: { fontSize: 15 },
  screenTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", flex: 1 },
  streakBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  puzzleList: { width: "100%", gap: 10 },
  puzzleCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, borderWidth: 1, padding: 16 },
  puzzleCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  puzzleNum: { fontSize: 13, width: 24 },
  puzzleTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  puzzleDesc: { fontSize: 12 },
  diffBadge: { fontSize: 12, fontWeight: "600" },
  puzzleInstruction: { fontSize: 14, textAlign: "center", marginBottom: 12 },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, width: "100%", alignItems: "center" },
  infoText: { fontSize: 14, textAlign: "center" },
  actionRow: { marginTop: 16 },
  hintBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8 },
  hintText: { fontSize: 14 },
  nextBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, backgroundColor: "#38bdf8" },
  nextText: { color: "#0f1117", fontWeight: "700", fontSize: 15 },
  hintLabel: { marginTop: 12, fontSize: 14, textAlign: "center", fontStyle: "italic" },
});
