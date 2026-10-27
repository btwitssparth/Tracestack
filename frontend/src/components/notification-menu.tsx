"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Menu } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/button";

type NotificationItem = {
  id: number;
  monitor_id: number;
  incident_id: number | null;
  type: "monitor_down" | "monitor_recovered";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type NotificationConfig = { configured: boolean; public_key: string | null };

function relativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function NotificationMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not load notifications.");
      setNotifications(Array.isArray(body) ? body : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .getRegistration("/sw.js")
      .then(async (registration) => {
        const subscription = await registration?.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));
      })
      .catch(() => setPushEnabled(false));
  }, []);

  async function markRead(id: number) {
    const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (!response.ok) {
      setError("Could not mark notification as read.");
      return;
    }
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications/read-all", { method: "POST" });
    if (!response.ok) {
      setError("Could not mark notifications as read.");
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  function openNotification(item: NotificationItem) {
    void markRead(item.id);
    if (pathname === "/dashboard") {
      document.getElementById("incidents")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push("/dashboard#incidents");
    }
  }

  async function toggleWebPush() {
    setPushBusy(true);
    setError("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("This browser does not support web push notifications.");
      }
      if (Notification.permission === "denied") {
        throw new Error("Browser notifications are blocked. Allow them in your browser site settings.");
      }
      const configResponse = await fetch("/api/notifications/push-config", { cache: "no-store" });
      const config = (await configResponse.json()) as NotificationConfig;
      if (!configResponse.ok || !config.configured || !config.public_key) {
        throw new Error("Web push is not configured on the TraceStack server yet.");
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Allow browser notifications to enable web push.");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(config.public_key),
        });
      }
      const response = await fetch("/api/notifications/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not enable web push.");
      setPushEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable web push.");
    } finally {
      setPushBusy(false);
    }
  }

  async function disableWebPush() {
    setPushBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch {
      setError("Could not disable web push. Please try again.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <Menu
      panelClassName="w-[min(94vw,400px)] p-0"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-label={`Notifications, ${unreadCount} unread`}
          aria-expanded={open}
          onClick={toggle}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
            open
              ? "border-line-strong bg-ink/[0.06] text-ink"
              : "border-line text-muted hover:border-line-strong hover:text-ink",
          )}
        >
          {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {unreadCount > 0 && (
            <span className="tnum absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-canvas bg-crit px-1 text-[10px] font-bold leading-none text-[#2a0b0b]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <div className="flex max-h-[min(80vh,540px)] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">Notifications</p>
              <p className="text-[11px] text-faint">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="border-b border-crit/20 bg-crit/[0.06] px-4 py-2 text-[12px] text-crit">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-raised text-faint">
                  <Bell className="h-4 w-4" />
                </span>
                <p className="mt-3 text-[13px] font-medium text-ink">You&apos;re all caught up</p>
                <p className="mt-1 text-[12px] leading-5 text-faint">
                  Incidents and recoveries will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const Icon: LucideIcon = item.type === "monitor_down" ? CircleAlert : CircleCheck;
                const tone = item.type === "monitor_down" ? "text-crit" : "text-ok";
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-ink/[0.03]",
                      !item.is_read && "bg-accent/[0.035]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border",
                        item.type === "monitor_down"
                          ? "border-crit/25 bg-crit/10"
                          : "border-ok/25 bg-ok/10",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", tone)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px]",
                          item.is_read ? "font-medium text-muted" : "font-semibold text-ink",
                        )}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-5 text-faint">
                        {item.message}
                      </span>
                      <span className="tnum mt-1 block text-[11px] text-faint/80">
                        {relativeTime(item.created_at)}
                      </span>
                    </span>
                    {!item.is_read && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-line p-3">
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void (pushEnabled ? disableWebPush() : toggleWebPush())}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-raised px-3 py-2.5 text-[12px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              {pushBusy ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <BellRing className="h-3.5 w-3.5" />
              )}
              {pushBusy
                ? "Updating…"
                : pushEnabled
                  ? "Disable browser notifications"
                  : "Enable browser notifications"}
            </button>
            <p className="mt-2 text-center text-[11px] leading-4 text-faint">
              In-app alerts are always on. Browser alerts require permission.
            </p>
          </div>
        </div>
      )}
    </Menu>
  );
}
