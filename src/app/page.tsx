import { Suspense } from "react";
import { TarotClient } from "./TarotClient";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex-1 grid place-items-center text-sm text-zinc-600 dark:text-zinc-400">
          正在加载…
        </div>
      }
    >
      <TarotClient />
    </Suspense>
  );
}
