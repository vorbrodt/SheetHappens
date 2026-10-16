// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // The game engine stays pure TypeScript so a future game server can run it as-is.
    files: ["src/game/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "react-native", "react-native-*", "@react-native/*", "expo", "expo-*", "@expo/*", "zustand"],
              message: "src/game is the pure game engine: no React, React Native, Expo or store imports.",
            },
          ],
        },
      ],
    },
  },
]);
