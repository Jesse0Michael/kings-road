import { MOTION_MS } from "../scene/motion";
import { aiAction } from "../game/ai";
import React, { useEffect, useRef, useState } from "react";
import {
  NODE_CAP,
  WALL_CAP,
  unitCount,
  act,
  createGame,
  Game,
  neighbors,
  Role,
  roles,
  runCost,
} from "../game/engine";
import { Table, colors } from "../scene/Table";
import { history, loadGame, save, validGame } from "../persistence";
const labels = ["I", "II", "III", "IV", "V", "♜"];
const descriptions = {
  Builder:
    "Raise walls. Shape the battlefield. Earn points when soldiers sacrifice themselves.",
  Army: "Command your soldiers. Breach the defenses. Reach the castle.",
  Runner: "Explore the roads. Break walls and evade the armies.",
};
export default function App() {
  const [game, setGame] = useState<Game | null>(loadGame);
  const [screen, setScreen] = useState<
    "home" | "game" | "rules" | "history" | "settings"
  >("home");
  const [role, setRole] = useState<Role>("Runner");
  const [selected, setSelected] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
    },
    [],
  );
  function resetMotion() {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    busy.current = false;
    setAnimating(false);
    setRolling(false);
  }
  const [fast, setFast] = useState(() => {
    try {
      return localStorage.getItem("kings-road.fast") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("kings-road.fast", String(fast));
    } catch {
      /* The game save warning handles unavailable storage. */
    }
  }, [fast]);
  const [error, setError] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const g = game;
  const human = g?.human === g?.turn;
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (g) {
      try {
        save(g);
      } catch {
        setError(
          "Your browser could not save this game. Export a backup before leaving.",
        );
      }
    }
  }, [g]);
  function dispatch(a: Parameters<typeof act>[1]) {
    if (!g || busy.current) return;
    if (a.type === "roll" && !reduced) {
      busy.current = true;
      setRolling(true);
      actionTimer.current = window.setTimeout(
        () => {
          setGame((v) =>
            v && v.id === g.id && v.turn === g.turn && v.phase === g.phase
              ? act(v, a)
              : v,
          );
          setRolling(false);
          busy.current = false;
        },
        fast ? 180 : 850,
      );
    } else {
      const next = act(g, a);
      if (next === g) return;
      setGame(next);
      if (!reduced && ["wall", "deploy", "march", "run"].includes(a.type)) {
        busy.current = true;
        setAnimating(true);
        actionTimer.current = setTimeout(() => {
          busy.current = false;
          setAnimating(false);
        }, MOTION_MS + 70);
      }
    }
  }
  useEffect(() => {
    if (!g || screen !== "game" || human || g.winner || rolling || animating)
      return;
    const timer = window.setTimeout(
      () => dispatch(aiAction(g)),
      fast ? 65 : 400,
    );
    return () => clearTimeout(timer);
  }, [g, screen, rolling, animating, fast]);
  function node(n: number) {
    if (!g || !human || rolling || animating) return;
    if (g.phase === "deploy") dispatch({ type: "deploy", node: n });
    else if (g.phase === "run") dispatch({ type: "run", node: n });
    else if (g.phase === "move") {
      if (selected !== null && neighbors(selected).includes(n)) {
        const u = g.units.find(
          (u) => u.node === selected && !g.moved.includes(u.id),
        );
        if (u) {
          dispatch({ type: "march", unit: u.id, node: n });
          return;
        }
      }
      setSelected(n);
    }
  }
  function newGame() {
    resetMotion();
    setGame(createGame(role));
    setSelected(null);
    setScreen("game");
    setError("");
  }
  function exportGame() {
    if (!g) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(g, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "kings-road-save.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importGame(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error();
      const parsed = JSON.parse(await file.text());
      if (!validGame(parsed)) throw Error();
      resetMotion();
      setGame(parsed);
      setScreen("game");
      setError("");
    } catch {
      setError("That file is not a valid King’s Road save.");
    }
    if (upload.current) upload.current.value = "";
  }
  const hint = !g
    ? ""
    : g.winner
      ? `${g.winner} claims the King’s Road.`
      : !human
        ? `${g.turn} is considering the road ahead…`
        : g.phase === "roll"
          ? `Roll your ${g.turn === "Builder" ? "3d4" : g.turn === "Army" ? "2d6" : "d8"} to begin.`
          : g.phase === "build"
            ? `Place ${g.budget} more ${g.budget === 1 ? "wall" : "walls"} across the roads.`
            : g.phase === "deploy"
              ? `Deploy ${g.budget} soldiers. Five per node; the Runner’s location is protected.`
              : g.phase === "move"
                ? "Select a group, then a connected destination. Excess soldiers remain ready. Or hold position."
                : `${g.budget} movement points. Choose a connected location or end your turn.`;
  return (
    <div className="app">
      <header>
        <button className="brand" onClick={() => setScreen("home")}>
          <span className="crown">♛</span>
          <span>
            KING’S ROAD<small>A TAVERN GAME OF KHYRIEL</small>
          </span>
        </button>
        <nav>
          <button
            className={screen === "settings" ? "active" : ""}
            onClick={() => setScreen("settings")}
          >
            Settings
          </button>
          <button
            className={screen === "history" ? "active" : ""}
            onClick={() => setScreen("history")}
          >
            Chronicle
          </button>
          <button onClick={() => setScreen("rules")}>How to play</button>
          {g && screen !== "game" && (
            <button onClick={() => setScreen("game")}>Return to table</button>
          )}
        </nav>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {screen === "home" && (
        <main className="landing">
          <section className="intro">
            <p className="eyebrow">THREE ROLES. ONE KINGDOM.</p>
            <h1>
              Every road
              <br />
              leads to a <em>rival.</em>
            </h1>
            <p className="lede">
              A game of walls, conquest, and wandering. Pull up a chair at the
              tavern table. The kingdom is yours to contest.
            </p>
            <div className="role-picker">
              {roles.map((r) => (
                <button
                  key={r}
                  className={role === r ? "chosen" : ""}
                  style={{ "--role": colors[r] } as React.CSSProperties}
                  onClick={() => setRole(r)}
                >
                  <span>
                    {r === "Builder" ? "▥" : r === "Army" ? "⚔" : "♟"}
                  </span>
                  {r}
                  <small>
                    {r === "Builder"
                      ? "3 × d4"
                      : r === "Army"
                        ? "2 × d6"
                        : "1 × d8"}
                  </small>
                </button>
              ))}
            </div>
            <p className="role-description">{descriptions[role]}</p>
            <button
              className="primary"
              onClick={() => {
                if (
                  g &&
                  !g.winner &&
                  !window.confirm(
                    "Start a new game? Your current game will be replaced. Export it first if you want to keep it.",
                  )
                )
                  return;
                newGame();
              }}
            >
              Take your seat as {role} <span>→</span>
            </button>
            {g && (
              <button className="continue" onClick={() => setScreen("game")}>
                Continue {g.human} game · Round {g.round} →
              </button>
            )}
            <p className="fine">
              One human · Two computer rivals · Saved on this browser
            </p>
            <button
              className="text-button"
              onClick={() => upload.current?.click()}
            >
              Import a saved game
            </button>
          </section>
          <div className="hero-board">
            <Table
              game={g || createGame("Runner", 42)}
              onNode={() => {}}
              onRoad={() => {}}
              selected={null}
              rolling={false}
            />
            <div className="hero-caption">
              <span>THE CARVED TABLE COLLECTION</span>
              <strong>A familiar game. An uncertain road.</strong>
            </div>
          </div>
        </main>
      )}
      {screen === "game" && g && (
        <main className="play">
          <section className="table-area">
            <div className="table-topline">
              <span className="eyebrow">THE KING’S TABLE</span>
              <span>
                ROUND {String(g.round).padStart(2, "0")} <b>•</b> FIRST TO 15
              </span>
            </div>
            <div className="scores board-scoreboard" aria-label="Game scores">
              {roles.map((r) => (
                <div
                  key={r}
                  className={`score ${g.turn === r ? "current" : ""}`}
                  style={{ "--role": colors[r] } as React.CSSProperties}
                >
                  <span className="role-icon">
                    {r === "Builder" ? "▥" : r === "Army" ? "⚔" : "♟"}
                  </span>
                  <div>
                    <strong>{r}</strong>
                    <small>
                      {g.human === r ? "YOU" : "COMPUTER"}
                      {g.turn === r ? " · AT PLAY" : ""}
                    </small>
                  </div>
                  <b>
                    {g.scores[r]}
                    <small>/ 15</small>
                  </b>
                </div>
              ))}
            </div>
            <Table
              game={g}
              onNode={node}
              onRoad={(road) => {
                if (human && !rolling && !animating)
                  dispatch({ type: "wall", road });
              }}
              selected={selected}
              rolling={rolling}
            />
            <div className="table-bottom">
              <span>STONE WALLS · CRIMSON SOLDIERS · TEAL TRAVELER</span>
              <button onClick={exportGame}>Export save ↗</button>
            </div>
          </section>
          <aside>
            <section className="turn-panel">
              {animating && (
                <p className="eyebrow" role="status">
                  Pieces settling…
                </p>
              )}
              <p className="eyebrow">
                {g.winner
                  ? "THE GAME IS WON"
                  : human
                    ? "YOUR TURN"
                    : "RIVAL’S TURN"}
              </p>
              <h2>
                {g.winner
                  ? `${g.winner} prevails`
                  : g.turn === "Builder"
                    ? "Raise your defenses"
                    : g.turn === "Army"
                      ? "March on the castle"
                      : "Follow the road"}
              </h2>
              <p aria-live="polite">{hint}</p>
              {g.dice.length > 0 && (
                <div className="dice-results" aria-label="Dice results">
                  {g.dice.map((d, i) => (
                    <span key={i} style={{ borderColor: colors[g.turn] }}>
                      {d}
                    </span>
                  ))}
                  <small>{g.dice.reduce((a, b) => a + b, 0)} total</small>
                </div>
              )}
              {!g.winner && human && g.phase === "roll" && (
                <button
                  className="primary"
                  disabled={rolling || animating}
                  onClick={() => dispatch({ type: "roll" })}
                >
                  {rolling ? "Rolling…" : "Roll the dice"} <span>◇</span>
                </button>
              )}
              {!g.winner &&
                human &&
                (g.phase === "run" || g.phase === "move") && (
                  <button
                    className="secondary"
                    disabled={rolling || animating}
                    onClick={() => {
                      dispatch({ type: "end" });
                      setSelected(null);
                    }}
                  >
                    {g.phase === "move"
                      ? "Hold remaining soldiers"
                      : "End movement"}{" "}
                    →
                  </button>
                )}
              {g.winner && (
                <button className="primary" onClick={() => setScreen("home")}>
                  Back to the tavern →
                </button>
              )}
            </section>
            {human && !g.winner && g.phase === "build" && (
              <div className="action-grid roads">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    disabled={rolling || animating || g.walls[i] >= WALL_CAP}
                    onClick={() => dispatch({ type: "wall", road: i })}
                  >
                    {labels[i < 5 ? i : i - 5]} —{" "}
                    {labels[i < 5 ? (i + 1) % 5 : 5]}{" "}
                    <small>{g.walls[i]} walls</small>
                  </button>
                ))}
              </div>
            )}
            {human &&
              !g.winner &&
              ["move", "deploy", "run"].includes(g.phase) && (
                <div className="locations">
                  <p className="eyebrow">
                    {g.phase === "move"
                      ? "SELECT OR MOVE SOLDIERS"
                      : "CHOOSE A LOCATION"}
                  </p>
                  <div className="action-grid">
                    {labels.map((label, n) => {
                      const count = g.units.filter((u) => u.node === n).length;
                      const unavailable =
                        g.phase === "deploy"
                          ? n === 5 ||
                            n === g.runner ||
                            unitCount(g, n) >= NODE_CAP
                          : g.phase === "run"
                            ? runCost(g, n) > g.budget
                            : false;
                      return (
                        <button
                          key={n}
                          disabled={rolling || animating || unavailable}
                          className={selected === n ? "selected" : ""}
                          onClick={() => node(n)}
                        >
                          {label}
                          <small>
                            {g.phase === "run"
                              ? runCost(g, n) === Infinity
                                ? "—"
                                : `${runCost(g, n)} MP${g.scored.includes(n) ? "" : " · +1"}`
                              : `${count} soldiers`}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            <div className="board-counts">
              {labels.map((label, n) => (
                <span key={n}>
                  {label} <b>{g.units.filter((u) => u.node === n).length}</b>
                  {g.runner === n ? " ♟" : ""}
                </span>
              ))}
            </div>

            <section className="journal">
              <p className="eyebrow">WORD FROM THE ROAD</p>
              {g.log.slice(0, 5).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </section>
          </aside>
        </main>
      )}
      {screen === "rules" && (
        <main className="paper">
          <p className="eyebrow">A TRADITION OF KHYRIEL</p>
          <h1>The rules of the road.</h1>
          <p>
            Three roles take turns: Builder → Army → Runner. First to 15 points
            wins immediately.
          </p>
          {roles.map((r) => (
            <section key={r}>
              <h2 style={{ color: colors[r] }}>{r}</h2>
              <p>
                {r === "Builder"
                  ? "Roll 3d4. Every two points buys one wall on any road. Each road holds at most five walls. A soldier sacrificed against a wall earns you one point. Unspent odd construction points are discarded."
                  : r === "Army"
                    ? "Move each existing group at most one road, or let it hold position. Each node holds at most five soldiers; excess stay at the origin and can try another road. Soldiers that cross cannot move again this turn. An unobstructed arrival at the castle scores one point and removes the soldier. Crossing a blocked road sacrifices the soldier to remove one wall, scoring one point for the Builder. Then roll 2d6 and deploy that many soldiers among perimeter locations, excluding the Runner’s location."
                    : "Roll 1d8 for movement. An open road costs one point; a road with walls costs two points per wall, including the crossing, and destroys all its walls. Entering an occupied location removes one soldier, with no Builder point. You may end movement early."}
              </p>
            </section>
          ))}
          <h2>Exploration</h2>
          <p>
            The Runner earns one point for each unique location entered during
            its turn. The starting location is already visited. Revisiting any
            location in the same turn earns no extra points, even after visiting
            all six. The visited set resets at the start of the next Runner
            turn; total scores carry over between rounds.
          </p>
          <h2>At the table</h2>
          <p>
            Click roads to build walls. For the Army, select a location with an
            unmoved soldier and then an adjacent destination; repeat for each
            soldier. Click locations to deploy or move the Runner. The labeled
            controls beside the board offer the same actions. Location VI is the
            central castle, marked ♜.
          </p>
          <h2>Your chronicle</h2>
          <p>
            Games save automatically in this browser. Export a save to move it
            between devices. Clearing browser storage removes local games. This
            prototype preserves the original asymmetric rules; opponents and
            scoring are not balanced.
          </p>
          <button
            className="primary"
            onClick={() => setScreen(g ? "game" : "home")}
          >
            Return to {g ? "the table" : "the tavern"} →
          </button>
        </main>
      )}
      {screen === "settings" && (
        <main className="paper">
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Table settings.</h1>
          <p>Preferences are remembered on this browser.</p>{" "}
          <label className="speed">
            <input
              type="checkbox"
              checked={fast}
              onChange={(e) => setFast(e.target.checked)}
            />{" "}
            Fast computer turns
          </label>
          <p>
            Fast turns shorten computer pauses and dice animations. Turn this
            off to enjoy a slower tavern pace.
          </p>
          <button
            className="primary"
            onClick={() => setScreen(g ? "game" : "home")}
          >
            Return to {g ? "the table" : "the tavern"} →
          </button>
        </main>
      )}
      {screen === "history" && (
        <main className="paper">
          <p className="eyebrow">THE TAVERN REMEMBERS</p>
          <h1>Your chronicle.</h1>
          <p>Completed games played on this browser.</p>
          {history().length === 0 ? (
            <div className="empty">
              <span>♛</span>
              <h2>Your story is still unwritten.</h2>
              <p>Finish a game to record its winner and final scores.</p>
            </div>
          ) : (
            history().map((r) => (
              <article className="result" key={r.id}>
                <div>
                  <h2>{r.winner} prevailed</h2>
                  <p>
                    {new Date(r.date).toLocaleDateString()} · {r.round} rounds ·
                    You played {r.human}
                  </p>
                </div>
                <p>
                  {roles.map((role) => `${role} ${r.scores[role]}`).join(" · ")}
                </p>
              </article>
            ))
          )}
          <button className="primary" onClick={() => setScreen("home")}>
            Take a seat →
          </button>
        </main>
      )}
      <input
        hidden
        type="file"
        accept="application/json,.json"
        ref={upload}
        onChange={(e) => importGame(e.target.files?.[0])}
      />
      <footer>
        <span>✦ KHYRIEL · KING’S ROAD</span>
        <span>A little strategy. A little fortune.</span>
      </footer>
    </div>
  );
}
