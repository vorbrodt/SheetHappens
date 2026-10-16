import jellyIdle from '../../../assets/animations/jelly-idle.json';

export const JELLY_IDLE_ANIMATION = jellyIdle;

// Layer in jelly-idle.json that takes the player color. LottieView colorFilters match this
// layer and everything under it, so the Shine and Shade layers keep their own colors.
export const JELLY_BODY_KEYPATH = 'Body';
