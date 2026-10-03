// Static showcase data for the public landing page.
// Phase 1 swaps `freeThisWeek` and the hero court grid for live Prisma
// queries (Slot + Booking) — keep the shapes identical when you do.

export type SlotState = "free" | "booked" | "social" | "maint" | "just";

export const heroTimes = ["5pm", "5:30", "6pm", "6:30", "7pm", "7:30", "8pm", "8:30"];

export const heroCourts: { name: string; sport: string; slots: SlotState[] }[] = [
  { name: "Court 1", sport: "Badminton", slots: ["booked", "booked", "free", "free", "booked", "booked", "just", "free"] },
  { name: "Court 2", sport: "Badminton", slots: ["free", "booked", "booked", "booked", "social", "social", "social", "social"] },
  { name: "Court 3", sport: "Tennis", slots: ["booked", "free", "free", "booked", "booked", "free", "booked", "booked"] },
  { name: "Court 4", sport: "Squash", slots: ["maint", "maint", "free", "free", "booked", "free", "free", "booked"] },
  { name: "Turf", sport: "Football 5s", slots: ["booked", "booked", "booked", "booked", "booked", "booked", "free", "free"] },
];

export const whosHere = [
  { initials: "RS", name: "Rahul Sharma", sub: "Court 1 · 6:00 – 7:00", plan: "gold", color: "#f6a945" },
  { initials: "AM", name: "Ananya Mehta", sub: "Court 3 · 6:30 – 7:30", plan: "silver", color: "#6aa1e0" },
  { initials: "KJ", name: "Kabir Joshi", sub: "Coaching · Turf", plan: "junior", color: "#2fb8a0" },
];

export const freeThisWeek = [
  { day: "Today", time: "7:00 pm", court: "Court 3 · Tennis", list: "₹600", gold: true },
  { day: "Today", time: "8:30 pm", court: "Court 4 · Squash", list: "₹400", gold: true },
  { day: "Tomorrow", time: "6:00 am", court: "Court 1 · Badminton", list: "₹350", gold: true },
  { day: "Tomorrow", time: "9:00 pm", court: "Turf · Football 5s", list: "₹1,800", gold: false },
  { day: "Fri", time: "7:00 pm", court: "Court 2 · Social play", list: "₹200", gold: true },
  { day: "Sat", time: "10:00 am", court: "Court 3 · Tennis", list: "₹600", gold: true },
  { day: "Sun", time: "5:30 pm", court: "Court 1 · Badminton", list: "₹350", gold: true },
];

export const plans = [
  {
    name: "Silver",
    who: "Plays a couple of evenings a week",
    price: "1,499",
    hot: false,
    perks: ["50% off every court booking", "10% off at the bar and cafeteria", "Book 7 days ahead", "Friday social play access"],
  },
  {
    name: "Gold",
    who: "Lives at the club",
    price: "2,999",
    hot: true,
    perks: ["Courts are free — up to 2 sessions a day", "20% off bar, cafeteria and shop", "Book 14 days ahead, priority waitlist", "Guest passes and free restringing drop-off"],
  },
  {
    name: "Junior",
    who: "Under 16, coached",
    price: "899",
    hot: false,
    perks: ["Two coaching sessions a week", "2 free court hours a week", "Parent gets every booking on WhatsApp", "Skill rating tracked match by match"],
  },
];

export const modules = [
  { t: "Courts & bookings", d: "Slots, pricing rules, waitlist, no double-booking" },
  { t: "Members & QR", d: "One record, membership card, check-in scanner" },
  { t: "Leads & trials", d: "Enquiry → trial → quote → member, on a kanban" },
  { t: "Shop & inventory", d: "Counter sale and online orders hit the same stock" },
  { t: "Bar & tabs", d: "Table map, member discount, split bills, Z-report" },
  { t: "Kitchen display", d: "Tickets, timers, ready → WhatsApp the member" },
  { t: "Owner dashboard", d: "Revenue by source and payment mode, heatmaps" },
  { t: "HR & payroll", d: "Shifts, leave approvals, payslips to the ledger" },
  { t: "WhatsApp & voice", d: "Book, cancel or ask — by message or a phone call" },
];
