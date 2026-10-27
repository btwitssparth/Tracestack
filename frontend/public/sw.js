self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: "TraceStack alert", body: "A monitored service changed status." }; }
  event.waitUntil(self.registration.showNotification(payload.title || "TraceStack alert", {
    body: payload.message || payload.body || "A monitored service changed status.",
    icon: "/favicon.ico", badge: "/favicon.ico",
    tag: payload.tag || "tracestack-monitor-alert", renotify: false,
    data: { url: payload.url || "/dashboard", notificationId: payload.notification_id || null },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
