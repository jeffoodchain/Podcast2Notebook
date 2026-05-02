import fs from "fs";
import path from "path";
import { PodcastMetadata } from "./types";

export async function generateMindmap(metadata: PodcastMetadata, fileId: string) {
  const folderName = fileId.replace("-錄音檔", "");
  const outputDir = path.join(process.cwd(), "uploads", "output", folderName);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Markdown version
  const mdContent = `# ${metadata.episodeTitle || "Podcast Episode"}
## Overview
### Topic 1
### Topic 2
## Key Insights
### Point A
### Point B
`;
  const outputFileName = fileId.replace("-錄音檔", "-心智圖");
  const mdName = `${outputFileName}.md`;
  const mdPath = path.join(outputDir, mdName);
  fs.writeFileSync(mdPath, mdContent);

  // HTML version using markmap
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mind Map - ${metadata.episodeTitle}</title>
  <style>
    body { margin: 0; padding: 0; }
    svg { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <svg id="mindmap"></svg>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib"></script>
  <script>
    const { markmap, Transformer } = window;
    const transformer = new Transformer();
    const markdown = \`${mdContent.replace(/`/g, '\\`')}\`;
    const { root } = transformer.transform(markdown);
    markmap.Markmap.create('#mindmap', null, root);
  </script>
</body>
</html>`;
  
  const htmlName = `${outputFileName}.html`;
  const htmlPath = path.join(outputDir, htmlName);
  fs.writeFileSync(htmlPath, htmlContent);

  return {
    mindmapMdUrl: `/api/files/${folderName}/${mdName}`,
    mindmapHtmlUrl: `/api/files/${folderName}/${htmlName}`,
    mindmapMdPath: mdPath,
    mindmapHtmlPath: htmlPath
  };
}
