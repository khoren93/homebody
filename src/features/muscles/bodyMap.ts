import type { MuscleId } from '@/data';

/**
 * A stylized 2D figure for the muscle map, drawn in a 200 × 450 box with the
 * body centred on x = 100. Left-half shapes are drawn once and mirrored, so
 * both sides always match.
 */
export const BODY_VIEWBOX = '0 0 200 450';

export type BodyShape = {
  d: string;
  /** Drawn on the left and mirrored to the right. */
  mirrored: boolean;
};

export type MuscleZone = BodyShape & { muscle: MuscleId };

export type BodySide = 'front' | 'back';

/** The head, drawn as an ellipse; the rest of the silhouette are paths. */
export const HEAD = { cx: 100, cy: 30, rx: 16.5, ry: 20 };

/** The silhouette behind the muscle zones. */
export const SILHOUETTE: readonly BodyShape[] = [
  { d: 'M90 44 L110 44 L112 66 L88 66 Z', mirrored: false },
  {
    d: 'M66 68 Q100 60 134 68 Q146 72 150 86 Q152 98 148 108 Q140 130 134 140 Q130 162 131 182 Q136 198 137 214 L63 214 Q64 198 69 182 Q70 162 66 140 Q60 130 52 108 Q48 98 50 86 Q54 72 66 68 Z',
    mirrored: false,
  },
  {
    d: 'M52 84 Q42 92 42 112 Q40 136 44 162 Q46 168 52 168 Q60 166 62 160 Q66 134 66 108 Z',
    mirrored: true,
  },
  {
    d: 'M44 160 Q34 186 34 214 Q34 228 38 236 L50 236 Q54 222 58 204 Q62 184 61 162 Z',
    mirrored: true,
  },
  { d: 'M37 232 Q33 242 34 254 Q36 266 42 270 Q49 270 51 260 Q52 246 50 234 Z', mirrored: true },
  {
    d: 'M64 200 Q58 230 60 266 Q62 296 68 320 Q72 330 80 332 Q90 332 94 322 Q99 290 99.5 252 L100 210 Z',
    mirrored: true,
  },
  {
    d: 'M68 318 Q60 344 63 374 Q66 398 70 414 L88 414 Q92 392 93 366 Q94 340 93 318 Z',
    mirrored: true,
  },
  { d: 'M69 410 Q62 420 64 428 Q70 434 84 434 Q92 432 91 424 Q90 416 88 410 Z', mirrored: true },
];

const FRONT: readonly MuscleZone[] = [
  { muscle: 'neck', mirrored: true, d: 'M92 47 Q94 57 99 66 L95 67 Q90 60 89.5 50 Z' },
  { muscle: 'traps', mirrored: true, d: 'M89 58 Q80 63 68 69 Q80 71 92 68 Z' },
  {
    muscle: 'shoulders',
    mirrored: true,
    d: 'M67 70 Q53 72 49 86 Q48 100 53 109 Q57 96 63 88 Q68 80 74 74 Z',
  },
  {
    muscle: 'chest',
    mirrored: true,
    d: 'M99 75 L76 74 Q66 80 64 92 Q64 108 72 117 Q84 124 99 118 Z',
  },
  {
    muscle: 'biceps',
    mirrored: true,
    d: 'M53 111 Q45 124 45 142 Q46 156 51 163 Q58 160 61 148 Q63 130 61 114 Q58 106 53 111 Z',
  },
  {
    muscle: 'forearms',
    mirrored: true,
    d: 'M45 168 Q37 186 37 208 Q37 222 40 230 L48 230 Q53 214 57 196 Q59 180 57 168 Q52 164 45 168 Z',
  },
  {
    muscle: 'abs',
    mirrored: false,
    d: 'M89 123 Q100 126 111 123 L113 186 Q107 196 100 197 Q93 196 87 186 Z',
  },
  {
    muscle: 'abs',
    mirrored: true,
    d: 'M86 124 Q76 124 71 129 Q70 150 72 168 Q75 184 85 193 Q83 160 86 124 Z',
  },
  {
    muscle: 'quads',
    mirrored: true,
    d: 'M69 214 Q62 238 63 266 Q65 294 72 318 Q80 326 88 322 Q93 302 93 276 Q92 248 86 222 Q78 212 69 214 Z',
  },
  {
    muscle: 'adductors',
    mirrored: true,
    d: 'M88 214 Q98 216 99.5 226 L99 248 Q98 266 95 282 Q94 254 88 214 Z',
  },
  {
    muscle: 'calves',
    mirrored: true,
    d: 'M69 340 Q63 358 65 380 Q68 398 73 406 L80 406 Q86 386 88 362 Q89 346 87 336 Q78 332 69 340 Z',
  },
];

const BACK: readonly MuscleZone[] = [
  {
    muscle: 'traps',
    mirrored: false,
    d: 'M100 46 L91 56 Q80 64 67 70 Q80 76 89 86 Q95 100 100 124 Q105 100 111 86 Q120 76 133 70 Q120 64 109 56 Z',
  },
  {
    muscle: 'shoulders',
    mirrored: true,
    d: 'M66 72 Q53 74 49 87 Q48 100 53 109 Q57 96 64 89 Q70 82 76 76 Z',
  },
  {
    muscle: 'triceps',
    mirrored: true,
    d: 'M53 111 Q45 124 45 142 Q46 156 51 163 Q58 160 61 148 Q63 130 61 114 Q58 106 53 111 Z',
  },
  {
    muscle: 'forearms',
    mirrored: true,
    d: 'M45 168 Q37 186 37 208 Q37 222 40 230 L48 230 Q53 214 57 196 Q59 180 57 168 Q52 164 45 168 Z',
  },
  {
    muscle: 'middle_back',
    mirrored: true,
    d: 'M87 89 L93.5 103 L98.5 124 Q91 130 84 127 Q79 114 80 102 Q82 93 87 89 Z',
  },
  {
    muscle: 'lats',
    mirrored: true,
    d: 'M77 79 Q66 90 66 110 Q66 132 72 152 Q78 168 86 174 Q89 156 90 140 Q86 134 81 129 Q76 116 77 102 Q79 91 85 86 Q81 81 77 79 Z',
  },
  {
    muscle: 'lower_back',
    mirrored: false,
    d: 'M93 132 Q100 128 107 132 Q109 160 110 186 Q105 193 100 193 Q95 193 90 186 Q91 160 93 132 Z',
  },
  {
    muscle: 'abductors',
    mirrored: true,
    d: 'M70 186 Q64 196 65 210 Q72 200 84 196 Q78 186 70 186 Z',
  },
  {
    muscle: 'glutes',
    mirrored: true,
    d: 'M66 210 Q62 228 70 242 Q84 252 99.5 244 L99.5 202 Q90 196 80 198 Q70 202 66 210 Z',
  },
  {
    muscle: 'hamstrings',
    mirrored: true,
    d: 'M66 250 Q62 278 66 304 Q72 322 82 324 Q92 318 95 296 Q97 272 96 254 Q84 256 66 250 Z',
  },
  {
    muscle: 'calves',
    mirrored: true,
    d: 'M68 334 Q61 352 64 374 Q69 394 77 402 Q86 394 90 374 Q93 350 89 334 Q78 328 68 334 Z',
  },
];

/** Clickable muscle zones of each view. A muscle can have several zones. */
export const ZONES: Record<BodySide, readonly MuscleZone[]> = { front: FRONT, back: BACK };

/** Anatomy lines drawn over the zones; they are not interactive. */
export const DETAIL_LINES: Record<BodySide, readonly BodyShape[]> = {
  front: [
    { d: 'M100 124 L100 194', mirrored: false },
    { d: 'M89 141 Q100 143 111 141', mirrored: false },
    { d: 'M88 158 Q100 160 112 158', mirrored: false },
    { d: 'M88 174 Q100 176 112 174', mirrored: false },
    { d: 'M78 324 Q84 330 88 324', mirrored: true },
  ],
  back: [{ d: 'M100 128 L100 192', mirrored: false }],
};

/** Muscles that have at least one zone in a view, in drawing order. */
export function musclesOf(side: BodySide): MuscleId[] {
  return [...new Set(ZONES[side].map((zone) => zone.muscle))];
}
