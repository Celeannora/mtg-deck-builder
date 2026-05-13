import { useEffect, useState } from "react";
import { db, getDatabaseStatus } from "../lib/db";
import type { DatabaseStatus } from "../lib/types";

export function useDBStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    cardCount: 0,
    setCount: 0,
    lastImportedAt: null,
    isStale: true,
    isEmpty: true,
  });

  async function refresh() {
    try {
      const s = await getDatabaseStatus();
      setStatus(s);
    } catch {
      // DB not yet open
    }
  }

  useEffect(() => {
    refresh();

    // Re-check whenever the cards table changes (after import)
    const sub = db.cards.hook("creating", () => {
      setTimeout(refresh, 500);
    });

    return () => {
      db.cards.hook("creating").unsubscribe(sub as never);
    };
  }, []);

  return {
    isReady: !status.isEmpty,
    cardCount: status.cardCount,
    setCount: status.setCount,
    lastImportedAt: status.lastImportedAt,
    isStale: status.isStale,
    isEmpty: status.isEmpty,
    refresh,
  };
}
