// ABOUTME: Displays a list of journal entries with delete functionality.
// ABOUTME: Fetches entries from Firestore and renders them in reverse chronological order.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { getEntriesForUser, deleteEntry, Entry } from "@/lib/entries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Loader2 } from "lucide-react";

interface EntryListProps {
  refreshTrigger?: number;
}

export function EntryList({ refreshTrigger }: EntryListProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const userEntries = await getEntriesForUser(user.uid);
      setEntries(userEntries);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshTrigger]);

  const handleDelete = async (entryId: string) => {
    setDeletingId(entryId);
    try {
      await deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error("Failed to delete entry:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            No entries yet. Write your first one above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.id}>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <time className="text-sm text-muted-foreground">
                {entry.createdAt.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
              >
                {deletingId === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {entry.content}
              </p>
            </CardContent>
          </Card>
          {index < entries.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  );
}
