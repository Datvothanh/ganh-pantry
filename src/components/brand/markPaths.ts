/**
 * GÁNH mark, own drawing on a 64x64 grid: a street vendor in a nón lá
 * carrying a shoulder pole with a full basket hanging from each end.
 * Flat, single colour (filled with currentColor).
 */
export const MARK_VIEWBOX = "0 0 64 64";

export const MARK_PATHS: string[] = [
  // conical hat
  "M32 5.5 45.5 17.2Q32 20.4 18.5 17.2Z",
  // face under the brim
  "M28.6 18.6Q32 19.6 35.4 18.6 35.2 22.6 32 23 28.8 22.6 28.6 18.6Z",
  // shoulder pole, slightly bowed by the load
  "M4 24.6Q32 20.2 60 24.6L60 26.9Q32 22.6 4 26.9Z",
  // body: shoulders, tunic and the hand holding the pole
  "M25.4 25.6Q32 22.6 38.6 25.6L40.8 27.5 39.2 29.4 37.6 28.4 37.2 41H26.8L26.4 28.4 24.8 29.4 23.2 27.5Z",
  // legs mid-stride
  "M27.2 41H31.2L29.4 57.6H25.6Z",
  "M32.8 41H36.8L38.6 57.6H34.8Z",
  // feet
  "M24.4 57H29.6V59H23.6Z",
  "M34.6 57H39.8L40.6 59H34.6Z",
  // left ropes and basket with produce
  "M9.3 25.4H10.7L15.6 40H14.1ZM9.3 25.4H10.7L5.9 40H4.4Z",
  "M2.6 40.6H17.4Q17 50 10 50.4 3 50 2.6 40.6Z",
  "M4 40.8A3 3 0 0 1 9.4 38.4 3.2 3.2 0 0 1 15.9 40.8Z",
  // right ropes and basket with produce
  "M53.3 25.4H54.7L59.6 40H58.1ZM53.3 25.4H54.7L49.9 40H48.4Z",
  "M46.6 40.6H61.4Q61 50 54 50.4 47 50 46.6 40.6Z",
  "M48 40.8A3.2 3.2 0 0 1 54.2 38.6 3 3 0 0 1 59.9 40.8Z",
];
