# Gameplay examples

Original silent captures of this project's renderer, models, textures, rules, and piece animations. No external footage or sound is used.

- **Builder:** roll 6 to purchase three walls; an Army sacrifice earns the Builder a point.
- **Army:** three soldiers attack one wall; one clears it and the other two reach the castle.
- **Runner:** collect points at II and III, then revisit II and the starting location I without scoring again.

Run `npm run examples:generate` with Chromium (or Playwright's bundled browser) and FFmpeg available. The generator starts a local Vite capture stage on port 5175, advances a controlled clock at 20 frames per second, and encodes 720×540 H.264 MP4s with no audio. Each clip lasts eight seconds. JPEG posters show the concluding example for reduced motion or blocked playback. Standard builds use these committed assets directly.

To refresh only one role, pass its name: `npm run examples:generate -- Runner`.

The capture stage is `scripts/examples.html` / `scripts/example-stage.tsx`; it is not part of the production entry. Example states never modify a player's saved game. The UI uses project-relative URLs and pauses videos offscreen and in hidden tabs.
