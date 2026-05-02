import pptxgen from "pptxgenjs";
import path from "path";
import { PodcastMetadata } from "./types";

export async function generateSlides(metadata: PodcastMetadata, fileId: string): Promise<string> {
  const pres = new pptxgen();

  // Cover Slide
  const slideCover = pres.addSlide();
  slideCover.addText(metadata.podcastTitle || "Podcast", { x: 1, y: 1, w: 8, h: 1, fontSize: 24, bold: true });
  slideCover.addText(metadata.episodeTitle || "Episode Summary", { x: 1, y: 2.5, w: 8, h: 1.5, fontSize: 36, bold: true, color: "363636" });
  slideCover.addText(metadata.publishedDate ? new Date(metadata.publishedDate).toLocaleDateString() : "", { x: 1, y: 4.5, w: 8, h: 1, fontSize: 18, color: "888888" });

  // Summary Slide
  const slideSummary = pres.addSlide();
  slideSummary.addText("Episode Summary", { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  slideSummary.addText("Add summary points here.", { x: 0.5, y: 1.5, fontSize: 18, bullet: true });

  // Key Points Slide
  const slidePoints = pres.addSlide();
  slidePoints.addText("Core Arguments & Insights", { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  slidePoints.addText("Point 1\nPoint 2\nPoint 3", { x: 0.5, y: 1.5, fontSize: 18, bullet: true });

  // Conclusion
  const slideConclusion = pres.addSlide();
  slideConclusion.addText("Conclusion", { x: 0.5, y: 0.5, fontSize: 24, bold: true });
  slideConclusion.addText("Further research and takeaways.", { x: 0.5, y: 1.5, fontSize: 18, bullet: true });

  const folderName = fileId.replace("-錄音檔", "");
  const outputFileName = fileId.replace("-錄音檔", "-簡報");
  const fileName = `${outputFileName}.pptx`;
  const filePath = path.join(process.cwd(), "uploads", "output", folderName, fileName);
  
  await pres.writeFile({ fileName: filePath });
  
  return {
    slidesUrl: `/api/files/${folderName}/${fileName}`,
    slidesPath: filePath
  };
}
