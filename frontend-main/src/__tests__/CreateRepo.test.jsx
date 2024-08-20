import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import CreateRepo from "../components/repo/CreateRepo";

vi.mock("../api", () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: { repository: { _id: "123", name: "test-repo" } },
    }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderComponent = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <CreateRepo />
      </BrowserRouter>
    </AuthProvider>
  );

describe("CreateRepo Component", () => {
  it("renders the create repository form", () => {
    renderComponent();

    expect(screen.getByText("Create a new repository")).toBeTruthy();
    expect(screen.getByLabelText(/repository name/i)).toBeTruthy();
    expect(screen.getByLabelText(/description/i)).toBeTruthy();
    expect(screen.getByText("Public")).toBeTruthy();
    expect(screen.getByText("Private")).toBeTruthy();
  });

  it("shows error for empty name", async () => {
    renderComponent();

    fireEvent.click(screen.getByText("Create repository"));

    await waitFor(() => {
      expect(screen.getByText("Repository name is required.")).toBeTruthy();
    });
  });

  it("shows error for invalid name", async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/repository name/i), {
      target: { value: "invalid name spaces" },
    });
    fireEvent.click(screen.getByText("Create repository"));

    await waitFor(() => {
      expect(screen.getByText(/can only contain/)).toBeTruthy();
    });
  });

  it("has public and private visibility options", () => {
    renderComponent();

    expect(screen.getByText("Public")).toBeTruthy();
    expect(screen.getByText("Private")).toBeTruthy();
    expect(screen.getByText(/anyone on the internet/i)).toBeTruthy();
  });
});
