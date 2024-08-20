import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import Dashboard from "../components/dashboard/Dashboard";

vi.mock("../api", () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes("/repo/user/")) {
        return Promise.resolve({
          data: {
            repositories: [
              {
                _id: "1",
                name: "my-project",
                description: "A cool project",
                visibility: true,
                updatedAt: "2024-01-01T00:00:00.000Z",
              },
            ],
          },
        });
      }
      if (url.includes("/repo/all")) {
        return Promise.resolve({
          data: {
            repositories: [
              {
                _id: "2",
                name: "other-repo",
                description: "Someone else's repo",
                visibility: true,
                owner: { _id: "other", username: "otheruser" },
                updatedAt: "2024-01-01T00:00:00.000Z",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => "test-user-id"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

const renderDashboard = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    </AuthProvider>
  );

describe("Dashboard Component", () => {
  it("renders the dashboard header", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Your Repositories")).toBeTruthy();
    });
  });

  it("has a search input", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Find a repository...")).toBeTruthy();
    });
  });

  it("has a new repository button", async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("+ New repository")).toBeTruthy();
    });
  });
});
