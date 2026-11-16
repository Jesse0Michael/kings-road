// Development-only capture stage; Vite's production entry does not include this page.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { act, createGame, type Game, type Role } from "../src/game/engine";
import { Table, colors } from "../src/scene/Table";
import type { Transition } from "../src/scene/motion";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-600.css";

function initial(role: Role) {
  const g = createGame(role, 42);
  g.turn = role;
  g.phase = role === "Builder" ? "build" : role === "Army" ? "move" : "run";
  g.budget = role === "Builder" ? 3 : 8;
  g.dice = role === "Builder" ? [2, 2, 2] : role === "Runner" ? [8] : [];
  if (role === "Builder") g.units = [{ id: 1, node: 3 }];
  if (role === "Army") {
    g.units = [1, 2, 3].map((id) => ({ id, node: 3 }));
    g.walls[8] = 1;
  }
  if (role === "Runner") {
    g.units = [{ id: 1, node: 1 }];
    g.walls[1] = 1;
  }
  g.nextId = 4;
  return g;
}

const captions = {
  Builder: [
    "Roll 6 → build 3 walls",
    "Place a wall on a road",
    "Choose where to defend",
    "Walls wait for the Army",
    "A soldier hits a wall → Builder +1",
  ],
  Army: [
    "Three soldiers. One wall in their way.",
    "Move the group toward the castle",
    "One soldier clears the wall. Two reach the castle.",
  ],
  Runner: [
    "Start at I. Coins mark new locations.",
    "Enter II: remove a soldier → +1",
    "Cross to III: break a wall → +1",
    "Back to II → no extra point",
    "Back to the start → no point",
  ],
};

function Stage() {
  const [role, setRole] = useState<Role>("Builder");
  const [game, setGame] = useState(() => initial("Builder"));
  const current = useRef(game);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [caption, setCaption] = useState(captions.Builder[0]);
  const serial = useRef(0);
  useEffect(() => {
    (window as any).__example = {
      reset(nextRole: Role) {
        const next = initial(nextRole);
        current.current = next;
        setRole(nextRole);
        setGame(next);
        setTransitions([]);
        setCaption(captions[nextRole][0]);
      },
      step(index: number) {
        const before = current.current;
        const after =
          role === "Builder"
            ? act(
                before,
                index < 4
                  ? { type: "wall", road: [8, 6, 7][index - 1] }
                  : { type: "march", unit: 1, node: 5 },
              )
            : role === "Army"
              ? index === 1
                ? act(before, { type: "march", unit: 1, node: 5 })
                : before
              : act(before, { type: "run", node: [1, 2, 1, 0][index - 1] });
        current.current = after;
        setTransitions((list) => [
          ...list,
          { id: ++serial.current, before, after, at: performance.now() },
        ]);
        setGame(after);
        setCaption(captions[role][index]);
      },
    };
  }, [role]);
  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#211713",
      }}
    >
      <Table
        game={game}
        onNode={() => {}}
        onRoad={() => {}}
        selected={null}
        transitions={transitions}
        example
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 22,
          color: "#f1dcb8",
          font: "600 18px 'DM Sans', sans-serif",
          letterSpacing: 2,
        }}
      >
        {role.toUpperCase()}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          insetInline: 0,
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          background: "#211713ed",
          color: "#f1dfbf",
          font: "18px 'DM Sans', sans-serif",
        }}
      >
        <span>{caption}</span>
        <strong style={{ color: colors[role], fontSize: 30 }}>
          {game.scores[role]}
        </strong>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Stage />);
