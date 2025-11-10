const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function readExistingFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    return (
      "---\n" +
      "title: Categories\n" +
      "description: Understanding categories on Channel3\n" +
      "---\n\n"
    );
  }
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---[\s\S]*?---\s*/);
  if (match) return match[0] + "\n";
  return (
    "---\n" +
    "title: Categories\n" +
    "description: Understanding categories on Channel3\n" +
    "---\n\n"
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function sortIdsByTitle(ids, nodesById) {
  return [...ids].sort((a, b) => {
    const ta = (nodesById[a]?.title || "").toLowerCase();
    const tb = (nodesById[b]?.title || "").toLowerCase();
    return ta.localeCompare(tb);
  });
}

function renderAccordionGroupForSiblings(siblingIds, nodesById, depth) {
  if (!siblingIds || siblingIds.length === 0) return "";
  const sorted = sortIdsByTitle(siblingIds, nodesById);
  const children = sorted
    .map((id) => renderAccordionForNode(id, nodesById, depth))
    .join("\n");
  return `<AccordionGroup>\n${children}\n</AccordionGroup>`;
}

function renderAccordionForNode(id, nodesById, depth) {
  const node = nodesById[id];
  if (!node) return "";
  const rawTitle = node.title || id;
  const titleBase = escapeAttr(rawTitle);
  const idAttr = escapeAttr(id);
  const displayTitle = `${titleBase} (${idAttr})`;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  let body;
  if (!hasChildren) {
    const titleText = `${escapeHtml(rawTitle)} (${escapeHtml(id)})`;
    body = `\n<small>${titleText} has no sub-categories</small>\n`;
  } else {
    body =
      "\n" +
      renderAccordionGroupForSiblings(node.children, nodesById, depth + 1) +
      "\n";
  }

  return `<Accordion title="${displayTitle}">\n${body}</Accordion>`;
}

function generateMdx(tree) {
  const { nodes, root_category_ids: rootIds } = tree;
  const categoriesPath = path.resolve(__dirname, "..", "categories.mdx");
  const frontmatter = readExistingFrontmatter(categoriesPath).trimEnd();

  const intro = [
    frontmatter,
    "Browse the full category hierarchy. Each section expands to reveal subcategories.",
    "",
  ].join("\n");

  const topLevel = renderAccordionGroupForSiblings(rootIds, nodes, 0);
  return intro + "\n" + topLevel + "\n";
}

function main() {
  const treePath = path.resolve(__dirname, "..", "categories_tree.json");
  const outPath = path.resolve(__dirname, "..", "categories.mdx");
  const tree = readJson(treePath);
  const mdx = generateMdx(tree);
  fs.writeFileSync(outPath, mdx, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote accordion categories to ${outPath}`);
}

if (require.main === module) {
  main();
}
