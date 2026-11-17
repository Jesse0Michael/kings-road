import type { Transition } from "../scene/motion";
import { ROLL_MS } from "../scene/Dice";
import type { DiceRoll } from "../scene/Dice";
import { aiAction } from "../game/ai";
import React, { useEffect, useRef, useState } from "react";
import {
  act,
  rollDice,
  createGame,
  Game,
  neighbors,
  Role,
  roles,
} from "../game/engine";
import { journalRows } from "../game/journal";
import { Table, colors } from "../scene/Table";
import { history, loadGame, save } from "../persistence";
import { useGameAudio } from "../audio/useGameAudio";
import { Welcome, HowToPlay } from "../ui/Welcome";
import { analytics } from "../analytics";
export default function App() {
  const [game, setGame] = useState<Game | null>(loadGame);
  const [screen, setScreen] = useState<
    "home" | "game" | "rules" | "history" | "settings"
  >("home");
  useEffect(() => {
    analytics.screen(screen, game);
  }, [screen, game?.id]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  const {
    player: audio,
    preferences: audioPreferences,
    setLevel,
    audioError,
  } = useGameAudio();
  useEffect(() => {
    audio.setGame(game, screen === "game");
  }, [audio, game?.id, screen]);
  const [role, setRole] = useState<Role>("Runner");
  const [selected, setSelected] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const sequence = useRef(0),
    currentGame = useRef(game);
  const [diceRoll, setDiceRoll] = useState<DiceRoll | null>(() =>
    game?.dice.length
      ? {
          id: 0,
          role: game.turn,
          values: game.dice,
          started: 0,
          duration: 0,
          seed: game.seed,
        }
      : null,
  );
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (actionTimer.current) clearTimeout(actionTimer.current);
    },
    [],
  );
  function resetMotion() {
    audio.reset();
    if (actionTimer.current) clearTimeout(actionTimer.current);
    busy.current = false;
    setTransitions([]);
    setDiceRoll(null);
    setRolling(false);
  }
  const [error, setError] = useState("");
  const busy = useRef(false);
  const g = game;
  const events = g ? journalRows(g.log) : [];
  const human = g?.human === g?.turn;
  const remaining =
    g?.phase === "move"
      ? g.units.filter((u) => !g.moved.includes(u.id)).length
      : (g?.budget ?? 0);
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (g) {
      try {
        save(g);
      } catch {
        setError(
          "Your browser could not save this game. Progress will last only while this tab stays open.",
        );
      }
    }
  }, [g]);
  function commit(next: Game, action: Parameters<typeof act>[1]) {
    const before = currentGame.current;
    if (before && next !== before) {
      analytics.action(before, next, action);
      const transition = {
        id: ++sequence.current,
        before,
        after: next,
        at: performance.now(),
      };
      audio.transition(transition, reduced);
      setTransitions((list) => [...list, transition].slice(-80));
    }
    currentGame.current = next;
    setGame(next);
  }
  function dispatch(a: Parameters<typeof act>[1]) {
    const active = currentGame.current;
    if (!active || busy.current) return;
    const next = act(active, a);
    if (next === active) return;
    if (a.type === "roll") {
      const duration = reduced ? 0 : ROLL_MS;
      // Capture values before committing, so the fixed-face dice land before gameplay uses them.
      const roll = {
        id: ++sequence.current,
        role: active.turn,
        values: rollDice(active).dice,
        started: performance.now(),
        duration,
        seed: next.seed,
      };
      setDiceRoll(roll);
      audio.roll(roll);
      if (duration) {
        busy.current = true;
        setRolling(true);
        actionTimer.current = setTimeout(() => {
          if (currentGame.current === active) commit(next, a);
          busy.current = false;
          setRolling(false);
        }, duration + 80);
      } else commit(next, a);
    } else commit(next, a);
  }
  useEffect(() => {
    if (!g || screen !== "game" || human || g.winner || rolling) return;
    const timer = window.setTimeout(() => dispatch(aiAction(g)), 210);
    return () => clearTimeout(timer);
  }, [g, screen, rolling]);
  function node(n: number) {
    if (!g || !human || rolling) return;
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
    const fresh = createGame(role);
    analytics.start(fresh, currentGame.current);
    currentGame.current = fresh;
    setGame(fresh);
    setSelected(null);
    setScreen("game");
    setError("");
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
            ? "Place your walls across the roads. Each road holds up to five."
            : g.phase === "deploy"
              ? "Deploy your soldiers. Five per node; the Runner’s location is protected."
              : g.phase === "move"
                ? "Select a group, then a connected destination. Excess soldiers remain ready. Or hold position."
                : "Follow silver coins for points. Your starting location never scores this turn. End movement beneath your counter.";
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
        <Welcome
          role={role}
          onChoose={(nextRole) => {
            setRole(nextRole);
            analytics.role(nextRole);
          }}
          onStart={() => {
            if (
              g &&
              !g.winner &&
              !window.confirm(
                "Start a new game? Your current game will be replaced.",
              )
            )
              return;
            newGame();
          }}
        />
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
                  className={`score ${!g.winner && g.turn === r ? "current" : ""} ${g.winner === r ? "winner" : ""}`}
                  style={{ "--role": colors[r] } as React.CSSProperties}
                >
                  <span className="role-icon">
                    {r === "Builder" ? "▥" : r === "Army" ? "⚔" : "♟"}
                  </span>
                  <div>
                    <strong>{r}</strong>
                    <small>
                      {g.human === r ? "YOU" : "COMPUTER"}
                      {g.winner === r
                        ? " · WINNER"
                        : !g.winner && g.turn === r
                          ? " · AT PLAY"
                          : ""}
                    </small>
                  </div>
                  <b>{g.scores[r]}</b>
                </div>
              ))}
            </div>
            <Table
              game={g}
              onNode={node}
              onRoad={(road) => {
                if (human && !rolling) dispatch({ type: "wall", road });
              }}
              selected={selected}
              diceRoll={diceRoll}
              transitions={transitions}
            />
            {!g.winner &&
              ["build", "deploy", "run", "move"].includes(g.phase) && (
                <div
                  className="table-controls"
                  style={{ "--role": colors[g.turn] } as React.CSSProperties}
                >
                  <div
                    className="remaining-actions"
                    role="status"
                    aria-label={`${g.turn} remaining actions`}
                    aria-live={human ? "polite" : "off"}
                    aria-atomic="true"
                  >
                    <b>{remaining}</b>
                    <div>
                      <small>{g.turn}</small>
                      <span>
                        {g.phase === "build"
                          ? `${g.budget === 1 ? "Wall" : "Walls"} left`
                          : g.phase === "deploy"
                            ? `${g.budget === 1 ? "Soldier" : "Soldiers"} left`
                            : g.phase === "move"
                              ? `${remaining === 1 ? "Soldier" : "Soldiers"} ready`
                              : "Movement points left"}
                      </span>
                    </div>
                  </div>
                  {human && (g.phase === "run" || g.phase === "move") && (
                    <button
                      className="table-end"
                      disabled={rolling}
                      onClick={() => {
                        dispatch({ type: "end" });
                        setSelected(null);
                      }}
                    >
                      <span>
                        {g.phase === "move"
                          ? "Hold remaining soldiers"
                          : "End movement"}
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              )}
            {!g.winner && human && g.phase === "roll" && (
              <button
                className="roll-button board-roll"
                style={
                  {
                    "--role": colors[g.human],
                    "--role-ink": g.human === "Builder" ? "#302719" : "#fff2d8",
                  } as React.CSSProperties
                }
                disabled={rolling}
                aria-busy={rolling}
                onClick={() => dispatch({ type: "roll" })}
              >
                Roll
              </button>
            )}
            <div className="table-bottom">
              <span>STONE WALLS · CRIMSON SOLDIERS · TEAL TRAVELER</span>
            </div>
          </section>
          <aside>
            <section className="turn-panel">
              <div className="turn-summary">
                <div className="turn-copy">
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
                </div>
              </div>
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
              {g.winner && (
                <button className="primary" onClick={() => setScreen("home")}>
                  Back to the tavern →
                </button>
              )}
            </section>
            <section className="journal" aria-labelledby="journal-heading">
              <p className="eyebrow" id="journal-heading">
                WORD FROM THE ROAD
              </p>
              {events.length ? (
                <ol
                  className="journal-entries"
                  aria-label="Game events"
                  tabIndex={0}
                >
                  {events.map((event, i) => (
                    <li key={i}>
                      {event.round && <small>Round {event.round}</small>}
                      <p>{event.text}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="journal-empty">
                  The road awaits your first move.
                </p>
              )}
            </section>
          </aside>
        </main>
      )}
      {screen === "rules" && (
        <HowToPlay
          onReturn={() => setScreen(g ? "game" : "home")}
          returnLabel={g ? "the table" : "the tavern"}
        />
      )}
      {screen === "settings" && (
        <main className="paper">
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Table settings.</h1>
          <section className="audio-settings" aria-labelledby="sound-heading">
            <h2 id="sound-heading">Sound at the table</h2>
            {(["music", "effects"] as const).map((kind) => (
              <div className="volume-control" key={kind}>
                <div className="volume-label">
                  <label htmlFor={`${kind}-volume`}>
                    {kind === "music" ? "Music volume" : "Sound effects volume"}
                  </label>
                  <output htmlFor={`${kind}-volume`}>
                    {audioPreferences[kind]
                      ? `${audioPreferences[kind]}%`
                      : "Muted"}
                  </output>
                </div>
                <input
                  id={`${kind}-volume`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={audioPreferences[kind]}
                  aria-valuetext={
                    audioPreferences[kind]
                      ? `${audioPreferences[kind]} percent`
                      : "Muted"
                  }
                  onChange={(e) => setLevel(kind, Number(e.target.value))}
                  onPointerDown={(e) => {
                    if (kind === "effects")
                      e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerUp={() => {
                    if (kind === "effects") void audio.preview();
                  }}
                  onKeyUp={(e) => {
                    if (
                      kind === "effects" &&
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                        "Home",
                        "End",
                        "PageUp",
                        "PageDown",
                      ].includes(e.key)
                    )
                      void audio.preview();
                  }}
                />
              </div>
            ))}
            {audioError && <p role="status">{audioError}</p>}
          </section>
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
      <footer>
        <span>✦ KHYRIEL · KING’S ROAD</span>
        <span>A little strategy. A little fortune.</span>
      </footer>
    </div>
  );
}
