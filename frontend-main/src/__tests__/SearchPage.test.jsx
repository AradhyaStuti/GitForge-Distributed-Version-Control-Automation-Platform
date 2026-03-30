import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import SearchPage from "../components/search/SearchPage";

const mockGet = vi.fn();

vi.mock("../api", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const searchResults = {
  results: {
    repositories: { total: 2, items: [
      { _id: "r1", name: "gitforge", owner: { username: "alice" }, description: "A code host", updatedAt: "2025-01-01" },
      { _id: "r2", name: "toolkit", owner: { username: "bob" }, description: null, updatedAt: "2025-02-01" },
    ]},
    issues: { total: 1, items: [
      { _id: "i1", title: "Fix login bug", status: "open", description: "Login fails", repository: { name: "gitforge" }, createdAt: "2025-01-15" },
    ]},
    users: { total: 1, items: [{ _id: "u1", username: "alice", email: "alice@example.com" }] },
  },
};

const renderSearch = (q = "") =>
  render(<AuthProvider><MemoryRouter initialEntries={[q ? `/search?q=${q}` : "/search"]}><SearchPage /></MemoryRouter></AuthProvider>);

describe("SearchPage Component", () => {
  beforeEach(() => { mockGet.mockReset(); mockGet.mockResolvedValue({ data: searchResults }); });

  it("performs search on form submit", async () => {
    renderSearch();
    fireEvent.change(screen.getByPlaceholderText(/search repositories/i), { target: { value: "gitforge" } });
    fireEvent.click(screen.getByText("Search"));
    await waitFor(() => { expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/search?q=gitforge")); });
  });

  it("displays repository results and switches to issues tab", async () => {
    renderSearch("test");
    await waitFor(() => { expect(screen.getByText("2 repository results")).toBeTruthy(); });
    expect(screen.getByText("alice/gitforge")).toBeTruthy();

    fireEvent.click(screen.getByText(/Issues/));
    await waitFor(() => { expect(screen.getByText("1 issue results")).toBeTruthy(); });
    expect(screen.getByText("Fix login bug")).toBeTruthy();
  });

  it("shows empty message when no results", async () => {
    mockGet.mockResolvedValue({ data: { results: { repositories: { total: 0, items: [] }, issues: { total: 0, items: [] }, users: { total: 0, items: [] } } } });
    renderSearch("nonexistent");
    await waitFor(() => { expect(screen.getByText("No repositories found.")).toBeTruthy(); });
  });
});
