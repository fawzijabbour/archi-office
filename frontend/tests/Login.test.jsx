import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { AuthProvider } from "../src/context/AuthContext.jsx";
import Login from "../src/pages/Login.jsx";

describe("Login page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders an email field, a password field, and a submit button", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("requires both fields before it can be submitted", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const email = container.querySelector('input[type="email"]');
    const password = container.querySelector('input[type="password"]');
    expect(email).toBeRequired();
    expect(password).toBeRequired();
  });
});
