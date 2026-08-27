"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Broom,
  BrushCleaning,
  CalendarDays,
  Check,
  CheckCircle2,
  Droplets,
  Eye,
  EyeOff,
  LogOut,
  Minus,
  Package,
  Paintbrush,
  Plus,
  Printer,
  Search,
  SoapDispenserDroplet,
  Sparkles,
  SprayCan,
  Trash2,
  UserRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

type Screen = "Stocks" | "Attention Needed" | "End of Day" | "User";
type User = { id: string; name: string; email: string; role: string };
type Item = {
  id: string;
  name: string;
  unit: string;
  storageLocation: string;
  currentQuantity: number;
  inventoryStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};
type Movement = {
  id: string;
  transactionCode: string;
  item: string;
  quantity: number;
  unit: string;
  previousQuantity: number;
  newQuantity: number;
  officer: string;
  sourceLocation: string | null;
  destinationLocation: string | null;
  reference: string | null;
  createdAt: string;
};
type Receipt = { code: string; item: string; quantity: number; unit: string; from: string; to: string; time: Date };

const productNames = ["Tissue", "Soap", "Broom", "Bleach", "Collector", "Dust Bin", "Sweeper", "Mop", "Air Freshener", "T-Roll"];
const productIcons: Record<string, LucideIcon> = {
  Tissue: Package,
  Soap: SoapDispenserDroplet,
  Broom,
  Bleach: Droplets,
  Collector: BrushCleaning,
  "Dust Bin": Trash2,
  Sweeper: Paintbrush,
  Mop: Sparkles,
  "Air Freshener": SprayCan,
  "T-Roll": Boxes,
};
const iconTones: Record<string, string> = {
  Tissue: "bg-blue-50 text-blue-700",
  Soap: "bg-teal-50 text-teal-700",
  Broom: "bg-amber-50 text-amber-700",
  Bleach: "bg-sky-50 text-sky-700",
  Collector: "bg-cyan-50 text-cyan-700",
  "Dust Bin": "bg-slate-100 text-slate-600",
  Sweeper: "bg-emerald-50 text-emerald-700",
  Mop: "bg-indigo-50 text-indigo-700",
  "Air Freshener": "bg-violet-50 text-violet-700",
  "T-Roll": "bg-blue-50 text-blue-700",
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "Something went wrong.");
  return data as T;
}

export default function CleanwareApp() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("Stocks");
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    const [inventory, transactions] = await Promise.all([
      request<{ items: Item[] }>("/api/inventory"),
      request<{ transactions: Movement[] }>("/api/transactions"),
    ]);
    const mvpItems = inventory.items
      .filter((item) => productNames.includes(item.name))
      .sort((a, b) => productNames.indexOf(a.name) - productNames.indexOf(b.name));
    setItems(mvpItems);
    setMovements(transactions.transactions);
    setSelected((current) => mvpItems.find((item) => item.id === current?.id) ?? mvpItems[0] ?? null);
  }, []);

  useEffect(() => {
    request<{ user: User }>("/api/auth/me")
      .then(async ({ user: current }) => { setUser(current); setAuth("in"); await load(); })
      .catch(() => setAuth("out"));
  }, [load]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  if (auth === "loading") return <Loading />;
  if (auth === "out") return <Login onSuccess={async (current) => { setUser(current); setAuth("in"); await load(); }} />;

  const attention = items.filter((item) => item.currentQuantity < 10);
  const today = new Date().toDateString();
  const todayMoves = movements.filter((movement) => new Date(movement.createdAt).toDateString() === today && movement.sourceLocation);

  return (
    <div className="min-h-dvh bg-[#f4f5f7] text-[#17191c]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121926] text-white shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <button onClick={() => setScreen("Stocks")} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#17a39a]"><Warehouse size={21} /></span>
            <span className="text-left"><b className="block text-lg leading-none">CLEANWARE</b><small className="text-white/55">Cleaning stock control</small></span>
          </button>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <TopNav active={screen === "Stocks"} icon={Boxes} label="Stocks" onClick={() => setScreen("Stocks")} />
            <TopNav active={screen === "End of Day"} icon={CalendarDays} label="End of Day" onClick={() => setScreen("End of Day")} />
            <TopNav active={screen === "Attention Needed"} icon={AlertTriangle} label={`Attention Needed${attention.length ? ` · ${attention.length}` : ""}`} onClick={() => setScreen("Attention Needed")} />
          </nav>
          <button onClick={() => setScreen("User")} className="ml-auto flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/10 md:ml-2">
            <span className="grid size-9 place-items-center rounded-full bg-[#17a39a] font-bold">{user?.name.slice(0, 1).toUpperCase()}</span>
            <span className="hidden text-left lg:block"><b className="block text-sm">{user?.name}</b><small className="text-white/55">{user?.role.replaceAll("_", " ")}</small></span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 pb-24 sm:p-6 md:pb-8">
        {screen === "Stocks" && <Stocks items={items} selected={selected} select={setSelected} busy={busy} transfer={async (input) => {
          setBusy(true);
          try {
            const result = await request<{ transaction: { transactionCode: string } }>("/api/stock/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, itemId: selected!.id }) });
            const completed = { code: result.transaction.transactionCode, item: selected!.name, quantity: input.quantity, unit: selected!.unit, from: input.from, to: input.to, time: new Date() };
            setReceipt(completed);
            await load();
            notify(`${input.quantity} ${selected!.unit} of ${selected!.name} transferred.`);
            if (input.printReceipt) window.setTimeout(() => window.print(), 150);
          } catch (error) { notify(error instanceof Error ? error.message : "Transfer failed."); }
          finally { setBusy(false); }
        }} />}
        {screen === "Attention Needed" && <Attention items={attention} select={(item) => { setSelected(item); setScreen("Stocks"); }} />}
        {screen === "End of Day" && <EndOfDay rows={todayMoves} />}
        {screen === "User" && <UserScreen user={user!} logout={async () => { await fetch("/api/auth/logout", { method: "POST" }); setAuth("out"); setUser(null); }} />}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl bg-[#121926] p-1.5 text-white shadow-2xl md:hidden">
        <BottomNav active={screen === "Stocks"} icon={Boxes} label="Stocks" onClick={() => setScreen("Stocks")} />
        <BottomNav active={screen === "Attention Needed"} icon={AlertTriangle} label="Attention" onClick={() => setScreen("Attention Needed")} />
        <BottomNav active={screen === "End of Day"} icon={CalendarDays} label="End Day" onClick={() => setScreen("End of Day")} />
        <BottomNav active={screen === "User"} icon={UserRound} label="User" onClick={() => setScreen("User")} />
      </nav>
      {toast && <div className="fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-[#17191c] px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6"><Check size={17} className="text-teal-400" />{toast}</div>}
      {receipt && <PrintableReceipt receipt={receipt} />}
    </div>
  );
}

function Stocks({ items, selected, select, busy, transfer }: { items: Item[]; selected: Item | null; select: (item: Item) => void; busy: boolean; transfer: (input: { from: string; to: string; quantity: number; printReceipt: boolean }) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.75fr)]">
      <section>
        <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#138a83]">Warehouse inventory</p><h1 className="mt-1 text-3xl font-bold tracking-[-.035em]">Stocks</h1><p className="mt-1 text-sm text-slate-500">Select a product to move stock.</p></div>
        <label className="mb-4 flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]"><Search size={19} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products — Tissue, Mop, Soap, Bleach…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        {filtered.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => <ProductCard key={item.id} item={item} active={selected?.id === item.id} onClick={() => select(item)} />)}
        </div> : <Empty icon={Search} title="No products found" text="Try another product name." />}
      </section>
      <TransferPanel key={selected?.id ?? "empty"} item={selected} busy={busy} submit={transfer} />
    </div>
  );
}

function ProductCard({ item, active, onClick }: { item: Item; active: boolean; onClick: () => void }) {
  const Icon = productIcons[item.name] ?? Package;
  const low = item.currentQuantity < 10;
  return <button onClick={onClick} className={`product-card relative rounded-[22px] bg-white p-4 text-left shadow-[0_2px_10px_rgba(0,0,0,.07)] ${active ? "ring-2 ring-[#1687d9]" : "ring-1 ring-black/[.04]"}`}>
    {active && <CheckCircle2 className="absolute right-3 top-3 text-[#1687d9]" size={20} />}
    <span className={`grid size-16 place-items-center rounded-2xl ${iconTones[item.name] ?? "bg-slate-100 text-slate-700"}`}><Icon size={34} strokeWidth={1.7} /></span>
    <h2 className="mt-3 text-lg font-bold">{item.name}</h2>
    <p className={`mt-2 text-sm font-semibold ${low ? "text-amber-700" : "text-[#087f69]"}`}>In Stock: {item.currentQuantity} {item.unit}{item.currentQuantity === 1 ? "" : "s"}</p>
    <div className="mt-2 space-y-0.5 text-xs text-slate-500"><p>Unit: {item.unit}</p><p>Location: {item.storageLocation}</p></div>
  </button>;
}

function TransferPanel({ item, busy, submit }: { item: Item | null; busy: boolean; submit: (input: { from: string; to: string; quantity: number; printReceipt: boolean }) => Promise<void> }) {
  const [from, setFrom] = useState("Storage A"), [to, setTo] = useState("Sales Floor"), [quantity, setQuantity] = useState(1), [printReceipt, setPrintReceipt] = useState(false);
  const Icon = item ? productIcons[item.name] ?? Package : Package;
  return <aside className="h-fit rounded-[24px] bg-white p-5 shadow-[0_8px_32px_rgba(0,0,0,.09)] xl:sticky xl:top-22">
    <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#138a83]">Move stock</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Stock Transfer</h2></div><ArrowLeftRight className="text-slate-400" /></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <Select label="From (source location)" value={from} onChange={setFrom} options={["Storage A", "Storage B", "Sales Floor"]} />
      <Select label="To (destination location)" value={to} onChange={setTo} options={["Sales Floor", "Customer", "Waste"]} />
    </div>
    <div className="my-5 h-px bg-slate-100" />
    {item ? <>
      <p className="text-sm font-bold">Selected Product</p>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[#f5f7f8] p-3"><span className={`grid size-12 place-items-center rounded-xl ${iconTones[item.name]}`}><Icon size={25} /></span><div><b>{item.name} · {item.unit}</b><p className="text-xs text-slate-500">{item.currentQuantity} available · {item.storageLocation}</p></div></div>
      <p className="mt-5 text-sm font-bold">Transfer Quantity</p>
      <div className="mt-2 grid grid-cols-[48px_1fr_48px] items-center overflow-hidden rounded-2xl bg-[#f5f7f8] p-1"><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid size-11 place-items-center rounded-xl bg-white text-slate-600 shadow-sm"><Minus /></button><b className="text-center text-lg">{quantity}</b><button aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(item.currentQuantity, value + 1))} className="grid size-11 place-items-center rounded-xl bg-[#1168c4] text-white"><Plus /></button></div>
      <div className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-950"><b>Transfer: {quantity} × {item.name}</b><p className="mt-1 text-blue-800">{from} → {to}</p></div>
      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-[#f7f7f8] p-3 text-sm font-semibold"><input type="checkbox" checked={printReceipt} onChange={(event) => setPrintReceipt(event.target.checked)} className="size-5 accent-[#1168c4]" /><Printer size={18} />Print receipt</label>
      <button disabled={busy || item.currentQuantity < 1 || from === to} onClick={() => submit({ from, to, quantity, printReceipt })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1168c4] py-3.5 font-bold text-white shadow-[0_8px_20px_rgba(17,104,196,.2)] disabled:cursor-not-allowed disabled:opacity-45"><CheckCircle2 size={19} />{busy ? "Transferring…" : "DONE · Transfer Stock"}</button>
    </> : <Empty icon={Package} title="Select a product" text="Choose one of the products to begin a transfer." />}
  </aside>;
}

function Attention({ items, select }: { items: Item[]; select: (item: Item) => void }) {
  return <section><PageHead eyebrow="Low stock alert" title="Attention Needed" text="Products with fewer than 10 units remaining." />{items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <ProductCard key={item.id} item={item} active={false} onClick={() => select(item)} />)}</div> : <Empty icon={CheckCircle2} title="Stock levels look good" text="No products currently need attention." />}</section>;
}

function EndOfDay({ rows }: { rows: Movement[] }) {
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  return <section><PageHead eyebrow="Today’s warehouse activity" title="End of Day" text="A simple record of every stock movement completed today." /><div className="mb-5 grid gap-3 sm:grid-cols-2"><Stat label="Movements today" value={rows.length} /><Stat label="Total units moved" value={total} /></div><div className="overflow-hidden rounded-[22px] bg-white shadow-sm">{rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => <article key={row.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><b>{row.item}</b><p className="text-sm text-slate-500">{row.sourceLocation} → {row.destinationLocation}</p></div><div className="sm:text-right"><b>{row.quantity} {row.unit}{row.quantity === 1 ? "" : "s"}</b><p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {row.officer}</p></div></article>)}</div> : <Empty icon={CalendarDays} title="No movements today" text="Completed transfers will appear here." />}</div></section>;
}

function UserScreen({ user, logout }: { user: User; logout: () => Promise<void> }) {
  return <section className="mx-auto max-w-xl"><PageHead eyebrow="Account" title="Login / User" text="Your active CLEANWARE warehouse account." /><div className="rounded-[24px] bg-white p-6 shadow-sm"><span className="grid size-16 place-items-center rounded-full bg-[#17a39a] text-2xl font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span><h2 className="mt-4 text-xl font-bold">{user.name}</h2><p className="text-sm text-slate-500">{user.email}</p><span className="mt-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{user.role.replaceAll("_", " ")}</span><button onClick={logout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#121926] py-3 font-bold text-white"><LogOut size={18} />Log out</button></div></section>;
}

function Login({ onSuccess }: { onSuccess: (user: User) => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [show, setShow] = useState(false);
  return <main className="grid min-h-dvh bg-[#121926] lg:grid-cols-[1.05fr_.95fr]">
    <section className="login-stock-pattern hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-[#17a39a]"><Warehouse /></span><div><b className="text-xl">CLEANWARE</b><p className="text-sm text-white/55">Cleaning stock control</p></div></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-300">Warehouse accountability</p><h1 className="mt-4 max-w-xl text-6xl font-bold leading-[1.02] tracking-[-.045em]">Stock in.<br />Stock out.<br />Always clear.</h1></div><p className="text-sm text-white/55">Secure online warehouse management</p></section>
    <section className="grid place-items-center rounded-t-[32px] bg-[#f4f5f7] p-5 lg:rounded-l-[36px] lg:rounded-tr-none"><form onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); try { const result = await request<{ user: User }>("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) }); await onSuccess(result.user); } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed."); } finally { setBusy(false); } }} className="w-full max-w-md rounded-[26px] bg-white p-7 shadow-[0_22px_70px_rgba(0,0,0,.11)] sm:p-9"><span className="grid size-11 place-items-center rounded-xl bg-[#17a39a] text-white lg:hidden"><Warehouse /></span><h2 className="mt-5 text-3xl font-bold tracking-tight">Welcome back</h2><p className="mt-1 text-sm text-slate-500">Sign in to manage warehouse stock.</p>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<FieldLabel>Email</FieldLabel><input name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="form-field" /><FieldLabel>Password</FieldLabel><div className="relative"><input name="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" className="form-field pr-12" /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></div><button disabled={busy} className="mt-6 w-full rounded-xl bg-[#1168c4] py-3.5 font-bold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form></section>
  </main>;
}

function TopNav({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-[#1168c4] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={17} />{label}</button>; }
function BottomNav({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) { return <button onClick={onClick} className={`rounded-xl py-2 text-[10px] font-semibold ${active ? "bg-[#1168c4]" : "text-white/60"}`}><Icon className="mx-auto mb-1" size={19} />{label}</button>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-[#1168c4]">{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function PageHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#138a83]">{eyebrow}</p><h1 className="mt-1 text-3xl font-bold tracking-[-.035em]">{title}</h1><p className="mt-1 text-sm text-slate-500">{text}</p></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <article className="rounded-[22px] bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><b className="mt-1 block text-3xl">{value}</b></article>; }
function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="grid min-h-52 place-items-center p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Icon /></span><b className="mt-4 block">{title}</b><p className="mt-1 text-sm text-slate-500">{text}</p></div></div>; }
function FieldLabel({ children }: { children: ReactNode }) { return <label className="mt-5 block text-sm font-bold">{children}</label>; }
function Loading() { return <div className="grid min-h-dvh place-items-center bg-[#f4f5f7]"><div className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1168c4]" /></div>; }
function PrintableReceipt({ receipt }: { receipt: Receipt }) { return <section id="transfer-receipt" className="hidden"><h1>CLEANWARE</h1><p>Stock Transfer Receipt</p><hr /><p><b>{receipt.code}</b></p><p>{receipt.item}: {receipt.quantity} {receipt.unit}{receipt.quantity === 1 ? "" : "s"}</p><p>{receipt.from} → {receipt.to}</p><p>{receipt.time.toLocaleString()}</p></section>; }
