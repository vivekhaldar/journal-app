// ABOUTME: Home page with journal entry form and recent entries.
// ABOUTME: Main landing page for writing and viewing journal entries.

"use client";

import { useState } from "react";
import { EntryForm } from "@/components/entry-form";
import { EntryList } from "@/components/entry-list";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEntryCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          What&apos;s on your mind?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Capture your thoughts, ideas, and reflections.
        </p>
      </div>

      <div className="space-y-8">
        <EntryForm onEntryCreated={handleEntryCreated} />

        <div>
          <h2 className="mb-4 text-lg font-semibold">Recent Entries</h2>
          <EntryList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
