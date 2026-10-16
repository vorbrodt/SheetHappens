// lottie-react-native's web build needs @lottiefiles/dotlottie-react and ignores colorFilters,
// so the Lottie body is native-only and Jelly falls back to the procedural body on web.
export const LOTTIE_BODY_SUPPORTED = false;

export function JellyLottieBody(_props: { color: string }) {
  return null;
}
