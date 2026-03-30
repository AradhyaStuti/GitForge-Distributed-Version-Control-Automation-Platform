import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import Login from "../components/auth/Login";

vi.mock("../api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const renderLogin = () =>
  render(<AuthProvider><BrowserRouter><Login /></BrowserRouter></AuthProvider>);

describe("Login Component", () => {
  it("renders the login form with all fields", () => {
    renderLogin();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });

  it("shows validation error for empty fields", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText("Please fill in all fields.")).toBeTruthy();
    });
  });

  it("updates input values on change", () => {
    renderLogin();
    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput.value).toBe("test@example.com");
  });
});
