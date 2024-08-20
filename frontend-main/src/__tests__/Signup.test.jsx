import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../authContext";
import Signup from "../components/auth/Signup";

vi.mock("../api", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderSignup = () =>
  render(
    <AuthProvider>
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    </AuthProvider>
  );

describe("Signup Component", () => {
  it("renders the signup form", () => {
    renderSignup();

    expect(screen.getByText("Create your account")).toBeTruthy();
    expect(screen.getByLabelText("Username")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create account" })).toBeTruthy();
  });

  it("shows error for empty fields", async () => {
    renderSignup();

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Please fill in all fields.")).toBeTruthy();
    });
  });

  it("shows error for short password", async () => {
    renderSignup();

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "12345" } });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters.")).toBeTruthy();
    });
  });

  it("has a link to login page", () => {
    renderSignup();

    const link = screen.getByText("Sign in");
    expect(link.getAttribute("href")).toBe("/auth");
  });
});
