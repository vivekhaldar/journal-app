// ABOUTME: Unit tests for authentication context and hooks.
// ABOUTME: Tests AuthProvider, useAuth hook, and auth state management.

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";

// Get mocked functions
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<
  typeof onAuthStateChanged
>;
const mockSignInWithPopup = signInWithPopup as jest.MockedFunction<
  typeof signInWithPopup
>;
const mockFirebaseSignOut = firebaseSignOut as jest.MockedFunction<
  typeof firebaseSignOut
>;

// Test component that uses the auth hook
function TestConsumer() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.displayName}` : "Not logged in"}
      </div>
      <button onClick={signInWithGoogle}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  let authStateCallback: ((user: any) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;

    // Capture the auth state callback
    mockOnAuthStateChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback as (user: any) => void;
      return jest.fn(); // unsubscribe function
    });
  });

  it("shows loading state initially", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows not logged in when no user", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate auth state change with no user
    act(() => {
      authStateCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent(
        "Not logged in"
      );
    });
  });

  it("shows logged in state when user exists", async () => {
    const mockUser = {
      uid: "user-123",
      displayName: "Test User",
      email: "test@example.com",
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate auth state change with user
    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent(
        "Logged in as Test User"
      );
    });
  });

  it("calls signInWithPopup when signInWithGoogle is called", async () => {
    const user = userEvent.setup();
    mockSignInWithPopup.mockResolvedValue({} as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate auth state change to remove loading
    act(() => {
      authStateCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Sign In"));

    expect(mockSignInWithPopup).toHaveBeenCalled();
  });

  it("calls firebaseSignOut when signOut is called", async () => {
    const user = userEvent.setup();
    mockFirebaseSignOut.mockResolvedValue();

    const mockUser = { uid: "user-123", displayName: "Test User" };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate logged in state
    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Sign Out"));

    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });
});

describe("useAuth", () => {
  it("throws error when used outside AuthProvider", () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });
});
