import { expect, it } from "vitest";
import { act, createGame } from "../game/engine";
import { SoundTimeline } from "./timeline";
import { DEFAULT_AUDIO, parseAudioPreferences } from "./preferences";
import { diceContacts, diceCues } from "./dice";

it("places walls at impact and keeps independent placements close together", () => {
  const before = createGame("Builder", 17);
  before.phase = "build";
  before.budget = 4;
  const first = act(before, { type: "wall", road: 0 });
  const second = act(first, { type: "wall", road: 0 });
  const sound = new SoundTimeline();
  const a = sound.advance({ id: 1, before, after: first, at: 100 });
  const b = sound.advance({ id: 2, before: first, after: second, at: 200 });
  expect(a.map((c) => [c.sound, c.at])).toEqual([["wall-place", 430]]);
  expect(b.map((c) => [c.sound, c.at])).toEqual([["wall-place", 530]]);
});

it("queues capture and point sounds behind the Runner's actual second arrival", () => {
  const before = createGame("Runner", 17);
  before.turn = "Runner";
  before.phase = "run";
  before.budget = 8;
  before.units = [{ id: 1, node: 2 }];
  const first = act(before, { type: "run", node: 1 });
  const second = act(first, { type: "run", node: 2 });
  const sound = new SoundTimeline();
  sound.advance({ id: 1, before, after: first, at: 100 });
  const cues = sound.advance({ id: 2, before: first, after: second, at: 200 });
  expect(cues.find((c) => c.sound === "runner-move")!.at).toBe(820);
  expect(cues.find((c) => c.sound === "army-fall")!.at).toBeCloseTo(1424.8);
  expect(cues.find((c) => c.sound === "score")!.at).toBe(1553);
  expect(cues.filter((c) => c.sound === "score")).toHaveLength(1);
});

it("coalesces an Army group and distinguishes the castle from a death", () => {
  const before = createGame("Army", 17);
  before.turn = "Army";
  before.phase = "move";
  before.units = [
    { id: 1, node: 0 },
    { id: 2, node: 0 },
    { id: 3, node: 0 },
  ];
  const after = act(before, { type: "march", unit: 1, node: 5 });
  const cues = new SoundTimeline().advance({ id: 1, before, after, at: 100 });
  expect(cues.map((c) => c.sound)).toEqual(["army-move", "castle", "score"]);
  expect(cues.find((c) => c.sound === "castle")!.at).toBe(748);
  expect(after.scores.Army).toBe(3);
});

it("reset/import does not replay old sounds, and reduced motion has no queued delay", () => {
  const before = createGame("Runner", 17);
  before.turn = "Runner";
  before.phase = "run";
  before.budget = 8;
  before.units = [{ id: 1, node: 1 }];
  before.walls[0] = 2;
  const sound = new SoundTimeline();
  sound.reset(before);
  const after = act(before, { type: "run", node: 1 });
  const cues = sound.advance({ id: 1, before, after, at: 100 }, true);
  expect(cues.filter((c) => c.sound === "wall-break")).toHaveLength(1);
  expect(cues.every((c) => c.at === 100)).toBe(true);
  sound.reset(after);
  const next = act(after, { type: "end" });
  expect(sound.advance({ id: 2, before: after, after: next, at: 200 })).toEqual(
    [],
  );
});

it("preserves muted preferences and safely handles old or corrupt storage", () => {
  expect(parseAudioPreferences(null)).toEqual(DEFAULT_AUDIO);
  expect(parseAudioPreferences("bad json")).toEqual(DEFAULT_AUDIO);
  expect(parseAudioPreferences('{"music":0,"effects":0}')).toEqual({
    music: 0,
    effects: 0,
  });
  expect(parseAudioPreferences('{"music":1000,"effects":-4}')).toEqual({
    music: 100,
    effects: 0,
  });
  expect(parseAudioPreferences('{"music":35,"effects":"loud"}')).toEqual({
    music: 35,
    effects: 40,
  });
});

it("waits for actual dice contact and scales the cues with fast rolls", () => {
  for (const sides of [4, 6, 8] as const) {
    for (let value = 1; value <= sides; value++) {
      const contacts = diceContacts(sides, value);
      expect(contacts.length).toBeGreaterThan(0);
      expect(contacts.every((t) => t > 0.1 && t < 1)).toBe(true);
    }
  }
  const roll = {
    id: 1,
    role: "Builder" as const,
    values: [2, 2, 2],
    started: 1000,
    duration: 1900,
    seed: 7,
  };
  const cues = diceCues(roll);
  expect(cues).toHaveLength(1); // Simultaneous impacts do not triple the volume.
  expect(cues[0].at).toBeGreaterThan(1500);
  expect(diceCues({ ...roll, duration: 1200 })[0].at).toBeCloseTo(
    1000 + ((cues[0].at - 1000) * 1200) / 1900,
  );
  expect(diceCues({ ...roll, duration: 0 })[0].at).toBe(1000);
});
