import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { Board } from "@/lib/qlearning";
import { useColors } from "@/hooks/useColors";

interface Props {
  board: Board;
  onCellClick: (idx: number) => void;
  disabled: boolean;
  winLine: number[] | null;
  lastMove?: number;
  highlightSolution?: number;
}

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.min(width - 48, 320);
const CELL_SIZE = BOARD_SIZE / 3;

export default function GameBoard({
  board,
  onCellClick,
  disabled,
  winLine,
  lastMove,
  highlightSolution,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.grid, { borderColor: colors.border }]}>
      {board.map((cell, idx) => {
        const inWinLine = winLine?.includes(idx) ?? false;
        const isLast = lastMove === idx;
        const isSolution = highlightSolution === idx;

        return (
          <TouchableOpacity
            key={idx}
            style={[
              styles.cell,
              {
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: inWinLine
                  ? "rgba(56,189,248,0.12)"
                  : isSolution
                  ? "rgba(168,85,247,0.12)"
                  : isLast
                  ? "rgba(255,255,255,0.04)"
                  : colors.card,
                borderColor: inWinLine
                  ? "rgba(56,189,248,0.5)"
                  : colors.border,
              },
            ]}
            onPress={() => !disabled && cell === 0 && onCellClick(idx)}
            disabled={disabled || cell !== 0}
            activeOpacity={0.65}
          >
            {cell === 1 && (
              <Text
                style={[
                  styles.symbol,
                  { color: inWinLine ? "#7dd3fc" : "#38bdf8" },
                ]}
              >
                X
              </Text>
            )}
            {cell === 2 && (
              <Text
                style={[
                  styles.symbol,
                  { color: inWinLine ? "#d8b4fe" : "#a855f7" },
                ]}
              >
                O
              </Text>
            )}
            {isSolution && cell === 0 && (
              <View style={styles.solutionDot} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  symbol: {
    fontSize: CELL_SIZE * 0.42,
    fontWeight: "800",
  },
  solutionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(168,85,247,0.5)",
  },
});
