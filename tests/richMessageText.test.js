import test from "node:test";
import assert from "node:assert/strict";
import { parseInlineMarkdown } from "../src/features/aiCoach/richMessageText.js";

test("parseInlineMarkdown turns double asterisks into strong tokens", () => {
  assert.deepEqual(parseInlineMarkdown("Try **one tiny step** now."), [
    { type: "text", text: "Try " },
    { type: "strong", text: "one tiny step" },
    { type: "text", text: " now." },
  ]);
});

test("parseInlineMarkdown turns single asterisks into emphasis tokens", () => {
  assert.deepEqual(parseInlineMarkdown("If cleaning *is* the next step."), [
    { type: "text", text: "If cleaning " },
    { type: "em", text: "is" },
    { type: "text", text: " the next step." },
  ]);
});

test("parseInlineMarkdown leaves unmatched markers as text", () => {
  assert.deepEqual(parseInlineMarkdown("This has **unfinished emphasis."), [
    { type: "text", text: "This has " },
    { type: "text", text: "**unfinished emphasis." },
  ]);
});

test("parseInlineMarkdown keeps HTML-like content as text", () => {
  assert.deepEqual(parseInlineMarkdown("Do **not** run <script>alert(1)</script>."), [
    { type: "text", text: "Do " },
    { type: "strong", text: "not" },
    { type: "text", text: " run <script>alert(1)</script>." },
  ]);
});
