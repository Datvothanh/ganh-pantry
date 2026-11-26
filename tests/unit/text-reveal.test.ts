import { describe, expect, it } from "vitest";
import {
  REVEAL,
  groupLines,
  plainText,
  splitGraphemes,
  splitWords,
  toBlocks,
} from "@/lib/text-reveal";

describe("splitWords", () => {
  it("keeps words whole and drops extra whitespace", () => {
    expect(splitWords("  Mứt   gừng\nnóng ")).toEqual(["Mứt", "gừng", "nóng"]);
    expect(splitWords("")).toEqual([]);
  });
});

describe("splitGraphemes", () => {
  it("splits precomposed Vietnamese into one cluster per letter", () => {
    const word = "Ặễở".normalize("NFC");
    expect(splitGraphemes(word)).toEqual(["Ặ", "ễ", "ở"]);
    expect(splitGraphemes("Mứt".normalize("NFC"))).toEqual(["M", "ứ", "t"]);
  });

  it("keeps decomposed combining marks attached to their base letter", () => {
    const word = "Ặễở".normalize("NFD");
    expect(word.length).toBeGreaterThan(3);
    const parts = splitGraphemes(word);
    expect(parts).toHaveLength(3);
    expect(parts.join("")).toBe(word);
    expect(parts[0].normalize("NFC")).toBe("Ặ");
    expect(parts[1].normalize("NFC")).toBe("ễ");
    expect(parts[2].normalize("NFC")).toBe("ở");
  });

  it("gives the same cluster count for both forms of a title", () => {
    const title = "Tương ớt tỏi";
    for (const w of splitWords(title)) {
      expect(splitGraphemes(w.normalize("NFD"))).toHaveLength(splitGraphemes(w.normalize("NFC")).length);
    }
  });
});

describe("toBlocks / plainText", () => {
  it("marks the lead words bold and keeps array entries as separate blocks", () => {
    const [block] = toBlocks("a b", "Lead in:");
    expect(block).toEqual([
      { text: "Lead", bold: true },
      { text: "in:", bold: true },
      { text: "a", bold: false },
      { text: "b", bold: false },
    ]);
    const blocks = toBlocks(["Spec", "table"]);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].map((w) => w.text)).toEqual(["table"]);
  });

  it("joins everything into one aria-label string", () => {
    expect(plainText(["Spec", "table"])).toBe("Spec table");
    expect(plainText("a  b", "Lead:")).toBe("Lead: a b");
  });
});

describe("groupLines", () => {
  it("groups words by offsetTop into visual lines", () => {
    expect(groupLines([0, 0, 0, 24, 24, 48])).toEqual([[0, 1, 2], [3, 4], [5]]);
  });

  it("ignores sub-pixel jitter within a line", () => {
    expect(groupLines([10, 11, 10, 12, 35, 36])).toEqual([[0, 1, 2, 3], [4, 5]]);
  });

  it("handles empty input and a single line", () => {
    expect(groupLines([])).toEqual([]);
    expect(groupLines([5, 5, 5])).toEqual([[0, 1, 2]]);
  });
});

describe("REVEAL numbers", () => {
  it("matches the reference timing", () => {
    expect(REVEAL.chars).toEqual({ duration: 0.95, stagger: 0.02, distance: 108 });
    expect(REVEAL.lines).toEqual({ duration: 0.55, stagger: 0.08, distance: 112 });
    expect(REVEAL.start).toBe("top 91%");
  });
});
