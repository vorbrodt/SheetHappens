# Jelly animation: Lottie vs Rive

KAN-16 looks at whether a hand-made animation file would raise the visual quality of the jelly beyond the procedural Reanimated version from KAN-8. It covers which runtime fits, what it takes to produce the asset, what a prototype swap showed, and a recommendation.

## Baseline

`src/components/jelly/Jelly.tsx` draws the jelly as a rounded square with three animation states, all driven by Reanimated:

- **Idle:** a looping scale wobble of 3.5 %.
- **Move:** a stretch-then-squash along the swipe axis, so it reacts to direction.
- **Paint:** a quick uniform squish.

The face (`JellyFace.tsx`) is a separate React Native overlay. Its eyes look toward the last move direction and it blinks at random intervals. The board, the menu background and the jelly preview screen all use the `Jelly` component. Callers trigger animations through `JellyHandle.playMove(direction)` and `playPaint()`.

The app runs on Expo SDK 57 (React Native 0.86). It runs in Expo Go, with no dev client and no `eas.json`, and it also bundles for web.

## Comparison

| | Lottie | Rive |
|---|---|---|
| Package | `lottie-react-native` ~7.3.8, the version SDK 57 pins | `@rive-app/react-native` 0.5.x, the new Nitro-based runtime that replaces `rive-react-native` |
| Expo Go | Works. It is one of the native modules Expo Go ships with | Does not work. It needs `expo-dev-client` and a development build |
| Maturity | Wraps lottie-ios and lottie-android, which have been in wide production use for years | The new runtime is still 0.x and needs `react-native-nitro-modules` >=0.35.10 <0.37 |
| Web | Needs `@lottiefiles/dotlottie-react`, and the web build ignores `colorFilters` | The package lists `@rive-app/canvas` as a peer dependency, which suggests a web path. Not verified |
| Bundle cost | Measured: the Android JS bundle grows by 10,915 bytes with the wrapper and the prototype asset. The native libraries were not measured | Not measured. It adds the Rive native runtime and Nitro Modules |
| Playback model | A timeline. Play, pause, progress, speed and frame segments. No inputs or state machine | State machines with trigger, boolean and number inputs, plus data binding through view models |
| Direction-aware move | Needs one segment or file per direction, or React Native transforms on top of the asset (the current approach) | A `direction` number input and a `move` trigger in one state machine |
| Paint squish trigger | Play a segment, or keep it procedural | A `paint` trigger input |
| Per-player color | `colorFilters` on a named layer, native only. The prototype uses this | A color property bound through a view model |
| Face | Stays a separate overlay and does not follow the asset's shape | Can be part of the rig, so the eyes ride the body, and blink and look-direction live in the state machine |
| Authoring tool | After Effects with the Bodymovin export, or the LottieFiles editor | The Rive editor |

Both runtimes can replace the idle loop. The difference shows up with the reactive states. The jelly's character comes from responding to direction and paint, and Rive's state machine maps onto `JellyHandle` almost one to one. Lottie can only play prerecorded timelines, so the reactive parts would stay procedural or be split into many segments.

## Producing the asset

Neither runtime removes the need for an animator. A coding agent can wire up a file and write a placeholder, but it cannot make the hand-crafted animation that would justify the switch. The prototype asset in this branch is a placeholder: three shape layers written straight as Lottie JSON. It proves the wiring, not the look.

A real asset needs someone working in one of these tools, to a contract the code can rely on:

- **Lottie:** After Effects with Bodymovin, or the LottieFiles editor. Use shape layers only, with no effects or expressions that lottie-ios or lottie-android cannot play. Use a square composition with the jelly's base at the bottom edge and a loop that ends on its first frame. Name the layer that takes the player color `Body`, and keep shading and highlights in separate layers, because the Android color filter flattens everything under the keypath to one color.
- **Rive:** the Rive editor, exported as `.riv`. Build one state machine with `move` (trigger), `direction` (number 0–3) and `paint` (trigger) inputs, and a view model with a `color` property. If the face moves into the rig, add eye and blink states too.

## Prototype

The `Jelly` component has a new optional `renderer` prop. `'procedural'` is the default and leaves the existing behavior unchanged. `'lottie'` replaces the rounded-square body and its idle wobble with `assets/animations/jelly-idle.json`.

- `JellyLottieBody.tsx` renders the asset with `LottieView`. It tints the `Body` layer with the jelly's color through `colorFilters`.
- `JellyLottieBody.web.tsx` keeps Lottie out of the web bundle. On web, `Jelly` falls back to the procedural body.
- Move and paint stay procedural. They scale the wrapping view, so they stack on top of the Lottie idle.
- `JellyHandle` and every existing caller are unchanged. Only the jelly preview screen opts in, with a second row of jellies that use the Lottie body.
- `lottieAsset.test.ts` checks the asset contract: exactly one `Body` layer, and a loop that ends where it starts.

The asset is a 100 × 100 dome at 60 fps over 108 frames (1.8 s), the same period as the procedural idle. Unlike the uniform scale, it moves between a tall and a squat silhouette while its base stays on the ground. A white shine and a soft shade sit in untinted layers above the body.

What the prototype shows:

- The swap fits behind the existing API with no rewrite. The body is one child view, and the transforms for gameplay reactions do not care what is inside it.
- Per-player tinting works through a layer keypath. Shading has to live in separate layers, so the authoring contract above is needed.
- The face does not follow the asset. Its eyes stay put while the top of the dome rises and falls by about a tenth of the jelly's height. That is fine for a gentle idle, but bigger hand-animated moves would leave the face looking detached. Rive solves this by putting the face in the rig. Lottie would need the eyes animated in the asset, which then loses the look-direction and random-blink behavior.

## Recommendation

Defer, and keep the procedural jelly as the default.

The procedural version already covers all three states. The two that matter for game feel, direction-aware movement and the paint squish, are the ones Lottie cannot improve without splitting the animation into many segments. The visual gain only arrives with an animator-made asset, and none exists or is planned yet.

When the project brings in a character animator, go to Rive rather than Lottie. One Rive file can hold the body, the face and a state machine whose inputs match `playMove(direction)` and `playPaint()`, with per-player color through data binding. The cost is that day-to-day development moves from Expo Go to a development build, which has to be rebuilt whenever native dependencies change. Lottie is only the better choice if staying in Expo Go is a hard requirement and only the idle loop needs upgrading.

Next steps when this is picked up again:

1. Commission a `.riv` file to the Rive contract above.
2. Add `expo-dev-client` and `@rive-app/react-native`, and make a development build.
3. Add a `'rive'` value to the `renderer` prop, backed by a `JellyRiveBody`, and compare all three rows on the jelly preview screen on a device.
4. Pick one asset path, and remove the other along with its dependency.
