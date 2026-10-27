"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiGet, apiPatch, apiPost } from "@/lib/admin-api";
import { bn } from "@/lib/format";

type SmsSettingsView = {
  provider: string;
  senderId: string;
  isEnabled: boolean;
  testMode: boolean;
  dueTemplate: string;
  resultTemplate: string;
  hasApiKey: boolean;
  apiKeyHint: string;
  configured: boolean;
};
type Option = { id: string; nameBn?: string; classId?: string };
type LogRow = {
  id: string;
  kind: string;
  recipientName?: string | null;
  mobile: string;
  message: string;
  segments: number;
  status: string;
  createdAt: string;
};
type SendSummary = {
  sent: number;
  failed: number;
  recipients: number;
  skipped: number;
  totalSegments: number;
  testMode: boolean;
};

const KIND_LABEL: Record<string, string> = {
  manual: "সাধারণ",
  due: "বকেয়া",
  result: "ফলাফল",
  attendance: "উপস্থিতি",
  admission: "ভর্তি",
};
const STATUS_LABEL: Record<string, string> = {
  sent: "পাঠানো হয়েছে",
  failed: "ব্যর্থ",
  test: "টেস্ট (পাঠানো হয়নি)",
};

/** Same segment rule as the backend: Unicode (বাংলা) 70/67, GSM 160/153. */
function segmentsOf(message: string): number {
  const len = [...message].length;
  if (!len) return 0;
  const unicode = /[^\x00-\x7F]/.test(message);
  if (unicode) return len <= 70 ? 1 : Math.ceil(len / 67);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

export default function SmsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"send" | "logs" | "settings">("send");
  const [settings, setSettings] = useState<SmsSettingsView | null>(null);
  const [classes, setClasses] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);

  // send form
  const [audienceType, setAudienceType] = useState("class");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [numbers, setNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ count: number; skipped: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<SendSummary | null>(null);

  // logs
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [logKind, setLogKind] = useState("");

  // settings form
  const [apiKey, setApiKey] = useState("");
  const [balance, setBalance] = useState<string | null>(null);

  async function loadSettings() {
    const payload = await apiGet<{ data: SmsSettingsView }>("/api/backend/sms/settings");
    setSettings(payload.data);
  }
  async function loadLogs() {
    const query = logKind ? `?kind=${logKind}&limit=100` : "?limit=100";
    const payload = await apiGet<{ data: LogRow[] }>(`/api/backend/sms/logs${query}`);
    setLogs(payload.data);
  }

  useEffect(() => {
    void loadSettings().catch(() => undefined);
    void apiGet<{ data: Option[] }>("/api/backend/academics/classes")
      .then((p) => setClasses(p.data ?? []))
      .catch(() => undefined);
    void apiGet<{ data: Option[] }>("/api/backend/academics/sections")
      .then((p) => setSections(p.data ?? []))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (tab === "logs") void loadLogs().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, logKind]);

  function audience() {
    if (audienceType === "teachers") return { type: "teachers" as const };
    if (audienceType === "custom")
      return {
        type: "custom" as const,
        numbers: numbers.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean),
      };
    if (audienceType === "section")
      return { type: "section" as const, sectionId };
    return { type: "class" as const, classId };
  }

  async function doPreview() {
    try {
      const payload = await apiPost<{ data: { count: number; skipped: number } }>(
        "/api/backend/sms/preview",
        { value: audience() },
      );
      setPreview(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "প্রিভিউ করা যায়নি");
    }
  }

  async function doSend() {
    setSending(true);
    setSummary(null);
    try {
      const payload = await apiPost<{ data: SendSummary }>("/api/backend/sms/send", {
        value: { audience: audience(), message },
      });
      setSummary(payload.data);
      toast.success(
        payload.data.testMode
          ? "টেস্ট মোডে লগ করা হয়েছে — আসল SMS পাঠানো হয়নি"
          : "SMS পাঠানো সম্পন্ন হয়েছে",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SMS পাঠানো যায়নি");
    } finally {
      setSending(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    try {
      const payload = await apiPatch<{ data: SmsSettingsView }>("/api/backend/sms/settings", {
        value: {
          provider: settings.provider,
          senderId: settings.senderId,
          isEnabled: settings.isEnabled,
          testMode: settings.testMode,
          dueTemplate: settings.dueTemplate,
          resultTemplate: settings.resultTemplate,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        },
      });
      setSettings(payload.data);
      setApiKey("");
      toast.success("SMS সেটিংস সংরক্ষিত হয়েছে");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি");
    }
  }

  async function checkBalance() {
    try {
      const payload = await apiGet<{ data: { configured: boolean; balance: string | null } }>(
        "/api/backend/sms/balance",
      );
      setBalance(
        payload.data.configured
          ? (payload.data.balance ?? "পাওয়া যায়নি")
          : "আগে API Key সেট করুন",
      );
    } catch {
      setBalance("যাচাই করা যায়নি");
    }
  }

  const charCount = [...message].length;
  const seg = segmentsOf(message);
  const sectionOptions = sections.filter((s) => !classId || s.classId === classId);

  return (
    <div className="sms-page">
      <div className="rowflex" style={{ marginBottom: 12 }}>
        <Button className={tab === "send" ? "btn pri sm" : "btn gho sm"} size="sm" variant="outline" onClick={() => setTab("send")}>SMS পাঠান</Button>
        <Button className={tab === "logs" ? "btn pri sm" : "btn gho sm"} size="sm" variant="outline" onClick={() => setTab("logs")}>SMS লগ</Button>
        <Button className={tab === "settings" ? "btn pri sm" : "btn gho sm"} size="sm" variant="outline" onClick={() => setTab("settings")}>সেটিংস ও টেমপ্লেট</Button>
      </div>

      {settings && !settings.configured && tab !== "settings" ? (
        <Card className="card" style={{ marginBottom: 12 }}>
          <CardContent>
            <p>
              ⚠️ SMS গেটওয়ে এখনো সেট করা হয়নি। <b>সেটিংস ও টেমপ্লেট</b> ট্যাবে গিয়ে
              BulkSMSBD-এর API Key ও Sender ID বসান — ততদিন পাঠানো SMS শুধু টেস্ট মোডে লগ হবে,
              আসল SMS যাবে না।
            </p>
          </CardContent>
        </Card>
      ) : null}
      {settings?.configured && settings.testMode ? (
        <Card className="card" style={{ marginBottom: 12 }}>
          <CardContent>
            <p>🧪 টেস্ট মোড চালু আছে — SMS লগ হবে কিন্তু আসল নম্বরে যাবে না। আসল পাঠাতে সেটিংসে টেস্ট মোড বন্ধ করে SMS চালু করুন।</p>
          </CardContent>
        </Card>
      ) : null}

      {tab === "send" ? (
        <Card className="card">
          <CardHeader>
            <CardTitle>নতুন SMS পাঠান</CardTitle>
            <p>শিক্ষার্থীদের SMS যাবে অভিভাবকের মোবাইল নম্বরে।</p>
          </CardHeader>
          <CardContent>
            <div className="finance-filters">
              <Select className="sel" value={audienceType} onChange={(e) => { setAudienceType(e.target.value); setPreview(null); }}>
                <option value="class">শ্রেণি অনুযায়ী</option>
                <option value="section">শাখা অনুযায়ী</option>
                <option value="teachers">শিক্ষকবৃন্দ</option>
                <option value="custom">কাস্টম নম্বর</option>
              </Select>
              {(audienceType === "class" || audienceType === "section") && (
                <Select className="sel" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(""); setPreview(null); }}>
                  <option value="">শ্রেণি বেছে নিন</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameBn}</option>
                  ))}
                </Select>
              )}
              {audienceType === "section" && (
                <Select className="sel" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPreview(null); }}>
                  <option value="">শাখা বেছে নিন</option>
                  {sectionOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.nameBn}</option>
                  ))}
                </Select>
              )}
            </div>
            {audienceType === "custom" && (
              <div style={{ marginTop: 10 }}>
                <label className="finance-label">মোবাইল নম্বরসমূহ (কমা বা নতুন লাইন দিয়ে আলাদা করুন)</label>
                <textarea className="inp" rows={3} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="017XXXXXXXX, 018XXXXXXXX" />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <label className="finance-label">বার্তা</label>
              <textarea className="inp" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="SMS-এর লেখা লিখুন…" />
              <small>
                {bn(charCount)} অক্ষর · আনুমানিক {bn(seg)} সেগমেন্ট/প্রাপক
                {preview ? ` · প্রাপক: ${bn(preview.count)} জন (বাদ পড়বে: ${bn(preview.skipped)})` : ""}
              </small>
            </div>
            <div className="rowflex" style={{ marginTop: 12 }}>
              <Button size="sm" variant="outline" className="btn gho sm" onClick={() => void doPreview()}>প্রাপক সংখ্যা দেখুন</Button>
              <Button size="sm" className="btn pri sm" disabled={sending || !message.trim()} onClick={() => void doSend()}>
                {sending ? "পাঠানো হচ্ছে…" : "SMS পাঠান"}
              </Button>
            </div>
            {summary ? (
              <p style={{ marginTop: 10 }}>
                ফলাফল: সফল {bn(summary.sent)} · ব্যর্থ {bn(summary.failed)} · মোট প্রাপক {bn(summary.recipients)} ·
                মোট সেগমেন্ট {bn(summary.totalSegments)}
                {summary.testMode ? " · (টেস্ট মোড — আসল SMS যায়নি)" : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "logs" ? (
        <Card className="card">
          <CardHeader>
            <CardTitle>পাঠানো SMS-এর ইতিহাস</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="finance-filters">
              <Select className="sel" value={logKind} onChange={(e) => setLogKind(e.target.value)}>
                <option value="">সব ধরন</option>
                <option value="manual">সাধারণ</option>
                <option value="due">বকেয়া</option>
                <option value="result">ফলাফল</option>
              </Select>
            </div>
            {logs === null ? (
              <ListSkeleton rows={5} />
            ) : logs.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr><th>সময়</th><th>প্রাপক</th><th>নম্বর</th><th>ধরন</th><th>বার্তা</th><th>সেগমেন্ট</th><th>অবস্থা</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.createdAt).toLocaleString("bn-BD")}</td>
                        <td>{row.recipientName ?? "—"}</td>
                        <td>{bn(row.mobile)}</td>
                        <td>{KIND_LABEL[row.kind] ?? row.kind}</td>
                        <td>{row.message.length > 60 ? `${row.message.slice(0, 60)}…` : row.message}</td>
                        <td>{bn(row.segments)}</td>
                        <td><Badge>{STATUS_LABEL[row.status] ?? row.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">এখনো কোনো SMS পাঠানো হয়নি।</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "settings" ? (
        <Card className="card">
          <CardHeader>
            <CardTitle>SMS গেটওয়ে সেটিংস</CardTitle>
            <p>প্রোভাইডার: BulkSMSBD (bulksmsbd.net) — অ্যাকাউন্ট থেকে API Key ও অনুমোদিত Sender ID বসান।</p>
          </CardHeader>
          <CardContent>
            {settings === null ? (
              <ListSkeleton rows={4} />
            ) : (
              <>
                <div className="finance-filters">
                  <div>
                    <label className="finance-label">Sender ID</label>
                    <Input className="inp" value={settings.senderId} onChange={(e) => setSettings({ ...settings, senderId: e.target.value })} placeholder="যেমন: 8809612XXXXXX" />
                  </div>
                  <div>
                    <label className="finance-label">API Key {settings.hasApiKey ? `(সংরক্ষিত আছে ${settings.apiKeyHint})` : ""}</label>
                    <Input className="inp" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings.hasApiKey ? "পরিবর্তন করতে নতুন key লিখুন" : "API Key লিখুন"} />
                  </div>
                </div>
                <div className="rowflex" style={{ marginTop: 10 }}>
                  <label>
                    <input type="checkbox" checked={settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} /> SMS পাঠানো চালু
                  </label>
                  <label>
                    <input type="checkbox" checked={settings.testMode} onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })} /> টেস্ট মোড (লগ হবে, আসল SMS যাবে না)
                  </label>
                  <Button size="sm" variant="outline" className="btn gho sm" onClick={() => void checkBalance()}>ব্যালেন্স দেখুন</Button>
                  {balance ? <span>ব্যালেন্স: {balance}</span> : null}
                </div>
                <div style={{ marginTop: 16 }}>
                  <label className="finance-label">বকেয়া SMS টেমপ্লেট</label>
                  <textarea className="inp" rows={3} value={settings.dueTemplate} onChange={(e) => setSettings({ ...settings, dueTemplate: e.target.value })} />
                  <small>ব্যবহারযোগ্য: {"{name}"} শিক্ষার্থীর নাম · {"{event}"} ফি ইভেন্টের নাম · {"{amount}"} বকেয়া টাকা · {"{school}"} স্কুলের নাম</small>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="finance-label">ফলাফল SMS টেমপ্লেট</label>
                  <textarea className="inp" rows={3} value={settings.resultTemplate} onChange={(e) => setSettings({ ...settings, resultTemplate: e.target.value })} />
                  <small>ব্যবহারযোগ্য: {"{name}"} · {"{exam}"} পরীক্ষার নাম · {"{gpa}"} · {"{letter}"} গ্রেড · {"{total}"} মোট নম্বর · {"{school}"}</small>
                </div>
                <div className="rowflex" style={{ marginTop: 14 }}>
                  <Button size="sm" className="btn pri sm" onClick={() => void saveSettings()}>সেটিংস সংরক্ষণ করুন</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
