import type { Sprite } from "./PixelArt";

const OUTLINE = "#08050f";

export const ROCKET: Sprite = {
  palette: {
    k: OUTLINE,
    w: "#eefcff",
    a: "#7fe9ff",
    b: "#2b9fd1",
    r: "#ff5c6c",
    o: "#ffb347",
    y: "#ffe066",
  },
  rows: [
    "......kwwk....",
    ".....kwwwwk...",
    ".....kwaawk...",
    ".....kwaawk...",
    "....kwaaaawk..",
    "....kwaaaawk..",
    "...kwaaaaaawk.",
    "...kwaaaaaawk.",
    "..kwaaaaaaaawk",
    "..kwaawwwwaawk",
    "..kwaawkkwaawk",
    "..kwaawkkwaawk",
    "..kwaawwwwaawk",
    "...kwaaaaaawk.",
    "....kwaaaawk..",
    ".....kwaawk...",
    "......krrk....",
    ".....kr..rk...",
    "....kr.oo.rk..",
    ".......oo.....",
    "......o..o....",
  ],
};

export const HUNTER: Sprite = {
  palette: {
    k: OUTLINE,
    g: "#35f0c0",
    w: "#eaf6ff",
    r: "#ff5c6c",
    b: "#1a8f78",
  },
  rows: [
    "....kggggk....",
    "...kgwwwwgk...",
    "...kgwkkwgk...",
    "...kgwwwwgk...",
    "....kggggk....",
    "...krrrrrrk...",
    "..krrggggrrk..",
    "..krrggggrrk..",
    "...kggggggk...",
    "...kgkggkgk...",
    "...kgkggkgk...",
    "..kggkggkggk..",
    "..kggk..kggk..",
    "..kggk..kggk..",
    "..kggkkkggk...",
    "...kggkkggk...",
    "...kggk.kggk..",
    "....kk...kk...",
  ],
};

export const EXPLORER: Sprite = {
  palette: {
    k: OUTLINE,
    h: "#8a5a2b",
    f: "#f2c48d",
    e: "#22160b",
    o: "#e8590c",
    b: "#4a2f16",
  },
  rows: [
    "...khhhhk...",
    "..khffffhk..",
    "..khfefehk..",
    "..khffffhk..",
    "...kffffk...",
    "..koooooook.",
    ".koooooooook",
    ".koo.oo.ook.",
    "...kooooook.",
    "...ko.ko....",
    "..kook.kook.",
    "..ko....ok..",
    ".kook..kook.",
    ".ko......ok.",
    "..k......k..",
    "..bb....bb..",
  ],
};

export const CROC: Sprite = {
  palette: {
    k: OUTLINE,
    g: "#4f8a2f",
    w: "#f4f0d0",
    r: "#7a1f1f",
  },
  rows: [
    "......gggggg....",
    "...kgggggggggk..",
    "..kgwggggwgggk..",
    ".kggggggggggggk.",
    ".kggggggggggggk.",
    "..kwgwgwgwgwgk..",
    "...k.k.k.k.k.k..",
    "................",
  ],
};

export const FLAME: Sprite = {
  palette: {
    r: "#ff5c2b",
    y: "#ffd23f",
    w: "#fff6c9",
  },
  rows: [
    "....rr....",
    "...rrrr...",
    "..rryyrr..",
    "..rywwyr..",
    ".rrywwyrr.",
    ".rrywwyrr.",
    ".rrywwyrr.",
    "..rywwyr..",
    "..rryyrr..",
    "...rrrr...",
    "....rr....",
    "..........",
  ],
};

export const ALIEN: Sprite = {
  palette: {
    k: OUTLINE,
    g: "#c04df0",
    w: "#eaf6ff",
    b: "#6b2fa0",
  },
  rows: [
    "...kggggk...",
    "..kggggggk..",
    ".kggwggwggk.",
    ".kggggggggk.",
    "kggggggggggk",
    "kg.gg.gg.ggk",
    "k..g..g..g.k",
    "...g...g....",
    "..kg...gk...",
    "...k...k....",
  ],
};

export const COIN: Sprite = {
  palette: {
    c: "#8a5a12",
    y: "#ffd23f",
    w: "#fff6c9",
  },
  rows: [
    "..cccc..",
    ".cyyyyc.",
    "cyywwyyc",
    "cywyywyc",
    "cywyywyc",
    "cyywwyyc",
    ".cyyyyc.",
    "..cccc..",
  ],
};

export const GEM: Sprite = {
  palette: {
    c: "#1a6b5a",
    w: "#bafff1",
    a: "#35f0c0",
  },
  rows: [
    "..cccccc..",
    ".cwwaaaac.",
    "cwwaaaaaac",
    "cwaaaaaaac",
    ".caaaaaac.",
    "..caaaac..",
    "...caac...",
    "....cc....",
  ],
};

export const CHEST: Sprite = {
  palette: {
    k: OUTLINE,
    y: "#c98f1f",
    a: "#ffd23f",
    w: "#fff6c9",
  },
  rows: [
    "..kkkkkkkkkk..",
    ".kyyyyyyyyyyk.",
    "kyyayyyyyyayyk",
    "kyyyyyyyyyyyyk",
    "kyykkkkkkkkyyk",
    "kyyaaaaaaaayyk",
    "kyyaaawaaaayyk",
    "kyyaaaaaaaayyk",
    ".kyyyyyyyyyyk.",
    "..kkkkkkkkkk..",
  ],
};
