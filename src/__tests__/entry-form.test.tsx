// ABOUTME: Unit tests for EntryForm component.
// ABOUTME: Tests form rendering, user input, and entry submission.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "@/components/entry-form";
import * as authModule from "@/lib/auth";
import * as entriesModule from "@/lib/entries";

// Mock the auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}));

// Mock the entries module
jest.mock("@/lib/entries", () => ({
  createEntry: jest.fn(),
}));

const mockUseAuth = authModule.useAuth as jest.MockedFunction<
  typeof authModule.useAuth
>;
const mockCreateEntry = entriesModule.createEntry as jest.MockedFunction<
  typeof entriesModule.createEntry
>;

describe("EntryForm", () => {
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

    it("shows sign in prompt", () => {
      render(<EntryForm />);

      expect(
        screen.getByText("Sign in to start writing entries")
      ).toBeInTheDocument();
    });

    it("does not show textarea or submit button", () => {
      render(<EntryForm />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /save/i })
      ).not.toBeInTheDocument();
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

    it("shows textarea and submit button", () => {
      render(<EntryForm />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save entry/i })
      ).toBeInTheDocument();
    });

    it("shows placeholder text", () => {
      render(<EntryForm />);

      expect(
        screen.getByPlaceholderText("What's on your mind?")
      ).toBeInTheDocument();
    });

    it("disables submit button when textarea is empty", () => {
      render(<EntryForm />);

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when textarea has content", async () => {
      const user = userEvent.setup();
      render(<EntryForm />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "My journal entry");

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      expect(submitButton).toBeEnabled();
    });

    it("submits entry and clears textarea on success", async () => {
      const user = userEvent.setup();
      mockCreateEntry.mockResolvedValue("new-entry-id");

      const onEntryCreated = jest.fn();
      render(<EntryForm onEntryCreated={onEntryCreated} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "My journal entry");

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          "user-123",
          "My journal entry"
        );
      });

      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });

      expect(onEntryCreated).toHaveBeenCalled();
    });

    it("trims whitespace from content before submitting", async () => {
      const user = userEvent.setup();
      mockCreateEntry.mockResolvedValue("new-entry-id");

      render(<EntryForm />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "  My entry with spaces  ");

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalledWith(
          "user-123",
          "My entry with spaces"
        );
      });
    });

    it("does not submit when content is only whitespace", async () => {
      const user = userEvent.setup();
      render(<EntryForm />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "   ");

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      expect(submitButton).toBeDisabled();
    });

    it("handles submission error gracefully", async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockCreateEntry.mockRejectedValue(new Error("Failed to create"));

      render(<EntryForm />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "My entry");

      const submitButton = screen.getByRole("button", { name: /save entry/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to create entry:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it("shows today's date", () => {
      render(<EntryForm />);

      // The component shows today's date in a specific format
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      expect(screen.getByText(today)).toBeInTheDocument();
    });
  });
});
