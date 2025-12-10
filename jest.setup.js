// ABOUTME: Jest setup file for extending expect with testing-library matchers.
// ABOUTME: Also configures global mocks for Firebase.

import "@testing-library/jest-dom";

// Mock Firebase modules globally
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Return unsubscribe function
    return jest.fn();
  }),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date("2024-01-15T10:00:00Z"),
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
    })),
  },
}));
