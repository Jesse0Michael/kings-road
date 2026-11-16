import type { CSSProperties } from "react";
import { roles, type Role } from "../game/engine";
import { roleColors } from "../scene/Dice";
import { GameplayClip } from "./GameplayClip";
import "./learn.css";

const guide = {
  Builder: {
    icon: "▥",
    dice: "3 × d4",
    title: "Make every road a fortress.",
    turn: "Roll three four-sided dice. Every 2 rolled points buys one wall. Tap a road to build.",
    score: "Score 1 when a soldier sacrifices itself against your wall.",
    note: "Placing a wall earns no points by itself. Put defenses where the Army needs to go.",
  },
  Army: {
    icon: "⚔",
    dice: "2 × d6",
    title: "Send your soldiers to the castle.",
    turn: "Move your existing groups one road, or hold them. Then roll two six-sided dice and place that many new soldiers.",
    score: "Score 1 for each soldier that reaches the central castle.",
    note: "Each wall stops one soldier. The survivors continue. New soldiers move on your next turn.",
  },
  Runner: {
    icon: "♟",
    dice: "1 × d8",
    title: "Follow the silver.",
    turn: "Roll one eight-sided die for movement points. Tap a connected location to travel. Stop whenever you like.",
    score: "Score 1 the first time you enter each new location this turn.",
    note: "Silver coins mark points you can still earn. Your starting location never scores that turn, even on a return.",
  },
} satisfies Record<
  Role,
  {
    icon: string;
    dice: string;
    title: string;
    turn: string;
    score: string;
    note: string;
  }
>;

export function Welcome({
  role,
  onChoose,
  onStart,
}: {
  role: Role;
  onChoose: (r: Role) => void;
  onStart: () => void;
}) {
  return (
    <main className="welcome">
      <section className="landing">
        <div className="intro">
          <p className="eyebrow">A TAVERN GAME FOR THREE RIVALS</p>
          <h1>
            Every road
            <br />
            leads to a <em>rival.</em>
          </h1>
          <p className="lede">
            Choose one role. Be the first to reach <strong>15 points.</strong>
          </p>
          <p className="eyebrow choose-role">TAKE YOUR SIDE OF THE TABLE</p>
          <div className="role-picker" aria-label="Choose your role">
            {roles.map((r) => (
              <button
                key={r}
                className={role === r ? "chosen" : ""}
                style={{ "--role": roleColors[r] } as CSSProperties}
                onClick={() => onChoose(r)}
                aria-pressed={role === r}
              >
                <span aria-hidden="true">{guide[r].icon}</span>
                {r}
                <small>{guide[r].dice}</small>
              </button>
            ))}
          </div>
          <p className="role-description">{guide[role].score}</p>
          <button className="primary" onClick={onStart}>
            Take your seat as {role} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div
          className="role-preview"
          style={{ "--role": roleColors[role] } as CSSProperties}
        >
          <div className="preview-heading">
            <span className="eyebrow">{role} IN ACTION</span>
            <span>{guide[role].dice}</span>
          </div>
          <GameplayClip key={role} role={role} />
          <div className="preview-copy">
            <h2>{guide[role].title}</h2>
            <p>{guide[role].note}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export function HowToPlay({
  onReturn,
  returnLabel,
}: {
  onReturn: () => void;
  returnLabel: string;
}) {
  return (
    <main className="learn-page">
      <div className="learn-heading">
        <div>
          <p className="eyebrow">PULL UP A CHAIR</p>
          <h1>The rules of the road.</h1>
          <p>
            Three different ways to reach <strong>15 points.</strong>
          </p>
        </div>
      </div>
      <div className="turn-order" aria-label="Turn order">
        {roles.map((role, i) => (
          <span
            key={role}
            style={{ "--role": roleColors[role] } as CSSProperties}
          >
            <b>{i + 1}</b>
            {role}
            {i < 2 && <i aria-hidden="true">→</i>}
          </span>
        ))}
        <small>Repeat each round · First to 15 wins immediately</small>
      </div>
      <section className="role-guides" aria-label="Learn each role">
        {roles.map((role) => (
          <article
            className="role-guide"
            key={role}
            style={{ "--role": roleColors[role] } as CSSProperties}
          >
            <div className="guide-title">
              <h2>{role}</h2>
              <span>{guide[role].dice}</span>
            </div>
            <GameplayClip role={role} />
            <div className="guide-copy">
              <h3>Your turn</h3>
              <p>{guide[role].turn}</p>
              <p className="score-rule">
                <strong>+1</strong>
                <span>{guide[role].score}</span>
              </p>
              <p className="guide-note">{guide[role].note}</p>
              <section className="guide-detail">
                {role === "Builder" ? (
                  <>
                    <h3>Up to 5 walls per road</h3>
                    <p>
                      Walls stay until destroyed. Tap a road or an existing wall
                      to build. If every road is full, unused walls are
                      discarded.
                    </p>
                  </>
                ) : role === "Army" ? (
                  <>
                    <h3>Up to 5 soldiers per location</h3>
                    <p>
                      Deploy on perimeter locations, away from the Runner.
                      Soldiers that won’t fit when a group moves stay behind and
                      can try another road.
                    </p>
                    <p>
                      Castle arrivals score and leave the board. If every
                      deployment spot is full, unused reinforcements are
                      discarded.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Movement costs</h3>
                    <dl className="movement-costs">
                      {[
                        ["Open road", 1],
                        ["One wall", 2],
                        ["Open road + soldier", 2],
                        ["One wall + soldier", 3],
                      ].map(([label, cost]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>
                            {cost} <small>MP</small>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p>
                      Crossing clears every wall; each extra wall adds 2. Remove
                      one soldier on entry, with no Builder point. You must
                      afford the whole crossing.
                    </p>
                  </>
                )}
              </section>
            </div>
          </article>
        ))}
      </section>
      <button className="primary learn-return" onClick={onReturn}>
        Return to {returnLabel} →
      </button>
    </main>
  );
}
