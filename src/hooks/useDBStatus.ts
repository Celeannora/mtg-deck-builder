import { useEffect, useState } from "react";
import { db } from "../lib/db";

export function useDBStatus() {
  const [isReady, setIsReady]     = useState(false);
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const count = await db.cards.count();
        if (mounted) { setCardCount(count); setIsReady(count > 0); }
      } catch {
        if (mounted) setIsReady(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { isReady, cardCount };
}
