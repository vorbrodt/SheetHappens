import { JELLY_BODY_KEYPATH, JELLY_IDLE_ANIMATION } from './lottieAsset';

interface Keyframe {
  t: number;
  s?: unknown;
}

interface LottieLayer {
  nm: string;
  op: number;
  shapes: { it: { ty: string; ks?: { a: number; k: Keyframe[] } }[] }[];
}

const animation = JELLY_IDLE_ANIMATION as unknown as { ip: number; op: number; layers: LottieLayer[] };

describe('jelly idle Lottie asset', () => {
  it('has exactly one layer for the player color filter', () => {
    const bodyLayers = animation.layers.filter((layer) => layer.nm === JELLY_BODY_KEYPATH);
    expect(bodyLayers).toHaveLength(1);
  });

  it('loops seamlessly', () => {
    for (const layer of animation.layers) {
      expect(layer.op).toBe(animation.op);
    }

    const body = animation.layers.find((layer) => layer.nm === JELLY_BODY_KEYPATH)!;
    const path = body.shapes[0].it.find((item) => item.ty === 'sh')!;
    const keyframes = path.ks!.k;
    expect(keyframes[0].t).toBe(animation.ip);
    expect(keyframes[keyframes.length - 1].t).toBe(animation.op);
    expect(keyframes[keyframes.length - 1].s).toEqual(keyframes[0].s);
  });
});
