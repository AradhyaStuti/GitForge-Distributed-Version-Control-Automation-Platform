import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import CreateSnippet from "../components/snippets/CreateSnippet";

const mockPost = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../api", () => ({
  default: {
    post: (...args) => mockPost(...args),
    get: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderComponent = () =>
  render(<AuthProvider><BrowserRouter><CreateSnippet /></BrowserRouter></AuthProvider>);

describe("CreateSnippet Component", () => {
  beforeEach(() => { mockPost.mockReset(); mockNavigate.mockReset(); });

  it("shows error when submitting without files", async () => {
    const toast = (await import("react-hot-toast")).default;
    renderComponent();
    fireEvent.click(screen.getByText("Create snippet"));
    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith("Add at least one file with name and content."); });
  });

  it("adds and removes file blocks", () => {
    renderComponent();
    expect(screen.getAllByPlaceholderText(/filename/i).length).toBe(1);
    fireEvent.click(screen.getByText("+ Add another file"));
    expect(screen.getAllByPlaceholderText(/filename/i).length).toBe(2);
    fireEvent.click(screen.getAllByText("Remove")[0]);
    expect(screen.getAllByPlaceholderText(/filename/i).length).toBe(1);
  });

  it("submits valid snippet and navigates", async () => {
    mockPost.mockResolvedValue({ data: { _id: "snippet123" } });
    const toast = (await import("react-hot-toast")).default;
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/filename/i), { target: { value: "hello.js" } });
    fireEvent.change(screen.getByPlaceholderText(/paste your code/i), { target: { value: "console.log('hello')" } });
    fireEvent.click(screen.getByText("Create snippet"));
    await waitFor(() => { expect(toast.success).toHaveBeenCalledWith("Snippet created!"); });
    expect(mockNavigate).toHaveBeenCalledWith("/snippet/snippet123");
  });

  it("handles API error on submit", async () => {
    mockPost.mockRejectedValue({ response: { data: { message: "Server error" } } });
    const toast = (await import("react-hot-toast")).default;
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText(/filename/i), { target: { value: "test.py" } });
    fireEvent.change(screen.getByPlaceholderText(/paste your code/i), { target: { value: "print('hi')" } });
    fireEvent.click(screen.getByText("Create snippet"));
    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith("Server error"); });
  });
});
