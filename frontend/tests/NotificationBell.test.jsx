import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

vi.mock("../src/api/client", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

import NotificationBell from "../src/components/NotificationBell.jsx";

describe("NotificationBell", () => {
  it("renders a bell button with no unread badge when there are no notifications", async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const button = await screen.findByRole("button", { name: /notifications/i });
    expect(button).toBeInTheDocument();
    // No unread count badge should render when the notification list is empty.
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("opens a dropdown panel when clicked", async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const button = await screen.findByRole("button", { name: /notifications/i });
    fireEvent.click(button);

    expect(await screen.findByText("Notifications")).toBeInTheDocument();
    expect(await screen.findByText(/nothing yet/i)).toBeInTheDocument();
  });
});
