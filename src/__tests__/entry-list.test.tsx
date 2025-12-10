// ABOUTME: Unit tests for EntryList component.
// ABOUTME: Tests entry display, loading states, empty states, and deletion.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryList } from "@/components/entry-list";
import * as authModule from "@/lib/auth";
import * as entriesModule from "@/lib/entries";

// Mock the auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}));

// Mock the entries module
jest.mock("@/lib/entries", () => ({
  getEntriesForUser: jest.fn(),
  deleteEntry: jest.fn(),
}));

const mockUseAuth = authModule.useAuth as jest.MockedFunction<
  typeof authModule.useAuth
>;
const mockGetEntriesForUser =
  entriesModule.getEntriesForUser as jest.MockedFunction<
    typeof entriesModule.getEntriesForUser
  >;
const mockDeleteEntry = entriesModule.deleteEntry as jest.MockedFunction<
  typeof entriesModule.deleteEntry
>;

describe("EntryList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when user is not logged in", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
      });
    });

    it("renders nothing", () => {
      const { container } = render(<EntryList />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when user is logged in", () => {
    const mockUser = {
      uid: "user-123",
      displayName: "Test User",
      email: "test@example.com",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        loading: false,
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
      });
    });

    it("shows loading spinner while fetching entries", async () => {
      // Keep the promise pending
      mockGetEntriesForUser.mockImplementation(
        () => new Promise(() => {})
      );

      render(<EntryList />);

      // Look for the loader animation class
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("shows empty state when user has no entries", async () => {
      mockGetEntriesForUser.mockResolvedValue([]);

      render(<EntryList />);

      await waitFor(() => {
        expect(
          screen.getByText("No entries yet. Write your first one above!")
        ).toBeInTheDocument();
      });
    });

    it("displays entries when they exist", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-123",
          content: "First journal entry",
          createdAt: new Date("2024-01-15T10:00:00Z"),
        },
        {
          id: "entry-2",
          userId: "user-123",
          content: "Second journal entry",
          createdAt: new Date("2024-01-14T10:00:00Z"),
        },
      ];

      mockGetEntriesForUser.mockResolvedValue(mockEntries);

      render(<EntryList />);

      await waitFor(() => {
        expect(screen.getByText("First journal entry")).toBeInTheDocument();
        expect(screen.getByText("Second journal entry")).toBeInTheDocument();
      });
    });

    it("formats entry dates correctly", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-123",
          content: "Test entry",
          createdAt: new Date("2024-01-15T10:30:00Z"),
        },
      ];

      mockGetEntriesForUser.mockResolvedValue(mockEntries);

      render(<EntryList />);

      await waitFor(() => {
        // The date should be formatted with weekday, full date, and time
        expect(screen.getByText(/Monday/i)).toBeInTheDocument();
        expect(screen.getByText(/January/i)).toBeInTheDocument();
        expect(screen.getByText(/15/)).toBeInTheDocument();
        expect(screen.getByText(/2024/)).toBeInTheDocument();
      });
    });

    it("shows delete button for each entry", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-123",
          content: "Entry to delete",
          createdAt: new Date("2024-01-15T10:00:00Z"),
        },
      ];

      mockGetEntriesForUser.mockResolvedValue(mockEntries);

      render(<EntryList />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole("button");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it("deletes entry when delete button is clicked", async () => {
      const user = userEvent.setup();
      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-123",
          content: "Entry to delete",
          createdAt: new Date("2024-01-15T10:00:00Z"),
        },
      ];

      mockGetEntriesForUser.mockResolvedValue(mockEntries);
      mockDeleteEntry.mockResolvedValue(undefined);

      render(<EntryList />);

      await waitFor(() => {
        expect(screen.getByText("Entry to delete")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteEntry).toHaveBeenCalledWith("entry-1");
      });

      // Entry should be removed from the list
      await waitFor(() => {
        expect(screen.queryByText("Entry to delete")).not.toBeInTheDocument();
      });
    });

    it("handles delete error gracefully", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const mockEntries = [
        {
          id: "entry-1",
          userId: "user-123",
          content: "Entry that fails to delete",
          createdAt: new Date("2024-01-15T10:00:00Z"),
        },
      ];

      mockGetEntriesForUser.mockResolvedValue(mockEntries);
      mockDeleteEntry.mockRejectedValue(new Error("Delete failed"));

      render(<EntryList />);

      await waitFor(() => {
        expect(
          screen.getByText("Entry that fails to delete")
        ).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to delete entry:",
          expect.any(Error)
        );
      });

      // Entry should still be in the list after failed delete
      expect(
        screen.getByText("Entry that fails to delete")
      ).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("refreshes entries when refreshTrigger changes", async () => {
      mockGetEntriesForUser.mockResolvedValue([]);

      const { rerender } = render(<EntryList refreshTrigger={1} />);

      await waitFor(() => {
        expect(mockGetEntriesForUser).toHaveBeenCalledTimes(1);
      });

      rerender(<EntryList refreshTrigger={2} />);

      await waitFor(() => {
        expect(mockGetEntriesForUser).toHaveBeenCalledTimes(2);
      });
    });

    it("handles load error gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockGetEntriesForUser.mockRejectedValue(new Error("Load failed"));

      render(<EntryList />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to load entries:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
