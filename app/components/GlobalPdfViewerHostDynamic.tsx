"use client";

import dynamic from "next/dynamic";

const GlobalPdfViewerHost = dynamic(
  () =>
    import("./GlobalPdfViewerHost").then((m) => ({
      default: m.GlobalPdfViewerHost,
    })),
  { ssr: false }
);

export function GlobalPdfViewerHostDynamic() {
  return <GlobalPdfViewerHost />;
}
