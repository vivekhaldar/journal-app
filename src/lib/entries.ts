// ABOUTME: Firestore operations for journal entries.
// ABOUTME: Provides CRUD functions for creating, reading, and deleting entries.

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Entry {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

interface FirestoreEntry {
  userId: string;
  content: string;
  createdAt: Timestamp;
}

export async function createEntry(
  userId: string,
  content: string
): Promise<string> {
  const docRef = await addDoc(collection(db, "entries"), {
    userId,
    content,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function getEntriesForUser(userId: string): Promise<Entry[]> {
  const q = query(
    collection(db, "entries"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreEntry;
    return {
      id: doc.id,
      userId: data.userId,
      content: data.content,
      createdAt: data.createdAt.toDate(),
    };
  });
}

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, "entries", entryId));
}
