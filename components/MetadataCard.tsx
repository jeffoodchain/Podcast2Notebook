"use client";
import { PodcastMetadata } from "../lib/types";
import { Download } from "lucide-react";

export default function MetadataCard({
  metadata,
}: {
  metadata: PodcastMetadata;
}) {
  if (!metadata) return null;

  const rows: { label: string; value: string }[] = [];
  if (metadata.podcastTitle) rows.push({ label: "節目", value: metadata.podcastTitle });
  if (metadata.episodeTitle) rows.push({ label: "單集", value: metadata.episodeTitle });
  if (metadata.publishedDate) {
    rows.push({
      label: "發布日期",
      value: new Date(metadata.publishedDate).toLocaleDateString("zh-TW"),
    });
  }

  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4">節目資訊</h2>
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3 text-sm">
            <dt className="text-muted-foreground shrink-0 w-20">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>

      {metadata.rssUrl && (
        <a
          href={metadata.rssUrl}
          download
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-emerald-400 hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          下載 RSS 檔(可當作 NotebookLM 來源)
        </a>
      )}
    </section>
  );
}
