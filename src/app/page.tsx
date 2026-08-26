"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  Boxes,
  Building2,
  Camera,
  Check,
  FileDown,
  History,
  KeyRound,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

type View =
  | "Dashboard"
  | "Inventory"
  | "Issue Stock"
  | "Receive Stock"
  | "Returns"
  | "Transactions"
  | "Employees"
  | "Clients"
  | "Users"
  | "Settings";
type User = { id: string; name: string; email: string; role: string };
type Item = {
  id: string;
  sku: string;
  name: string;
  category: { name: string };
  unit: string;
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
type Location = { id: string; name: string; clientId: string };
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
  ["Dashboard", Boxes],
  ["Inventory", PackageCheck],
  ["Issue Stock", ScanLine],
  ["Receive Stock", ArrowDownToLine],
  ["Returns", RotateCcw],
  ["Transactions", History],
  ["Employees", Users],
  ["Clients", Building2],
  ["Users", ShieldCheck],
  ["Settings", Settings],
];
const field =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#18b968] focus:ring-2 focus:ring-emerald-100";

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
    [view, setView] = useState<View>("Dashboard"),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const [items, setItems] = useState<Item[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
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
      | null
    >(null),
    [chosenItem, setChosenItem] = useState<Item | null>(null),
    [chosenEmployee, setChosenEmployee] = useState<Employee | null>(null),
    [chosenMove, setChosenMove] = useState<Movement | null>(null);
  const tell = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2800);
  };
  const load = useCallback(async () => {
    const [a, b, c, d, e] = await Promise.all([
      request<{ items: Item[] }>("/api/inventory"),
      request<{ employees: Employee[] }>("/api/employees"),
      request<{ clients: Client[] }>("/api/clients"),
      request<{ locations: Location[] }>("/api/locations"),
      request<{ transactions: Movement[] }>("/api/transactions"),
    ]);
    setItems(a.items);
    setEmployees(b.employees);
    setClients(c.clients);
    setLocations(d.locations);
    setMoves(e.transactions);
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
  if (auth === "loading")
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f7faf8]">
        <div className="size-10 animate-spin rounded-full border-4 border-emerald-100 border-t-[#18b968]" />
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
  const activeItems = items.filter((i) => i.status === "ACTIVE"),
    activeEmployees = employees.filter((e) => e.status === "ACTIVE");
  const sidebar = (
    <aside className="flex h-full w-[min(86vw,18rem)] flex-col border-r border-emerald-100 bg-[#f5fbf7] text-[#17352a] lg:w-64">
      <div className="flex h-18 items-center gap-3 border-b border-emerald-100 px-5">
        <div className="grid size-10 place-items-center rounded-[14px] bg-[#18b968] text-white">
          <Boxes size={21} />
        </div>
        <div className="flex-1">
          <b className="font-extrabold">StockFlow</b>
          <div className="text-xs text-[#688579]">Live warehouse control</div>
        </div>
        <button className="lg:hidden" onClick={() => setMenu(false)}>
          <X />
        </button>
      </div>
      <nav className="flex-1 overflow-auto p-3">
          {nav.filter(([label]) => label !== "Users" || user!.role === "ADMIN").map(([label, Icon]) => (
          <button
            key={label}
            onClick={() => {
              setView(label);
              setMenu(false);
            }}
            className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm ${view === label ? "bg-white font-bold text-[#0b8f4c] shadow-sm ring-1 ring-emerald-100" : "text-[#567267] hover:bg-[#e7f7ed]"}`}
          >
            <span
              className={`grid size-9 place-items-center rounded-xl ${view === label ? "bg-[#18b968] text-white" : "bg-[#def4e7] text-[#168b50]"}`}
            >
              <Icon size={18} />
            </span>
            {label}
          </button>
        ))}
      </nav>
      <div className="m-3 rounded-2xl border border-emerald-100 bg-white p-4">
        <b className="text-sm">{user!.name}</b>
        <div className="text-xs text-slate-500">
          {user!.role.replaceAll("_", " ")}
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setAuth("out");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8f7ee] py-2.5 text-xs font-bold text-[#14683e]"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </aside>
  );
  return (
    <div className="min-h-dvh bg-[#f8f7f3] text-[#17221f]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {sidebar}
      </div>
      {menu && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMenu(false)}
          />
          <div className="relative">{sidebar}</div>
        </div>
      )}
      <main className="pb-20 lg:ml-64 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur sm:px-7">
          <button
            className="grid size-10 place-items-center rounded-xl border lg:hidden"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{view}</h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Online · Database updated in real time
            </p>
          </div>
          <button className="grid size-10 place-items-center rounded-xl border">
            <Search size={19} />
          </button>
          <button
            onClick={() => setModal("issue")}
            className="flex items-center gap-2 rounded-xl bg-[#18b968] px-4 py-2.5 text-sm font-bold text-white"
          >
            <ScanLine size={18} />
            <span className="hidden sm:inline">Quick issue</span>
          </button>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {view === "Dashboard" && (
            <Dashboard
              items={items}
              employees={employees}
              moves={moves}
              go={setView}
              action={setModal}
            />
          )}
          {view === "Inventory" && (
            <Inventory
              items={items}
              select={(x) => {
                setChosenItem(x);
                setModal("item");
              }}
              add={() => setModal("new-item")}
            />
          )}
          {view === "Employees" && (
            <Employees
              rows={employees}
              select={(x) => {
                setChosenEmployee(x);
                setModal("employee");
              }}
              add={() => setModal("new-employee")}
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
          {view === "Clients" && <Clients rows={clients} />}
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
      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-18 grid-cols-4 border-t bg-white lg:hidden">
        {nav.slice(0, 4).map(([label, Icon]) => (
          <button
            key={label}
            onClick={() => setView(label)}
            className={`grid place-items-center text-[10px] font-bold ${view === label ? "text-[#18b968]" : "text-slate-500"}`}
          >
            <span>
              <Icon className="mx-auto" size={20} />
              {label.replace(" Stock", "")}
            </span>
          </button>
        ))}
      </nav>
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
      {modal === "employee" && chosenEmployee && (
        <EmployeeCard employee={chosenEmployee} close={() => setModal(null)} />
      )}
      {modal === "receive" && (
        <StockForm
          kind="receive"
          items={activeItems}
          employees={activeEmployees}
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
          employees={activeEmployees}
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
          employees={activeEmployees}
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
      {toast && (
        <div className="fixed bottom-22 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#17352a] px-4 py-3 text-sm font-bold text-white shadow-xl lg:bottom-6">
          <Check size={17} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: (u: User) => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="warehouse-pattern grid min-h-dvh bg-[#18b968] lg:grid-cols-2">
      <section className="hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-white text-[#18b968]">
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
      <section className="grid place-items-center bg-[#f8f7f3] p-5 lg:rounded-l-[44px]">
        <form
          className="w-full max-w-md rounded-[28px] border bg-white p-7 shadow-xl"
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
          <div className="grid size-12 place-items-center rounded-2xl bg-[#18b968] text-white lg:hidden">
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
            defaultValue="admin@warehouse.local"
            className={field}
          />
          <label className="mt-4 block text-sm font-bold">Password</label>
          <input
            name="password"
            type="password"
            defaultValue="ChangeMe123!"
            className={field}
          />
          <button
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white"
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
          className="flex items-center gap-2 rounded-xl bg-[#18b968] px-4 py-2.5 text-sm font-bold text-white"
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
  employees,
  moves,
  go,
  action,
}: {
  items: Item[];
  employees: Employee[];
  moves: Movement[];
  go: (v: View) => void;
  action: (v: "issue" | "receive") => void;
}) {
  const total = items.reduce((s, i) => s + i.currentQuantity, 0),
    low = items.filter((i) => i.inventoryStatus !== "IN_STOCK").length;
  return (
    <>
      <section className="warehouse-pattern overflow-hidden rounded-[30px] bg-[#18b968] p-6 text-white">
        <p className="text-sm font-black">GOOD MORNING</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight">
          Everything your teams need, ready when they arrive.
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Issue stock", ScanLine, () => action("issue")],
            ["Receive", ArrowDownToLine, () => action("receive")],
            ["Employees", Users, () => go("Employees")],
            ["Inventory", PackageCheck, () => go("Inventory")],
          ].map(([l, I, fn]) => {
            const Icon = I as typeof Boxes;
            return (
              <button
                key={l as string}
                onClick={fn as () => void}
                className="rounded-2xl bg-white p-4 text-left text-[#17352a]"
              >
                <Icon className="text-[#18b968]" />
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
            "Active staff",
            employees.filter((e) => e.status === "ACTIVE").length,
          ],
        ].map(([a, b]) => (
          <article key={a} className="rounded-2xl border bg-white p-5">
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
function Inventory({
  items,
  select,
  add,
}: {
  items: Item[];
  select: (i: Item) => void;
  add: () => void;
}) {
  return (
    <>
      <Head
        title="Inventory"
        text="Live warehouse balances—select an item for details and stock activity."
        button="New item"
        click={add}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i, n) => (
          <button
            key={i.id}
            onClick={() => select(i)}
            className="flex items-center gap-4 rounded-[22px] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300"
          >
            <div
              className="size-20 shrink-0 rounded-2xl bg-[#effaf3] bg-[url('/assets/inventory-products.png')] bg-[length:200%_200%]"
              style={{
                backgroundPosition: [
                  "0% 0%",
                  "100% 0%",
                  "0% 100%",
                  "100% 100%",
                ][n % 4],
              }}
            />
            <div className="min-w-0 flex-1">
              <b>{i.name}</b>
              <p className="text-xs text-slate-500">
                {i.sku} · {i.category.name}
              </p>
              <p className="mt-2 text-xl font-black">
                {i.currentQuantity}{" "}
                <span className="text-sm font-medium text-slate-500">
                  {i.unit}
                </span>
              </p>
              <Badge>{status(i)}</Badge>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
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
            className="rounded-[22px] border bg-white p-5 text-left shadow-sm hover:border-emerald-300"
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
function Clients({ rows }: { rows: Client[] }) {
  return (
    <>
      <Head title="Clients" text="Organizations receiving cleaning services." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <article key={c.id} className="rounded-[22px] border bg-white p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Building2 />
            </span>
            <h3 className="mt-4 font-black">{c.companyName}</h3>
            <p className="text-sm text-slate-500">
              {c.clientCode} · {c.locations} locations · {c.employees} staff
            </p>
          </article>
        ))}
      </div>
    </>
  );
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
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-3">
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
          className="ml-auto flex items-center gap-2 rounded-xl bg-[#17352a] px-4 py-2.5 text-sm font-bold text-white"
        >
          <FileDown size={17} />
          Export CSV
        </a>
      </div>
      <section className="overflow-hidden rounded-[22px] border bg-white">
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
      <div className="max-w-lg rounded-[28px] border bg-white p-8 text-center shadow-lg">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-[#18b968]">
          <Icon size={29} />
        </span>
        <h2 className="mt-5 text-2xl font-black">{title}</h2>
        <p className="mt-2 text-slate-500">{text}</p>
        <button
          onClick={click}
          className="mt-6 rounded-xl bg-[#18b968] px-6 py-3 font-bold text-white"
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
        <button className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white">
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
        <button className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white">
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
        <button className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white">
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
        <div className="rounded-2xl bg-[#effaf3] p-5">
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
                className="mt-5 w-full rounded-xl bg-[#18b968] py-3 font-bold text-white"
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
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#18b968] text-xl font-black text-white">
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17352a] py-3 font-bold text-white"
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
  employees,
  initialItem,
  busy,
  close,
  submit,
}: {
  kind: "receive" | "issue" | "return";
  items: Item[];
  employees: Employee[];
  initialItem?: string;
  busy: boolean;
  close: () => void;
  submit: (x: Record<string, unknown>) => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? ""),
    [lines, setLines] = useState([
      { itemId: initialItem ?? items[0]?.id ?? "", quantity: 1 },
    ]),
    [issues, setIssues] = useState<EligibleIssue[]>([]),
    [issueId, setIssueId] = useState(""),
    [scanner, setScanner] = useState(false);
  const selectedIssue = issues.find((i) => i.id === issueId);
  useEffect(() => {
    if (kind !== "return" || !employeeId) return;
    request<{ issues: EligibleIssue[] }>(
      `/api/stock/issues/eligible?employeeId=${employeeId}`,
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
  }, [kind, employeeId]);
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
                  employeeId,
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
                Employee
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className={field}
                >
                  {employees.map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.employeeCode} — {e.fullName} · {e.location}
                    </option>
                  ))}
                </select>
              </label>
              {kind === "issue" && (
                <button
                  type="button"
                  onClick={() => setScanner(true)}
                  className="mb-0 flex h-[46px] items-center gap-2 rounded-xl bg-[#17352a] px-4 text-sm font-bold text-white"
                >
                  <Camera size={17} />
                  Scan QR
                </button>
              )}
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
                    This employee has no issued items eligible for return.
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
          className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving transaction…" : title}
        </button>
      </form>
      {scanner && (
        <CameraScanner
          close={() => setScanner(false)}
          found={(code) => {
            const match = employees.find(
              (e) =>
                e.qrToken === code ||
                e.employeeCode.toLowerCase() === code.toLowerCase(),
            );
            if (match) {
              setEmployeeId(match.id);
              setScanner(false);
            }
          }}
        />
      )}
    </Modal>
  );
}

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
            className="mt-2 rounded-xl bg-[#17352a] px-4 font-bold text-white"
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17352a] py-3 font-bold text-white"
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
      <section className="overflow-hidden rounded-[22px] border bg-white">
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
        <button className="mt-6 w-full rounded-xl bg-[#18b968] py-3.5 font-bold text-white">
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
      <section className="max-w-xl rounded-[24px] border bg-white p-6">
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
            className="mt-6 w-full rounded-xl bg-[#17352a] py-3.5 font-bold text-white"
          >
            {busy ? "Updating…" : "Change password"}
          </button>
        </form>
      </section>
    </>
  );
}
