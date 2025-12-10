// ABOUTME: Form component for creating new journal entries.
// ABOUTME: Handles text input and submission to Firestore.

"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { createEntry } from "@/lib/entries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";

interface EntryFormProps {
  onEntryCreated?: () => void;
}

export function EntryForm({ onEntryCreated }: EntryFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createEntry(user.uid, content.trim());
      setContent("");
      onEntryCreated?.();
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Sign in to start writing entries
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none text-base leading-relaxed"
            disabled={isSubmitting}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <Button type="submit" disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Save Entry
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
