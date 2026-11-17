import { expect, it } from "vitest";
import { analyticsConfig } from "./config";
it.each([
  [undefined, "game.example", true, "game.example", false, false],
  ["invalid", "game.example", true, "game.example", false, false],
  ["G-NEW123", undefined, true, "game.example", false, false],
  ["G-NEW123", "game.example", true, "localhost", false, false],
  ["G-NEW123", "game.example", true, "game.example", false, true],
  ["G-TEST000001", "game.example", false, "localhost", false, false],
  ["G-TEST000001", "game.example", false, "localhost", true, true],
  ["G-NEW123", "game.example", true, "localhost", true, false],
] as const)(
  "gates collection for %s on %s",
  (id, host, production, current, debug, enabled) => {
    expect(analyticsConfig(id, host, production, current, debug).enabled).toBe(
      enabled,
    );
  },
);
