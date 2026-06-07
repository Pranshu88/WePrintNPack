"use client";
import { useState, useEffect, useRef } from "react";

type Notif = { id: string; type: "order" | "review"; message: string; created_at: string };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-CA");
}

function groupByDate(notifications: Notif[]) {
  const groups: Record<string, Notif[]> = {};
  for (const n of notifications) {
    const d = new Date(n.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

const SEEN_KEY = "admin-notifs-seen-ids";

export default function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then(r => r.json())
      .then(({ notifications: data }: { notifications: Notif[] }) => {
        setNotifications(data ?? []);
        try {
          const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
          setUnread((data ?? []).filter((n: Notif) => !seen.includes(n.id)).length);
        } catch {
          setUnread((data ?? []).length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleOpen() {
    setOpen(o => !o);
    if (!open) {
      // Mark all as seen
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(notifications.map(n => n.id)));
      } catch { /* ignore */ }
      setUnread(0);
    }
  }

  const groups = groupByDate(notifications);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0, marginLeft: "auto" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", fontSize: "1.1rem", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444", border: "2px solid #fff", fontSize: "0.6rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{ position: "absolute", top: 48, right: 0, width: 380, maxHeight: 520, background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", boxShadow: "0 8px 32px rgba(0,0,0,0.13)", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>Notifications</span>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{notifications.length} total</span>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>No notifications yet</div>
            ) : (
              Object.entries(groups).map(([date, items]) => (
                <div key={date}>
                  <div style={{ padding: "8px 18px 4px", fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {date}
                  </div>
                  {items.map(n => (
                    <div key={n.id} style={{ padding: "11px 18px", borderBottom: "1px solid #f9fafb", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>
                        {n.type === "order" ? "🛒" : "⭐"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#111827", lineHeight: 1.45 }}>{n.message}</p>
                        <span style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 2, display: "block" }}>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
