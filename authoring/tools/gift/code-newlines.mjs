// Code-block line breaks for [html] GIFT banks.
// Code inside <pre> uses actual LF line breaks, not numeric &#10; references.
// GIFT reads a blank physical line as the end of a question and drops any physical
// line that starts with optional whitespace then //, so a visually blank code line
// is written as &nbsp; and a code line starting with // gets &nbsp; after its
// indentation. The first code line shares the <pre><code> physical line and is never
// changed.

// GIFT escapes # as \#; match either spelling of the decimal or hex LF reference.
export const NUMERIC_NEWLINE = /&\\?#(?:10|[xX]0*[aA]);/g;
const PRE = /<pre>([\s\S]*?)<\/pre>/g;
const ENTITY = "&\\#10;";

export function literalCodeNewlines(text) {
  if (text.includes("&nbsp;")) {
    throw new Error("input already contains &nbsp;, so the change could not be reversed exactly");
  }
  return text.replace(PRE, (whole, inner) => {
    if (!inner.includes(ENTITY)) return whole;
    const lines = inner.split(ENTITY).map((line, index) => {
      if (index === 0) return line;
      if (line.trim() === "") {
        if (line) throw new Error("whitespace-only code line");
        return "&nbsp;";
      }
      return line.replace(/^([ \t]*)\/\//, "$1&nbsp;//");
    });
    return `<pre>${lines.join("\n")}</pre>`;
  });
}

export function entityCodeNewlines(text, entity = ENTITY) {
  return text.replace(PRE, (whole, inner) => {
    if (!inner.includes("\n")) return whole;
    const lines = inner.split("\n").map((line, index) => {
      if (index === 0) return line;
      if (line === "&nbsp;") return "";
      return line.replace(/^([ \t]*)&nbsp;\/\//, "$1//");
    });
    return `<pre>${lines.join(entity)}</pre>`;
  });
}
