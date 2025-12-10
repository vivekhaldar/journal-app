// ABOUTME: Unit tests for Firestore entry operations.
// ABOUTME: Tests createEntry, getEntriesForUser, and deleteEntry functions.

import { createEntry, getEntriesForUser, deleteEntry } from "@/lib/entries";
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

// Get mocked functions
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;

describe("entries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createEntry", () => {
    it("creates an entry with userId, content, and timestamp", async () => {
      const mockDocRef = { id: "new-entry-123" };
      mockAddDoc.mockResolvedValue(mockDocRef as any);
      mockCollection.mockReturnValue({} as any);

      const entryId = await createEntry("user-abc", "My journal entry");

      expect(entryId).toBe("new-entry-123");
      expect(mockCollection).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user-abc",
          content: "My journal entry",
          createdAt: expect.anything(),
        })
      );
    });

    it("throws error when Firestore fails", async () => {
      mockAddDoc.mockRejectedValue(new Error("Firestore error"));
      mockCollection.mockReturnValue({} as any);

      await expect(createEntry("user-abc", "content")).rejects.toThrow(
        "Firestore error"
      );
    });
  });

  describe("getEntriesForUser", () => {
    it("returns entries for a specific user", async () => {
      const mockTimestamp = {
        toDate: () => new Date("2024-01-15T10:00:00Z"),
      };

      const mockDocs = [
        {
          id: "entry-1",
          data: () => ({
            userId: "user-abc",
            content: "First entry",
            createdAt: mockTimestamp,
          }),
        },
        {
          id: "entry-2",
          data: () => ({
            userId: "user-abc",
            content: "Second entry",
            createdAt: mockTimestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockOrderBy.mockReturnValue({} as any);

      const entries = await getEntriesForUser("user-abc");

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        id: "entry-1",
        userId: "user-abc",
        content: "First entry",
        createdAt: expect.any(Date),
      });
      expect(entries[1]).toEqual({
        id: "entry-2",
        userId: "user-abc",
        content: "Second entry",
        createdAt: expect.any(Date),
      });

      expect(mockWhere).toHaveBeenCalledWith("userId", "==", "user-abc");
      expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "desc");
    });

    it("returns empty array when user has no entries", async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockOrderBy.mockReturnValue({} as any);

      const entries = await getEntriesForUser("user-xyz");

      expect(entries).toEqual([]);
    });

    it("throws error when Firestore fails", async () => {
      mockGetDocs.mockRejectedValue(new Error("Query failed"));
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockOrderBy.mockReturnValue({} as any);

      await expect(getEntriesForUser("user-abc")).rejects.toThrow(
        "Query failed"
      );
    });
  });

  describe("deleteEntry", () => {
    it("deletes an entry by ID", async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      mockDoc.mockReturnValue({} as any);

      await deleteEntry("entry-123");

      expect(mockDoc).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("throws error when delete fails", async () => {
      mockDeleteDoc.mockRejectedValue(new Error("Delete failed"));
      mockDoc.mockReturnValue({} as any);

      await expect(deleteEntry("entry-123")).rejects.toThrow("Delete failed");
    });
  });
});
