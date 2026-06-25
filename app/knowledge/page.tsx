import {
  loadExplorerDocs,
  loadCaseDebug,
  CATEGORY_ORDER,
} from "@/lib/knowledge/explorer";
import { KnowledgeExplorer } from "./knowledge-explorer";

// Developer-only Knowledge Explorer. Read-only inspection of what Undark knows
// and why retrieval picks what it picks. Not part of the customer product.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Undark — Knowledge Explorer (dev)",
  robots: { index: false, follow: false },
};

export default function KnowledgePage() {
  const docs = loadExplorerDocs();
  const cases = loadCaseDebug();
  return (
    <KnowledgeExplorer
      docs={docs}
      cases={cases}
      categoryOrder={CATEGORY_ORDER}
    />
  );
}
