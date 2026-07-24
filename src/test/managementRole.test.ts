import { describe, it, expect } from "vitest";

type AppRole = "owner" | "admin" | "manager" | "rep";

const MANAGEMENT_ROLES: readonly AppRole[] = ["owner", "admin", "manager"];
const canManage = (role: AppRole | null) =>
  role !== null && MANAGEMENT_ROLES.includes(role);

describe("management role predicate", () => {
  it("grants owner, admin, and manager", () => {
    expect(canManage("owner")).toBe(true);
    expect(canManage("admin")).toBe(true);
    expect(canManage("manager")).toBe(true);
  });

  it("denies reps and unauthenticated users", () => {
    expect(canManage("rep")).toBe(false);
    expect(canManage(null)).toBe(false);
  });
});
