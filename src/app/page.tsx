"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  Boxes,
  CalendarCheck,
  Check,
  FileDown,
  Eye,
  EyeOff,
  History,
  KeyRound,
  LogOut,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  Search,
  ShoppingCart,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

type View =
  | "Sell"
  | "Products"
  | "End of Day"
  | "Dashboard"
  | "Issue Stock"
  | "Receive Stock"
  | "Returns"
  | "Transactions"
  | "Locations"
  | "Users"
  | "Settings";
type User = { id: string; name: string; email: string; role: string };
type Item = {
  id: string;
  sku: string;
  name: string;
  category: { name: string };
  unit: string;
  storageLocation: string;
  currentQuantity: number;
  minimumStockLevel: number;
  maximumStockLevel: number | null;
  unitCost: number | null;
  description: string | null;
  status: string;
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};
type Employee = {
  id: string;
  employeeCode: string;
  qrToken: string;
  fullName: string;
  phone: string;
  email?: string;
  jobTitle: string;
  dateJoined: string;
  status: string;
  client: string | null;
  clientId: string | null;
  location: string | null;
  locationId: string | null;
};
type Client = {
  id: string;
  clientCode: string;
  companyName: string;
  locations: number;
  employees: number;
  status: string;
};
type Location = { id: string; locationCode: string; name: string; clientId: string; address?: string | null; client?: { companyName: string } };
type Movement = {
  id: string;
  transactionCode: string;
  type: string;
  itemId: string;
  item: string;
  quantity: number;
  unit: string;
  previousQuantity: number;
  newQuantity: number;
  employee: string | null;
  client: string | null;
  location: string | null;
  officer: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};
type EligibleIssue = {
  id: string;
  transactionCode: string;
  issuedAt: string;
  items: {
    itemId: string;
    itemName: string;
    unit: string;
    issued: number;
    returned: number;
    remaining: number;
  }[];
};
const nav: [View, typeof Boxes][] = [
  ["Sell", ShoppingCart],
  ["Products", PackageCheck],
  ["End of Day", CalendarCheck],
  ["Dashboard", Boxes],
  ["Receive Stock", ArrowDownToLine],
  ["Returns", RotateCcw],
  ["Transactions", History],
  ["Locations", MapPin],
  ["Users", ShieldCheck],
  ["Settings", Settings],
];
const field =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#4147f5] focus:ring-2 focus:ring-emerald-100";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message ?? "Unable to complete the request.");
  return data;
}
function status(item: Item) {
  return item.inventoryStatus === "OUT_OF_STOCK"
    ? "Out of stock"
    : item.inventoryStatus === "LOW_STOCK"
      ? "Low stock"
      : "In stock";
}
function Badge({ children }: { children: ReactNode }) {
  const value = String(children);
  const css =
    value.includes("OUT") || value.includes("Out")
      ? "bg-red-50 text-red-700"
      : value.includes("LOW") || value.includes("Low")
        ? "bg-amber-50 text-amber-700"
        : value.includes("RECEIVED") ||
            value.includes("RETURNED") ||
            value.includes("Active") ||
            value.includes("In stock")
          ? "bg-emerald-50 text-emerald-700"
          : "bg-blue-50 text-blue-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${css}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className={`max-h-[92dvh] w-full overflow-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button
            onClick={close}
            className="grid size-10 place-items-center rounded-xl bg-stone-100"
          >
            <X size={19} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<"loading" | "out" | "in">("loading"),
    [user, setUser] = useState<User | null>(null),
    [view, setView] = useState<View>("Sell"),
    [navOpen, setNavOpen] = useState(false),
    [toast, setToast] = useState("");
  const [items, setItems] = useState<Item[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [locations, setLocations] = useState<Location[]>([]),
    [moves, setMoves] = useState<Movement[]>([]),
    [userRows, setUserRows] = useState<UserRow[]>([]),
    [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<
      | "item"
      | "edit-item"
      | "new-item"
      | "employee"
      | "new-employee"
      | "receive"
      | "issue"
      | "return"
      | "movement"
      | "new-user"
      | "new-location"
      | null
    >(null),
    [chosenItem, setChosenItem] = useState<Item | null>(null),
    [chosenMove, setChosenMove] = useState<Movement | null>(null);
  const tell = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  };
  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      request<{ items: Item[] }>("/api/inventory"),
      request<{ clients: Client[] }>("/api/clients"),
      request<{ locations: Location[] }>("/api/locations"),
      request<{ transactions: Movement[] }>("/api/transactions"),
    ]);
    setItems(a.items);
    setClients(b.clients);
    setLocations(c.locations);
    setMoves(d.transactions);
  }, []);
  useEffect(() => {
    request<{ user: User }>("/api/auth/me")
      .then(async (x) => {
        setUser(x.user);
        setAuth("in");
        await load();
      })
      .catch(() => setAuth("out"));
  }, [load]);
  useEffect(() => {
    if (view === "Users" && user?.role === "ADMIN")
      request<{ users: UserRow[] }>("/api/users")
        .then((x) => setUserRows(x.users))
        .catch((e) => tell(e.message));
  }, [view, user]);
  const act = async (fn: () => Promise<unknown>, success: string) => {
    setLoading(true);
    try {
      await fn();
      await load();
      setModal(null);
      tell(success);
    } catch (e) {
      tell(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setLoading(false);
    }
  };
  const completeIssue = async (data: {
    locationId: string;
    notes?: string;
    lines: { itemId: string; quantity: number }[];
  }) => {
    setLoading(true);
    try {
      const result = await request<{ transaction: { transactionCode: string } }>(
        "/api/stock/issues",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      await load();
      tell(`Collection ${result.transaction.transactionCode} completed`);
      return result.transaction;
    } catch (error) {
      tell(error instanceof Error ? error.message : "Unable to issue supplies");
      return null;
    } finally {
      setLoading(false);
    }
  };
  if (auth === "loading")
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f7faf8]">
        <div className="size-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#4147f5]" />
      </div>
    );
  if (auth === "out")
    return (
      <Login
        onSuccess={async (x) => {
          setUser(x);
          setAuth("in");
          await load();
        }}
      />
    );
  const activeItems = items.filter((i) => i.status === "ACTIVE");
  const visibleNav = nav.filter(([label]) =>
    label !== "Users" || user!.role === "ADMIN",
  );
  const chooseView = (next: View) => { setView(next); setNavOpen(false); };
  return (
    <div className="min-h-dvh bg-[#eef0f5] text-[#101114] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {navOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setNavOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-black/[.06] bg-white p-4 shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:shadow-none ${navOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => chooseView("Sell")} className="patch-brand flex items-center gap-3 px-2 py-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#4147f5] text-white"><Boxes size={22} /></span>
          <span className="text-left"><b className="block text-xl leading-none">StockFlow</b><small className="mt-1 block text-slate-400">Warehouse control</small></span>
        </button>
        <nav className="mt-7 flex-1 space-y-1 overflow-y-auto">
          {visibleNav.map(([label, Icon]) => (
            <button key={label} onClick={() => chooseView(label)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${view === label ? "bg-[#4147f5] text-white shadow-[0_8px_22px_rgba(65,71,245,.22)]" : "text-slate-500 hover:bg-[#f3f4f8] hover:text-slate-950"}`}>
              <Icon size={19} />{label}
            </button>
          ))}
        </nav>
        <div className="rounded-2xl bg-[#f5f6fa] p-3">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#4147f5] font-bold text-white">{user!.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><b className="block truncate text-sm">{user!.name}</b><span className="text-[10px] text-slate-400">{user!.role.replaceAll("_", " ")}</span></div></div>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); setAuth("out"); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-slate-600 shadow-sm"><LogOut size={16} /> Log out</button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-black/[.06] bg-white/95 px-4 backdrop-blur lg:hidden">
          <button aria-label="Open navigation" onClick={() => setNavOpen(true)} className="grid size-10 place-items-center rounded-xl bg-[#f2f3f7]"><Menu size={20} /></button>
          <b className="ml-3 text-lg">{view}</b>
        </header>
        <main className="pb-8">
        <div className="mx-auto max-w-[1600px] p-3 sm:p-5 lg:p-6">
          {view === "Sell" && <Sell items={activeItems} locations={locations} busy={loading} submit={completeIssue} />}
          {view === "End of Day" && <EndOfDay rows={moves} />}
          {view === "Dashboard" && (
            <Dashboard
              items={items}
              locations={locations}
              moves={moves}
              go={setView}
              action={setModal}
            />
          )}
          {view === "Products" && (
            <Products
              items={items}
              add={() => setModal("new-item")}
              select={(item) => { setChosenItem(item); setModal("item"); }}
            />
          )}
          {view === "Transactions" && (
            <Transactions
              rows={moves}
              select={(x) => {
                setChosenMove(x);
                setModal("movement");
              }}
            />
          )}
          {view === "Issue Stock" && (
            <Callout
              icon={ScanLine}
              title="Issue stock"
              text="Identify staff, select supplies, and deduct stock as one protected transaction."
              button="Start stock issue"
              click={() => setModal("issue")}
            />
          )}
          {view === "Receive Stock" && (
            <Callout
              icon={ArrowDownToLine}
              title="Receive stock"
              text="Record deliveries from suppliers and update live warehouse balances."
              button="Create receipt"
              click={() => setModal("receive")}
            />
          )}
          {view === "Returns" && (
            <Callout
              icon={RotateCcw}
              title="Stock returns"
              text="Return previously issued company supplies to the warehouse."
              button="Record return"
              click={() => setModal("return")}
            />
          )}
          {view === "Locations" && <Locations rows={locations} add={() => setModal("new-location")} />}
          {view === "Users" && (
            <UserAdmin
              current={user!}
              rows={userRows}
              add={() => setModal("new-user")}
              update={(id, data) =>
                act(
                  () =>
                    request(`/api/users/${id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    }).then(async (x) => {
                      const fresh = await request<{ users: UserRow[] }>(
                        "/api/users",
                      );
                      setUserRows(fresh.users);
                      return x;
                    }),
                  "User updated",
                )
              }
            />
          )}
          {view === "Settings" && (
            <PasswordSettings
              busy={loading}
              submit={(data) =>
                act(
                  () =>
                    request("/api/auth/password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    }),
                  "Password changed successfully",
                )
              }
            />
          )}
        </div>
        </main>
      </div>
      {modal === "new-item" && (
        <NewItem
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Inventory item created",
            )
          }
        />
      )}
      {modal === "item" && chosenItem && (
        <ItemDetails
          item={chosenItem}
          close={() => setModal(null)}
          receive={() => setModal("receive")}
          edit={() => setModal("edit-item")}
          deactivate={() => {
            if (
              confirm(
                `Deactivate ${chosenItem.name}? Existing history will remain.`,
              )
            )
              act(
                () =>
                  request(`/api/inventory/${chosenItem.id}`, {
                    method: "DELETE",
                  }),
                "Inventory item deactivated",
              );
          }}
          movements={moves.filter((m) => m.itemId === chosenItem.id)}
        />
      )}
      {modal === "edit-item" && chosenItem && (
        <EditItem
          item={chosenItem}
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request(`/api/inventory/${chosenItem.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Inventory item updated",
            )
          }
        />
      )}
      {modal === "new-employee" && (
        <NewEmployee
          clients={clients.filter((c) => c.status === "ACTIVE")}
          locations={locations}
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/employees", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Staff member created with QR code",
            )
          }
        />
      )}
      {modal === "receive" && (
        <StockForm
          kind="receive"
          items={activeItems}
          locations={locations}
          initialItem={chosenItem?.id}
          busy={loading}
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/stock/receipts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Stock receipt recorded",
            )
          }
        />
      )}
      {modal === "issue" && (
        <StockForm
          kind="issue"
          items={activeItems.filter((item) => item.currentQuantity > 0)}
          locations={locations}
          busy={loading}
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/stock/issues", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Stock issue completed",
            )
          }
        />
      )}
      {modal === "return" && (
        <StockForm
          kind="return"
          items={activeItems}
          locations={locations}
          busy={loading}
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/stock/returns", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }),
              "Stock return recorded",
            )
          }
        />
      )}
      {modal === "movement" && chosenMove && (
        <MovementDetails move={chosenMove} close={() => setModal(null)} />
      )}
      {modal === "new-user" && (
        <NewUser
          close={() => setModal(null)}
          submit={(data) =>
            act(
              () =>
                request("/api/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                }).then(async (x) => {
                  const fresh = await request<{ users: UserRow[] }>(
                    "/api/users",
                  );
                  setUserRows(fresh.users);
                  return x;
                }),
              "System user created",
            )
          }
        />
      )}
      {modal === "new-location" && (
        <NewLocation clients={clients.filter((client) => client.status === "ACTIVE")} close={() => setModal(null)} submit={(data) => act(() => request("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }), "Location added")} />
      )}
      {toast && (
        <div className="fixed bottom-22 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#0e1b33] px-4 py-3 text-sm font-bold text-white shadow-xl lg:bottom-6">
          <Check size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: (u: User) => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  return (
    <main className="grid min-h-dvh bg-[#111113] lg:grid-cols-2">
      <section className="hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white text-[#4147f5]">
            <Boxes />
          </span>
          <b className="text-xl">StockFlow</b>
        </div>
        <div>
          <p className="font-black">WAREHOUSE ACCOUNTABILITY</p>
          <h1 className="mt-4 text-6xl font-black leading-[1.02]">
            Every supply.
            <br />
            Every team.
            <br />
            Accounted for.
          </h1>
        </div>
        <p>Secure online inventory control</p>
      </section>
      <section className="login-canvas grid place-items-center bg-[#f5f5f7] p-5 lg:rounded-l-[36px]">
        <form
          className="login-card w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(0,0,0,.10)] sm:p-9"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const d = await request<{ user: User }>("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: f.get("email"),
                  password: f.get("password"),
                }),
              });
              await onSuccess(d.user);
            } catch (x) {
              setError(x instanceof Error ? x.message : "Sign in failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid size-12 place-items-center rounded-2xl bg-[#4147f5] text-white lg:hidden">
            <Boxes />
          </div>
          <h2 className="mt-5 text-3xl font-black">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your live warehouse.
          </p>
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <label className="mt-6 block text-sm font-bold">Email</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={field}
          />
          <label className="mt-4 block text-sm font-bold">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-[#4147f5]"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Head({
  title,
  text,
  button,
  click,
}: {
  title: string;
  text: string;
  button?: string;
  click?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
      </div>
      {button && (
        <button
          onClick={click}
          className="flex items-center gap-2 rounded-xl bg-[#4147f5] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Plus size={17} />
          {button}
        </button>
      )}
    </div>
  );
}
function Dashboard({
  items,
  locations,
  moves,
  go,
  action,
}: {
  items: Item[];
  locations: Location[];
  moves: Movement[];
  go: (v: View) => void;
  action: (v: "issue" | "receive") => void;
}) {
  const total = items.reduce((s, i) => s + i.currentQuantity, 0),
    low = items.filter((i) => i.inventoryStatus !== "IN_STOCK").length;
  return (
    <>
      <section className="premium-hero inventory-hero overflow-hidden rounded-[28px] bg-[#4147f5] p-7 text-white sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-white/80">Good morning</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-[1.06] tracking-[-.035em] text-white sm:text-5xl">
          Everything your teams need, ready when they arrive.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">Live inventory, location dispatches, and warehouse activity in one clear view.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Dispatch stock", ScanLine, () => go("Sell")],
            ["Receive", ArrowDownToLine, () => action("receive")],
            ["Locations", MapPin, () => go("Locations")],
            ["Products", PackageCheck, () => go("Products")],
          ].map(([l, I, fn]) => {
            const Icon = I as typeof Boxes;
            return (
              <button
                key={l as string}
                onClick={fn as () => void}
                className="quick-action spring-card rounded-[18px] bg-white p-4 text-left text-[#1d1d1f] shadow-[0_8px_24px_rgba(0,0,0,.08)]"
              >
                <Icon className="text-[#4147f5]" />
                <b className="mt-3 block text-sm">{l as string}</b>
              </button>
            );
          })}
        </div>
      </section>
      <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Inventory items", items.length],
          ["Units in stock", total],
          ["Needs attention", low],
          [
            "Delivery locations",
            locations.length,
          ],
        ].map(([a, b]) => (
          <article key={a} className="metric-card spring-card rounded-[22px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <p className="text-sm text-slate-500">{a}</p>
            <b className="mt-1 block text-3xl">{b}</b>
          </article>
        ))}
      </div>
      <Transactions
        rows={moves.slice(0, 8)}
        select={() => go("Transactions")}
      />
    </>
  );
}
function Sell({ items, locations, busy, submit }: {
  items: Item[];
  locations: Location[];
  busy: boolean;
  submit: (data: { locationId: string; notes?: string; lines: { itemId: string; quantity: number }[] }) => Promise<{ transactionCode: string } | null>;
}) {
  const [query, setQuery] = useState("");
  const [locationId, setLocationId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [printReceipt, setPrintReceipt] = useState(false);
  const [receipt, setReceipt] = useState<{ code: string; location: Location; lines: { item: Item; quantity: number }[] } | null>(null);
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );
  const location = locations.find((row) => row.id === locationId);
  const lines = Object.entries(cart).flatMap(([id, quantity]) => {
    const item = items.find((row) => row.id === id);
    return item ? [{ item, quantity }] : [];
  });
  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const change = (item: Item, amount: number) => setCart((current) => {
    const nextQuantity = Math.max(0, Math.min(item.currentQuantity, (current[item.id] ?? 0) + amount));
    const next = { ...current };
    if (nextQuantity === 0) delete next[item.id]; else next[item.id] = nextQuantity;
    return next;
  });

  return (
    <div className="patch-workspace overflow-hidden rounded-[28px] bg-white shadow-[0_18px_55px_rgba(21,28,56,.10)] xl:grid xl:min-h-[calc(100dvh-48px)] xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.78fr)]">
      <section className="bg-[#f7f7fa] p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[.18em] text-[#4147f5]">Supply counter</p>
            <h1 className="text-3xl font-black tracking-[-.04em]">Issue supplies</h1>
            <p className="mt-1 text-sm text-slate-500">Choose products requested by the destination location.</p>
          </div>
          <div className="hidden rounded-2xl bg-white px-4 py-3 text-right shadow-sm sm:block"><b className="block text-lg">{items.length}</b><span className="text-xs text-slate-400">active products</span></div>
        </div>
        <div className="my-5">
          <label className="flex items-center gap-2 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-black/[.04]">
            <Search size={17} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tissue, soap, mop…" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, index) => {
            const quantity = cart[item.id] ?? 0;
            return (
              <article key={item.id} className={`inventory-transfer-card relative rounded-[22px] bg-white p-4 shadow-sm ring-1 ${quantity ? "ring-[#4147f5]" : "ring-black/[.04]"}`}>
                <div
                  className="size-16 rounded-2xl bg-[#eef5ff] bg-[url('/assets/inventory-products.png')] bg-[length:200%_200%]"
                  style={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 100%", "100% 100%"][index % 4] }}
                />
                <h3 className="mt-3 text-lg font-black">{item.name}</h3>
                <p className={`mt-1 text-sm font-bold ${item.currentQuantity < 10 ? "text-amber-700" : "text-emerald-700"}`}>{item.currentQuantity} {item.unit} in stock</p>
                <p className="mt-1 text-xs text-slate-400">{item.storageLocation || "Warehouse"}</p>
                <button disabled={item.currentQuantity < 1} onClick={() => change(item, 1)} aria-label={`Add ${item.name}`} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#4147f5] text-white shadow-[0_7px_18px_rgba(65,71,245,.25)] disabled:bg-slate-200 disabled:shadow-none"><Plus size={20} /></button>
                {quantity > 0 && <span className="absolute bottom-4 right-4 grid size-7 place-items-center rounded-full bg-[#0e1b33] text-xs font-black text-white">{quantity}</span>}
              </article>
            );
          })}
          {!filtered.length && <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-500">No products match your search.</p>}
        </div>
      </section>

      <aside className="patch-checkout border-t border-slate-200 bg-white p-5 sm:p-7 xl:border-l xl:border-t-0">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#343ae6]">Current collection</p><h2 className="mt-1 text-2xl font-black">Supply cart</h2></div>
          <ShoppingCart className="text-slate-400" />
        </div>
        <label className="mt-5 block text-sm font-bold">Delivery location
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={field}><option value="">Select destination…</option>{locations.map((row) => <option value={row.id} key={row.id}>{row.name}{row.client?.companyName && row.client.companyName !== row.name ? ` · ${row.client.companyName}` : ""}</option>)}</select>
        </label>
        {location && <div className="mt-3 rounded-2xl bg-[#eef0ff] p-3 text-sm"><b>{location.name}</b><p className="mt-1 text-xs text-slate-500">{location.client?.companyName ?? "Company location"}{location.address ? ` · ${location.address}` : ""}</p></div>}
        <div className="my-5 h-px bg-slate-100" />
        <div className="space-y-2">
          {lines.map(({ item, quantity }) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#f7f7fa] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-sm">{item.name}</b><span className="text-xs text-slate-400">{item.unit}</span></div><button onClick={() => change(item, -1)} className="grid size-8 place-items-center rounded-full bg-white shadow-sm"><Minus size={15} /></button><b className="w-6 text-center">{quantity}</b><button onClick={() => change(item, 1)} className="grid size-8 place-items-center rounded-full bg-[#4147f5] text-white"><Plus size={15} /></button><button aria-label={`Remove ${item.name}`} onClick={() => setCart((current) => { const next = { ...current }; delete next[item.id]; return next; })} className="grid size-8 place-items-center text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></div>)}
          {!lines.length && <div className="grid min-h-36 place-items-center rounded-2xl bg-[#f7f7fa] p-5 text-center"><div><ShoppingCart className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-500">Your supply cart is empty</p><p className="mt-1 text-xs text-slate-400">Use + to add a product.</p></div></div>}
        </div>
        <div className="mt-5 flex items-center justify-between border-y border-slate-100 py-4"><span className="font-bold">Total supplies</span><b className="text-2xl">{totalUnits} <small className="text-xs text-slate-400">units</small></b></div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-[#f7f7f8] p-3 text-sm font-semibold"><input type="checkbox" checked={printReceipt} onChange={(event) => setPrintReceipt(event.target.checked)} className="size-5 accent-[#4147f5]" /><Printer size={18} /> Print collection receipt</label>
        <button disabled={busy || !location || !lines.length} onClick={async () => { if (!location) return; const snapshot = lines; const result = await submit({ locationId: location.id, lines: snapshot.map((line) => ({ itemId: line.item.id, quantity: line.quantity })) }); if (result) { setReceipt({ code: result.transactionCode, location, lines: snapshot }); setCart({}); if (printReceipt) window.setTimeout(() => window.print(), 180); } }} className="mt-4 w-full rounded-2xl bg-[#4147f5] py-4 font-black text-white shadow-[0_10px_24px_rgba(65,71,245,.22)] disabled:opacity-40">{busy ? "Completing…" : "DISPATCH · Complete issue"}</button>
        <button disabled={!lines.length} onClick={() => setCart({})} className="mt-2 w-full py-2.5 text-sm font-bold text-slate-400 disabled:opacity-30">Clear cart</button>
        {receipt && <section id="supply-issue-receipt" className="hidden"><h1>StockFlow</h1><p>Warehouse Dispatch Receipt</p><hr /><p><b>{receipt.code}</b></p><p><b>Destination:</b> {receipt.location.name}</p><p>{receipt.location.client?.companyName}{receipt.location.address ? ` · ${receipt.location.address}` : ""}</p><hr />{receipt.lines.map((line) => <p key={line.item.id}>{line.item.name}: {line.quantity} {line.item.unit}</p>)}<hr /><p>{new Date().toLocaleString()}</p></section>}
      </aside>
    </div>
  );
}

function Products({ items, add, select }: { items: Item[]; add: () => void; select: (item: Item) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "LOW">("ALL");
  const rows = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (filter === "ALL" || (filter === "LOW" ? item.inventoryStatus !== "IN_STOCK" : item.status === filter)));
  return <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(21,28,56,.08)] sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#4147f5]">Catalogue & stock</p><h1 className="mt-1 text-3xl font-black tracking-[-.04em]">Products</h1><p className="mt-1 text-sm text-slate-500">Add, edit, restock or safely deactivate warehouse products.</p></div><button onClick={add} className="flex items-center gap-2 rounded-xl bg-[#4147f5] px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> Add product</button></div><div className="my-5 flex flex-wrap gap-2"><label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-[#f5f6fa] px-4"><Search size={17} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search products or SKU…" /></label>{(["ALL", "ACTIVE", "INACTIVE", "LOW"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-xs font-bold ${filter === value ? "bg-[#0e1b33] text-white" : "bg-[#f5f6fa] text-slate-500"}`}>{value === "LOW" ? "Needs attention" : value.toLowerCase()}</button>)}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((item, index) => <button key={item.id} onClick={() => select(item)} className="inventory-transfer-card flex items-center gap-4 rounded-[22px] bg-[#f8f8fb] p-4 text-left ring-1 ring-black/[.04]"><div className="size-16 shrink-0 rounded-2xl bg-[#eef0ff] bg-[url('/assets/inventory-products.png')] bg-[length:200%_200%]" style={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 100%", "100% 100%"][index % 4] }} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><b className="truncate text-lg">{item.name}</b><Badge>{item.status === "ACTIVE" ? status(item) : "Inactive"}</Badge></div><p className="mt-2 font-black">{item.currentQuantity} <small className="font-semibold text-slate-400">{item.unit}</small></p><p className="mt-1 text-xs text-slate-400">{item.sku} · {item.storageLocation || "Warehouse"}</p></div></button>)}</div>{!rows.length && <p className="py-14 text-center text-sm text-slate-400">No products found.</p>}</section>;
}
// Legacy staff administration is retained for historical employee records but is no longer routed.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Employees({
  rows,
  select,
  add,
}: {
  rows: Employee[];
  select: (e: Employee) => void;
  add: () => void;
}) {
  return (
    <>
      <Head
        title="Employees"
        text="Staff assignments and printable warehouse identification cards."
        button="Add staff"
        click={add}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((e) => (
          <button
            key={e.id}
            onClick={() => select(e)}
            className="spring-card rounded-[22px] bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,.04)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700">
                {e.fullName
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <b>{e.fullName}</b>
                <p className="text-xs text-slate-500">{e.employeeCode}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold">
              {e.client ?? "Unassigned"}
            </p>
            <p className="text-xs text-slate-500">
              {e.location ?? "No active location"}
            </p>
            <div className="mt-3">
              <Badge>{e.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
function Locations({ rows, add }: { rows: Location[]; add: () => void }) {
  return (
    <>
      <Head title="Locations" text="Destinations that receive warehouse supplies." button="Add location" click={add} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((location) => (
          <article key={location.id} className="spring-card rounded-[22px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
            <span className="grid size-11 place-items-center rounded-xl bg-[#eef0ff] text-[#4147f5]">
              <MapPin />
            </span>
            <h3 className="mt-4 font-black">{location.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{location.client?.companyName ?? "Company location"}</p>
            <p className="mt-3 text-xs text-slate-400">{location.locationCode}{location.address ? ` · ${location.address}` : ""}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function EndOfDay({ rows }: { rows: Movement[] }) {
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const issued = rows.filter((row) => row.type === "STOCK_ISSUED" && new Date(row.createdAt).toLocaleDateString("en-CA") === day);
  const dispatches = new Set(issued.map((row) => row.transactionCode)).size;
  const units = issued.reduce((sum, row) => sum + row.quantity, 0);
  return <section className="rounded-[28px] bg-white p-5 shadow-[0_18px_55px_rgba(21,28,56,.08)] sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#4147f5]">Daily close</p><h1 className="mt-1 text-3xl font-black tracking-[-.04em]">End of Day</h1><p className="mt-1 text-sm text-slate-500">Everything dispatched from the warehouse on the selected day.</p></div><label className="text-xs font-bold text-slate-500">DATE<input type="date" value={day} onChange={(event) => setDay(event.target.value)} className={field} /></label></div><div className="my-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#eef0ff] p-5"><span className="text-xs font-bold text-slate-500">DISPATCHES</span><b className="mt-2 block text-3xl">{dispatches}</b></div><div className="rounded-2xl bg-[#f6f6f9] p-5"><span className="text-xs font-bold text-slate-500">PRODUCT LINES</span><b className="mt-2 block text-3xl">{issued.length}</b></div><div className="rounded-2xl bg-[#f6f6f9] p-5"><span className="text-xs font-bold text-slate-500">TOTAL UNITS</span><b className="mt-2 block text-3xl">{units}</b></div></div><div className="overflow-hidden rounded-2xl ring-1 ring-black/[.05]"><div className="hidden grid-cols-[1fr_1.3fr_1fr_.7fr] bg-[#f5f6fa] px-4 py-3 text-xs font-bold text-slate-400 sm:grid"><span>TRANSACTION</span><span>LOCATION</span><span>PRODUCT</span><span>QUANTITY</span></div>{issued.map((row) => <div key={row.id} className="grid gap-1 border-t border-black/[.05] px-4 py-4 text-sm sm:grid-cols-[1fr_1.3fr_1fr_.7fr]"><b>{row.transactionCode}</b><span>{row.location ?? row.client ?? "—"}</span><span>{row.item}</span><span className="font-bold">{row.quantity} {row.unit}</span></div>)}{!issued.length && <p className="p-10 text-center text-sm text-slate-400">No warehouse dispatches were recorded on this date.</p>}</div></section>;
}

function NewLocation({ clients, close, submit }: { clients: Client[]; close: () => void; submit: (data: Record<string, unknown>) => void }) {
  return <Modal title="Add delivery location" close={close}><form onSubmit={(event) => { event.preventDefault(); submit(Object.fromEntries(new FormData(event.currentTarget).entries())); }}><label className="text-sm font-bold">Location name<input name="name" required placeholder="Wesley Towers" className={field} /></label><label className="mt-4 block text-sm font-bold">Location code<input name="locationCode" required placeholder="WESLEY-TWR" className={field} /></label><label className="mt-4 block text-sm font-bold">Organization<select name="clientId" required className={field}><option value="">Select organization…</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label><label className="mt-4 block text-sm font-bold">Address<input name="address" placeholder="Optional delivery address" className={field} /></label><button className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white">Add location</button></form></Modal>;
}
function Transactions({
  rows,
  select,
}: {
  rows: Movement[];
  select: (m: Movement) => void;
}) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!from || new Date(r.createdAt) >= new Date(`${from}T00:00:00`)) &&
      (!to || new Date(r.createdAt) <= new Date(`${to}T23:59:59`)),
  );
  return (
    <>
      <Head title="Transactions" text="Immutable stock movement ledger." />
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-[20px] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <label className="text-xs font-bold text-slate-500">
          FROM
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border px-3 py-2 text-sm text-slate-800"
          />
        </label>
        <label className="text-xs font-bold text-slate-500">
          TO
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border px-3 py-2 text-sm text-slate-800"
          />
        </label>
        <a
          href={`/api/reports/movements?from=${from}&to=${to}`}
          download
          className="ml-auto flex items-center gap-2 rounded-xl bg-[#0e1b33] px-4 py-2.5 text-sm font-bold text-white"
        >
          <FileDown size={17} />
          Export CSV
        </a>
      </div>
      <section className="overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="divide-y">
          {filtered.length ? (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => select(m)}
                className="grid w-full grid-cols-[1fr_auto] gap-3 p-4 text-left hover:bg-emerald-50/40 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <div>
                  <b>{m.item}</b>
                  <p className="font-mono text-[11px] text-slate-500">
                    {m.transactionCode}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <b>
                    {m.quantity} {m.unit}
                  </b>
                  <p className="text-xs text-slate-500">
                    {m.previousQuantity} → {m.newQuantity}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <b className="text-sm">
                    {m.employee ?? m.reference ?? "Warehouse"}
                  </b>
                  <p className="text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge>{m.type}</Badge>
              </button>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">
              No transactions match this period.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
function Callout({
  icon: Icon,
  title,
  text,
  button,
  click,
}: {
  icon: typeof Boxes;
  title: string;
  text: string;
  button: string;
  click: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="spring-card max-w-lg rounded-[26px] bg-white p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,.08)]">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-[#4147f5]">
          <Icon size={29} />
        </span>
        <h2 className="mt-5 text-2xl font-black">{title}</h2>
        <p className="mt-2 text-slate-500">{text}</p>
        <button
          onClick={click}
          className="mt-6 rounded-xl bg-[#4147f5] px-6 py-3 font-bold text-white"
        >
          {button}
        </button>
      </div>
    </div>
  );
}

function NewItem({
  close,
  submit,
}: {
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  return (
    <Modal title="Add inventory item" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(Object.fromEntries(new FormData(e.currentTarget).entries()));
        }}
      >
        <label className="text-sm font-bold">Item name</label>
        <input name="name" required className={field} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">
            SKU
            <input name="sku" required className={field} />
          </label>
          <label className="text-sm font-bold">
            Category
            <input
              name="category"
              required
              placeholder="Cleaning supplies"
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Unit
            <input name="unit" required placeholder="Rolls" className={field} />
          </label>
          <label className="text-sm font-bold">
            Minimum level
            <input
              name="minimumStockLevel"
              type="number"
              min="0"
              required
              className={field}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold">Description</label>
        <textarea name="description" className={field} />
        <button className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white">
          Create item
        </button>
      </form>
    </Modal>
  );
}
function EditItem({
  item,
  close,
  submit,
}: {
  item: Item;
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  return (
    <Modal title={`Edit ${item.name}`} close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          submit({
            name: f.get("name"),
            category: f.get("category"),
            unit: f.get("unit"),
            minimumStockLevel: Number(f.get("minimumStockLevel")),
            maximumStockLevel: f.get("maximumStockLevel")
              ? Number(f.get("maximumStockLevel"))
              : null,
            unitCost: f.get("unitCost") ? Number(f.get("unitCost")) : null,
            description: f.get("description") || null,
          });
        }}
      >
        <label className="text-sm font-bold">Item name</label>
        <input
          name="name"
          required
          defaultValue={item.name}
          className={field}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">
            Category
            <input
              name="category"
              required
              defaultValue={item.category.name}
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Unit
            <input
              name="unit"
              required
              defaultValue={item.unit}
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Minimum
            <input
              name="minimumStockLevel"
              type="number"
              min="0"
              required
              defaultValue={item.minimumStockLevel}
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Maximum
            <input
              name="maximumStockLevel"
              type="number"
              min="0.001"
              defaultValue={item.maximumStockLevel ?? ""}
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Unit cost (GHS)
            <input
              name="unitCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item.unitCost ?? ""}
              className={field}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold">Description</label>
        <textarea
          name="description"
          defaultValue={item.description ?? ""}
          className={field}
        />
        <button className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white">
          Save changes
        </button>
      </form>
    </Modal>
  );
}
function NewEmployee({
  clients,
  locations,
  close,
  submit,
}: {
  clients: Client[];
  locations: Location[];
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  const [client, setClient] = useState(clients[0]?.id ?? "");
  return (
    <Modal title="Add staff member" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const x = Object.fromEntries(new FormData(e.currentTarget).entries());
          submit({ ...x, clientId: client });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">
            Employee ID
            <input
              name="employeeCode"
              required
              placeholder="EMP-000245"
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Date joined
            <input
              name="dateJoined"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={field}
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-bold">Full name</label>
        <input name="fullName" required className={field} />
        <label className="mt-4 block text-sm font-bold">Phone</label>
        <input name="phone" required className={field} />
        <label className="mt-4 block text-sm font-bold">Job title</label>
        <input
          name="jobTitle"
          required
          defaultValue="Cleaning Staff"
          className={field}
        />
        <label className="mt-4 block text-sm font-bold">Client</label>
        <select
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className={field}
        >
          {clients.map((c) => (
            <option value={c.id} key={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
        <label className="mt-4 block text-sm font-bold">Location</label>
        <select name="locationId" required className={field}>
          {locations
            .filter((l) => l.clientId === client)
            .map((l) => (
              <option value={l.id} key={l.id}>
                {l.name}
              </option>
            ))}
        </select>
        <button className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white">
          Create staff and QR
        </button>
      </form>
    </Modal>
  );
}
function ItemDetails({
  item,
  close,
  receive,
  edit,
  deactivate,
  movements,
}: {
  item: Item;
  close: () => void;
  receive: () => void;
  edit: () => void;
  deactivate: () => void;
  movements: Movement[];
}) {
  return (
    <Modal title={item.name} close={close} wide>
      <div className="grid gap-5 sm:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl bg-[#eef5ff] p-5">
          <p className="text-xs font-bold text-emerald-700">{item.sku}</p>
          <p className="mt-3 text-4xl font-black">{item.currentQuantity}</p>
          <p className="text-sm text-slate-500">{item.unit} available</p>
          <div className="mt-3">
            <Badge>{status(item)}</Badge>
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Category</dt>
              <dd className="font-bold">{item.category.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Minimum</dt>
              <dd className="font-bold">{item.minimumStockLevel}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Status</dt>
              <dd className="font-bold">{item.status}</dd>
            </div>
          </dl>
          {item.status === "ACTIVE" && (
            <>
              <button
                onClick={receive}
                className="mt-5 w-full rounded-xl bg-[#4147f5] py-3 font-bold text-white"
              >
                Receive this item
              </button>
              <button
                onClick={edit}
                className="mt-2 w-full rounded-xl border border-emerald-200 py-3 font-bold text-emerald-700"
              >
                Edit item details
              </button>
              <button
                onClick={deactivate}
                className="mt-2 w-full py-2 text-sm font-bold text-red-600"
              >
                Deactivate item
              </button>
            </>
          )}
        </div>
        <div>
          <h3 className="font-black">Recent movement</h3>
          <div className="mt-3 divide-y rounded-xl border">
            {movements.slice(0, 6).map((m) => (
              <div key={m.id} className="flex justify-between p-3 text-sm">
                <div>
                  <b>{m.type.replaceAll("_", " ")}</b>
                  <p className="text-xs text-slate-500">{m.transactionCode}</p>
                </div>
                <b>
                  {m.quantity} {m.unit}
                </b>
              </div>
            ))}
            {!movements.length && (
              <p className="p-4 text-sm text-slate-500">No movement yet.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EmployeeCard({
  employee,
  close,
}: {
  employee: Employee;
  close: () => void;
}) {
  return (
    <Modal title="Employee card" close={close}>
      <div
        id="employee-print-card"
        className="rounded-[24px] border-2 border-emerald-100 bg-white p-6 text-center"
      >
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#4147f5] text-xl font-black text-white">
          {employee.fullName
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")}
        </div>
        <h3 className="mt-3 text-xl font-black">{employee.fullName}</h3>
        <p className="font-mono text-sm font-bold text-emerald-700">
          {employee.employeeCode}
        </p>
        {/* Authenticated QR response is intentionally rendered directly. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/employees/${employee.id}/qr`}
          alt={`QR code for ${employee.fullName}`}
          width="208"
          height="208"
          className="mx-auto mt-4 size-52"
        />
        <p className="text-sm font-bold">{employee.client}</p>
        <p className="text-xs text-slate-500">
          {employee.location} · {employee.jobTitle}
        </p>
        <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-400">
          Scan for warehouse collection
        </p>
      </div>
      <button
        onClick={() => window.print()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e1b33] py-3 font-bold text-white"
      >
        <Printer size={18} />
        Print employee card
      </button>
    </Modal>
  );
}
function StockForm({
  kind,
  items,
  locations,
  initialItem,
  busy,
  close,
  submit,
}: {
  kind: "receive" | "issue" | "return";
  items: Item[];
  locations: Location[];
  initialItem?: string;
  busy: boolean;
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? ""),
    [lines, setLines] = useState([
      { itemId: initialItem ?? items[0]?.id ?? "", quantity: 1 },
    ]),
    [issues, setIssues] = useState<EligibleIssue[]>([]),
    [issueId, setIssueId] = useState("");
  const selectedIssue = issues.find((i) => i.id === issueId);
  useEffect(() => {
    if (kind !== "return" || !locationId) return;
    request<{ issues: EligibleIssue[] }>(
      `/api/stock/issues/eligible?locationId=${locationId}`,
    )
      .then((x) => {
        setIssues(x.issues);
        setIssueId(x.issues[0]?.id ?? "");
        setLines(
          x.issues[0]?.items[0]
            ? [{ itemId: x.issues[0].items[0].itemId, quantity: 1 }]
            : [],
        );
      })
      .catch(() => setIssues([]));
  }, [kind, locationId]);
  const add = () =>
    setLines((x) => [
      ...x,
      {
        itemId:
          (kind === "return"
            ? selectedIssue?.items[0]?.itemId
            : items[0]?.id) ?? "",
        quantity: 1,
      },
    ]);
  const title =
    kind === "receive"
      ? "Receive stock"
      : kind === "issue"
        ? "Issue stock"
        : "Record stock return";
  const available = kind === "return" ? (selectedIssue?.items ?? []) : items;
  return (
    <Modal title={title} close={close} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          submit(
            kind === "receive"
              ? {
                  supplier: f.get("supplier"),
                  reference: f.get("reference"),
                  notes: f.get("notes"),
                  lines,
                }
              : {
                  locationId,
                  originalIssueId: kind === "return" ? issueId : undefined,
                  notes: f.get("notes"),
                  lines,
                },
          );
        }}
      >
        {kind === "receive" ? (
          <>
            <label className="text-sm font-bold">Supplier</label>
            <input name="supplier" required className={field} />
            <label className="mt-4 block text-sm font-bold">
              Reference number
            </label>
            <input name="reference" className={field} />
          </>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-sm font-bold">
                Location
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  className={field}
                >
                  {locations.map((location) => (
                    <option value={location.id} key={location.id}>
                      {location.name} · {location.client?.companyName ?? "Company"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {kind === "return" && (
              <>
                <label className="mt-4 block text-sm font-bold">
                  Original issue
                </label>
                <select
                  value={issueId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setIssueId(id);
                    const first = issues.find((i) => i.id === id)?.items[0];
                    setLines(
                      first ? [{ itemId: first.itemId, quantity: 1 }] : [],
                    );
                  }}
                  required
                  className={field}
                >
                  {issues.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.transactionCode} ·{" "}
                      {new Date(i.issuedAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {!issues.length && (
                  <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                    This location has no issued items eligible for return.
                  </p>
                )}
              </>
            )}
          </>
        )}
        <div className="mt-5 flex items-center justify-between">
          <b>Items</b>
          <button
            type="button"
            onClick={add}
            className="text-sm font-bold text-emerald-700"
          >
            + Add another
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[1fr_7rem_2.5rem] gap-2">
              <select
                value={line.itemId}
                onChange={(e) =>
                  setLines((x) =>
                    x.map((v, n) =>
                      n === index ? { ...v, itemId: e.target.value } : v,
                    ),
                  )
                }
                className={field}
              >
                {available.map((i) => {
                  const item = "name" in i ? i : null;
                  const optionId = "itemId" in i ? i.itemId : item!.id;
                  return (
                    <option value={optionId} key={optionId}>
                      {"itemName" in i
                        ? `${i.itemName} — ${i.remaining} ${i.unit} returnable`
                        : `${item?.name} — ${item?.currentQuantity} ${item?.unit}`}
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                min="0.001"
                max={
                  kind === "return"
                    ? selectedIssue?.items.find((i) => i.itemId === line.itemId)
                        ?.remaining
                    : undefined
                }
                step="0.001"
                required
                value={line.quantity}
                onChange={(e) =>
                  setLines((x) =>
                    x.map((v, n) =>
                      n === index
                        ? { ...v, quantity: Number(e.target.value) }
                        : v,
                    ),
                  )
                }
                className={field}
              />
              <button
                type="button"
                onClick={() => setLines((x) => x.filter((_, n) => n !== index))}
                className="mt-2 rounded-xl border text-red-600"
              >
                <X size={17} className="mx-auto" />
              </button>
            </div>
          ))}
        </div>
        <label className="mt-4 block text-sm font-bold">Notes</label>
        <textarea name="notes" className={field} />
        <button
          disabled={busy || !lines.length || (kind === "return" && !issueId)}
          className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving transaction…" : title}
        </button>
      </form>
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CameraScanner({
  close,
  found,
}: {
  close: () => void;
  found: (code: string) => void;
}) {
  const [error, setError] = useState(""),
    [manual, setManual] = useState("");
  useEffect(() => {
    let stream: MediaStream | undefined,
      stopped = false,
      timer = 0;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = document.querySelector<HTMLVideoElement>("#qr-camera");
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (x: { formats: string[] }) => {
              detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
            };
          }
        ).BarcodeDetector;
        if (!Detector) {
          setError(
            "Automatic QR detection is not supported in this browser. Enter the employee code below.",
          );
          return;
        }
        const detector = new Detector({ formats: ["qr_code"] });
        const scan = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) {
              found(codes[0].rawValue);
              return;
            }
          } catch {}
          timer = window.setTimeout(scan, 250);
        };
        scan();
      } catch {
        setError(
          "Camera access was unavailable. Check permission or use manual employee ID.",
        );
      }
    };
    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [found]);
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/90 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <b>Scan employee QR</b>
          <button onClick={close}>
            <X />
          </button>
        </div>
        <video
          id="qr-camera"
          playsInline
          muted
          className="mt-4 aspect-square w-full rounded-2xl bg-slate-900 object-cover"
        />
        <p className="mt-3 text-sm text-slate-500">
          Place the employee QR code inside the camera view.
        </p>
        {error && (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="EMP-000245"
            className={field}
          />
          <button
            onClick={() => manual.trim() && found(manual.trim())}
            className="mt-2 rounded-xl bg-[#0e1b33] px-4 font-bold text-white"
          >
            Use ID
          </button>
        </div>
      </div>
    </div>
  );
}
function MovementDetails({
  move,
  close,
}: {
  move: Movement;
  close: () => void;
}) {
  return (
    <Modal title="Transaction details" close={close}>
      <div className="rounded-2xl bg-emerald-50 p-4">
        <p className="font-mono text-sm font-black text-emerald-800">
          {move.transactionCode}
        </p>
        <div className="mt-2">
          <Badge>{move.type}</Badge>
        </div>
      </div>
      <dl className="mt-4 divide-y text-sm">
        {[
          ["Item", move.item],
          ["Quantity", `${move.quantity} ${move.unit}`],
          ["Balance", `${move.previousQuantity} → ${move.newQuantity}`],
          ["Employee", move.employee ?? "—"],
          [
            "Client / location",
            [move.client, move.location].filter(Boolean).join(" · ") || "—",
          ],
          ["Officer", move.officer],
          ["Date", new Date(move.createdAt).toLocaleString()],
        ].map(([a, b]) => (
          <div key={a} className="flex justify-between gap-4 py-3">
            <dt className="text-slate-500">{a}</dt>
            <dd className="text-right font-bold">{b}</dd>
          </div>
        ))}
      </dl>
      <button
        onClick={() => window.print()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e1b33] py-3 font-bold text-white"
      >
        <Printer size={18} />
        Print record
      </button>
    </Modal>
  );
}

function UserAdmin({
  current,
  rows,
  add,
  update,
}: {
  current: User;
  rows: UserRow[];
  add: () => void;
  update: (id: string, data: Record<string, unknown>) => void;
}) {
  if (current.role !== "ADMIN")
    return (
      <Callout
        icon={ShieldCheck}
        title="Administrator access required"
        text="Only administrators can manage system users and permissions."
        button="Return to dashboard"
        click={() => location.reload()}
      />
    );
  return (
    <>
      <Head
        title="User administration"
        text="Control warehouse access and backend-enforced roles."
        button="Add user"
        click={add}
      />
      <section className="overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="divide-y">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 p-4 sm:grid-cols-[1fr_13rem_8rem]"
            >
              <div>
                <b>{row.name}</b>
                <p className="text-xs text-slate-500">{row.email}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Last login:{" "}
                  {row.lastLoginAt
                    ? new Date(row.lastLoginAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <select
                value={row.role}
                disabled={row.id === current.id}
                onChange={(e) => update(row.id, { role: e.target.value })}
                className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-60"
              >
                <option value="ADMIN">Administrator</option>
                <option value="WAREHOUSE_OFFICER">Warehouse officer</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
              <button
                disabled={row.id === current.id}
                onClick={() =>
                  update(row.id, {
                    status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  })
                }
                className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40 ${row.status === "ACTIVE" ? "border border-red-200 text-red-600" : "bg-emerald-50 text-emerald-700"}`}
              >
                {row.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function NewUser({
  close,
  submit,
}: {
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  return (
    <Modal title="Add system user" close={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(Object.fromEntries(new FormData(e.currentTarget).entries()));
        }}
      >
        <label className="text-sm font-bold">Full name</label>
        <input name="name" required className={field} />
        <label className="mt-4 block text-sm font-bold">Email</label>
        <input name="email" type="email" required className={field} />
        <label className="mt-4 block text-sm font-bold">Role</label>
        <select name="role" className={field}>
          <option value="WAREHOUSE_OFFICER">Warehouse officer</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Administrator</option>
          <option value="STAFF">Staff</option>
        </select>
        <label className="mt-4 block text-sm font-bold">
          Temporary password
        </label>
        <input
          name="password"
          type="password"
          minLength={10}
          required
          className={field}
        />
        <p className="mt-2 text-xs text-slate-500">
          Use at least 10 characters. The user should change it after signing
          in.
        </p>
        <button className="mt-6 w-full rounded-xl bg-[#4147f5] py-3.5 font-bold text-white">
          Create user
        </button>
      </form>
    </Modal>
  );
}
function PasswordSettings({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (x: Record<string, unknown>) => void;
}) {
  const [match, setMatch] = useState(true);
  return (
    <>
      <Head
        title="Security settings"
        text="Update your password without exposing it to administrators."
      />
      <section className="max-w-xl rounded-[22px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <KeyRound />
          </span>
          <div>
            <h3 className="font-black">Change password</h3>
            <p className="text-xs text-slate-500">
              At least 10 characters with upper, lower, and number.
            </p>
          </div>
        </div>
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const ok = f.get("newPassword") === f.get("confirmPassword");
            setMatch(ok);
            if (ok)
              submit({
                currentPassword: f.get("currentPassword"),
                newPassword: f.get("newPassword"),
              });
          }}
        >
          <label className="text-sm font-bold">Current password</label>
          <input
            name="currentPassword"
            type="password"
            required
            className={field}
          />
          <label className="mt-4 block text-sm font-bold">New password</label>
          <input
            name="newPassword"
            type="password"
            minLength={10}
            required
            className={field}
          />
          <label className="mt-4 block text-sm font-bold">
            Confirm new password
          </label>
          <input
            name="confirmPassword"
            type="password"
            minLength={10}
            required
            className={field}
          />
          {!match && (
            <p className="mt-2 text-sm font-bold text-red-600">
              The new passwords do not match.
            </p>
          )}
          <button
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[#0e1b33] py-3.5 font-bold text-white"
          >
            {busy ? "Updating…" : "Change password"}
          </button>
        </form>
      </section>
    </>
  );
}
