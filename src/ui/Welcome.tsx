import type { CSSProperties } from "react";
import { roles, type Role, type Game } from "../game/engine";
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
  game,
  onStart,
  onContinue,
  onLearn,
}: {
  role: Role;
  onChoose: (r: Role) => void;
  game: Game | null;
  onStart: () => void;
  onContinue: () => void;
  onLearn: () => void;
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
            Choose one role. Face two computer rivals. Be the first to reach{" "}
            <strong>15 points.</strong>
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
          {game && (
            <button className="continue" onClick={onContinue}>
              Continue {game.human} game · Round {game.round} →
            </button>
          )}
          <button className="learn-link" onClick={onLearn}>
            See how the game works <span aria-hidden="true">→</span>
          </button>
          <p className="fine">
            One player · Two computer rivals · Automatically saved here
          </p>
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
      <section className="welcome-steps" aria-label="Getting started">
        <article>
          <span>01</span>
          <div>
            <h2>Choose your role</h2>
            <p>
              Build, command, or explore. Each role has its own way to score.
            </p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h2>Roll. Make your move.</h2>
            <p>
              Tap the board. Your remaining actions and turn controls stay on
              the table.
            </p>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h2>First to 15 wins</h2>
            <p>
              Builder → Army → Runner. Scores carry over as the rounds unfold.
            </p>
          </div>
        </article>
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
            One player. Two computer rivals. Three different ways to reach{" "}
            <strong>15 points.</strong>
          </p>
        </div>
        <button className="secondary" onClick={onReturn}>
          Back to {returnLabel} →
        </button>
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
            </div>
          </article>
        ))}
      </section>
      <section className="movement-guide">
        <div>
          <p className="eyebrow">THE RUNNER’S MOVEMENT</p>
          <h2>Every crossing has a cost.</h2>
          <p>
            Spend your rolled movement points to travel along the roads. You
            must afford the whole crossing. <strong>End movement</strong> is
            beneath your counter on the board. Capturing removes just one
            soldier, even from a group, and gives the Builder no point.
          </p>
        </div>
        <div className="movement-costs">
          <article>
            <b>1</b>
            <h3>Open road</h3>
            <p>Move to an empty location.</p>
          </article>
          <article>
            <b>2</b>
            <h3>One wall</h3>
            <p>Break the wall and cross. Each extra wall adds 2.</p>
          </article>
          <article>
            <b>2</b>
            <h3>A soldier ahead</h3>
            <p>Cross an open road and remove one soldier.</p>
          </article>
          <article>
            <b>3</b>
            <h3>Wall + soldier</h3>
            <p>Clear one wall, cross, and remove one soldier.</p>
          </article>
        </div>
      </section>
      <section className="learn-details">
        <article>
          <h2>Coins mean points.</h2>
          <p>
            The Runner’s starting location is excluded for the whole turn. Each
            other location has one silver coin, worth one point on your first
            visit. Its coin disappears when the traveler arrives; unvisited
            coins stay until the turn ends. A collected coin stays gone until
            your next turn. Colored rings show which moves you can afford right
            now.
          </p>
          <p>
            <strong>I → II → I → II earns just 1 point.</strong> II scores once.
            Returning to the start earns nothing. New turns reset the coins,
            excluding your new starting location.
          </p>
        </article>
        <article>
          <h2>Five is the limit.</h2>
          <p>
            Up to five walls per road and five soldiers per perimeter location.
            Army groups move together; soldiers without room stay behind and may
            try another road. A soldier that crosses cannot move again that
            turn.
          </p>
          <p>
            Deploy only on perimeter locations, away from the Runner. If every
            valid spot is full, leftover placements are discarded. The castle
            scores arriving soldiers and removes them immediately.
          </p>
        </article>
        <article>
          <h2>Make yourself at home.</h2>
          <p>
            Tap roads to build. Tap a group and its destination to march. Tap
            locations to deploy or explore.{" "}
            <strong>Hold remaining soldiers</strong> and{" "}
            <strong>End movement</strong> sit beneath your counter on the table.
            The labeled controls beside the board also let you place and move
            pieces.
          </p>
          <p>
            Your game saves automatically. Use Continue to come back; completed
            games go in the Chronicle. Adjust music, sound effects, and computer
            speed in Settings.
          </p>
        </article>
      </section>
      <button className="primary learn-return" onClick={onReturn}>
        Return to {returnLabel} →
      </button>
    </main>
  );
}
