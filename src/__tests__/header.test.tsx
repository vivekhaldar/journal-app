// ABOUTME: Unit tests for Header component.
// ABOUTME: Tests navigation, auth state display, and user interactions.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/header";
import * as authModule from "@/lib/auth";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock the auth hook
jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = authModule.useAuth as jest.MockedFunction<
  typeof authModule.useAuth
>;

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the app title and link to home", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });

    render(<Header />);

    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /journal/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  describe("when loading", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
      });
    });

    it("shows loading placeholder", () => {
      render(<Header />);

      const placeholder = document.querySelector(".animate-pulse");
      expect(placeholder).toBeInTheDocument();
    });

    it("does not show sign in button or user menu", () => {
      render(<Header />);

      expect(
        screen.queryByText("Sign in with Google")
      ).not.toBeInTheDocument();
    });
  });

  describe("when user is not logged in", () => {
    const mockSignInWithGoogle = jest.fn();

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signInWithGoogle: mockSignInWithGoogle,
        signOut: jest.fn(),
      });
    });

    it("shows sign in button", () => {
      render(<Header />);

      expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    });

    it("does not show All Entries link", () => {
      render(<Header />);

      expect(screen.queryByText("All Entries")).not.toBeInTheDocument();
    });

    it("calls signInWithGoogle when sign in button is clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      await user.click(screen.getByText("Sign in with Google"));

      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  describe("when user is logged in", () => {
    const mockSignOut = jest.fn();
    const mockUser = {
      uid: "user-123",
      displayName: "Test User",
      email: "test@example.com",
      photoURL: "https://example.com/photo.jpg",
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser as any,
        loading: false,
        signInWithGoogle: jest.fn(),
        signOut: mockSignOut,
      });
    });

    it("shows All Entries link", () => {
      render(<Header />);

      const link = screen.getByText("All Entries");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "/entries");
    });

    it("shows user avatar button", () => {
      render(<Header />);

      // Avatar should be present
      const avatarButton = screen.getByRole("button");
      expect(avatarButton).toBeInTheDocument();
    });

    it("does not show sign in button", () => {
      render(<Header />);

      expect(
        screen.queryByText("Sign in with Google")
      ).not.toBeInTheDocument();
    });

    it("shows user email and sign out option in dropdown", async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Click on avatar to open dropdown
      const avatarButton = screen.getByRole("button");
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.getByText("Sign out")).toBeInTheDocument();
      });
    });

    it("calls signOut when sign out is clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Click on avatar to open dropdown
      const avatarButton = screen.getByRole("button");
      await user.click(avatarButton);

      await waitFor(() => {
        expect(screen.getByText("Sign out")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Sign out"));

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("shows avatar fallback when no photo URL", () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: "user-123",
          displayName: "Test User",
          email: "test@example.com",
          photoURL: null,
        } as any,
        loading: false,
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
      });

      render(<Header />);

      // Should show first letter of display name as fallback
      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("shows email initial as fallback when no display name", () => {
      mockUseAuth.mockReturnValue({
        user: {
          uid: "user-123",
          displayName: null,
          email: "test@example.com",
          photoURL: null,
        } as any,
        loading: false,
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
      });

      render(<Header />);

      // Should show first letter of email as fallback
      expect(screen.getByText("t")).toBeInTheDocument();
    });
  });
});
