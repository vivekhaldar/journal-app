// ABOUTME: Full entries archive page.
// ABOUTME: Displays all journal entries in chronological order.

"use client";

import { EntryList } from "@/components/entry-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";

export default function EntriesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Entries</h1>
          <p className="mt-2 text-muted-foreground">
            Your complete journal archive
          </p>
        </div>
        <Link href="/">
          <Button>
            <PenLine className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </Link>
      </div>

      <EntryList />
    </div>
  );
}
