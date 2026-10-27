import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MonitorDetailClient from "./monitor-detail-client";

export default async function MonitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const supabase = await createClient();
 const { data: { user }, error } = await supabase.auth.getUser();
 if (error || !user) redirect("/login");
 const { id } = await params;
 return <MonitorDetailClient monitorId={id} />;
}
