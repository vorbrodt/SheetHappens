import LottieView from 'lottie-react-native';
import { StyleSheet } from 'react-native';

import { JELLY_BODY_KEYPATH, JELLY_IDLE_ANIMATION } from './lottieAsset';

export const LOTTIE_BODY_SUPPORTED = true;

interface JellyLottieBodyProps {
  color: string;
}

export function JellyLottieBody({ color }: JellyLottieBodyProps) {
  return (
    <LottieView
      source={JELLY_IDLE_ANIMATION}
      autoPlay
      loop
      resizeMode="contain"
      colorFilters={[{ keypath: JELLY_BODY_KEYPATH, color }]}
      style={StyleSheet.absoluteFill}
    />
  );
}
