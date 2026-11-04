"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  RoomGraphic,
  type RoomLayout,
} from "@/components/seat-plans/room-graphic";
type Room = {
  id: string;
  nameBn: string;
  building?: string | null;
  floor?: string | null;
  layout: RoomLayout;
  isActive: boolean;
};
const blank = (): RoomLayout => [
  { benches: 4 },
  { benches: 3 },
  { benches: 4 },
  { benches: 3 },
];
function Spinner() {
  return (
    <span aria-hidden="true" className="inline-block animate-spin">
      ◌
    </span>
  );
}
export default function RoomsPage() {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ nameBn: "", building: "", floor: "" });
  const [layout, setLayout] = useState<RoomLayout>(blank());
  const [pending, setPending] = useState("");
  async function load() {
    const response = await fetch("/api/backend/rooms");
    const payload = (await response.json()) as {
      data?: Room[];
      message?: string;
    };
    if (!response.ok) throw new Error(payload.message ?? "রুম লোড করা যায়নি");
    setRooms(payload.data ?? []);
  }
  useEffect(() => {
    void load().catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "রুম লোড করা যায়নি",
      ),
    );
  }, []);
  const benches = useMemo(
    () => layout.reduce((a, r) => a + r.benches, 0),
    [layout],
  );
  function reset() {
    setEditing(null);
    setForm({ nameBn: "", building: "", floor: "" });
    setLayout(blank());
  }
  async function request(
    url: string,
    method: string,
    body?: unknown,
    success = "কাজ সম্পন্ন হয়েছে",
  ) {
    setPending(url);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "কাজটি করা যায়নি");
      toast.success(success);
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "কাজটি করা যায়নি");
      return false;
    } finally {
      setPending("");
    }
  }
  async function save() {
    if (!form.nameBn.trim() || !layout.length) {
      toast.error("রুমের নাম ও অন্তত একটি সারি দিন");
      return;
    }
    const ok = await request(
      editing ? `/api/backend/rooms/${editing}` : "/api/backend/rooms",
      editing ? "PATCH" : "POST",
      {
        ...form,
        layout,
        ...(editing
          ? {
              confirmDraftLayoutChange: window.confirm(
                "খসড়া প্ল্যান থাকলে পুনরায় জেনারেট করতে হবে। এগোবেন?",
              ),
            }
          : {}),
      },
      editing ? "রুম হালনাগাদ হয়েছে" : "রুম সংরক্ষণ হয়েছে",
    );
    if (ok) reset();
  }
  async function toggle(room: Room) {
    if (
      !window.confirm(
        room.isActive ? "রুমটি নিষ্ক্রিয় করবেন?" : "রুমটি আবার সক্রিয় করবেন?",
      )
    )
      return;
    await request(
      `/api/backend/rooms/${room.id}`,
      "PATCH",
      { isActive: !room.isActive },
      room.isActive ? "রুম নিষ্ক্রিয় হয়েছে" : "রুম সক্রিয় হয়েছে",
    );
  }
  async function remove(room: Room) {
    if (!window.confirm(`রুম ${room.nameBn} মুছে ফেলবেন?`)) return;
    await request(
      `/api/backend/rooms/${room.id}`,
      "DELETE",
      undefined,
      "রুম মুছে ফেলা হয়েছে",
    );
  }
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <h1>রুমসমূহ</h1>
          <p>সারি অনুযায়ী বাস্তব বেঞ্চ লেআউট পরিচালনা করুন।</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
        <Card>
          <CardHeader>
            <CardTitle>রুমের তালিকা</CardTitle>
          </CardHeader>
          <CardContent>
            {!rooms.length ? (
              <p>কোনো রুম নেই — নতুন রুম যোগ করুন।</p>
            ) : (
              <div className="tbl-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>রুম</th>
                      <th>ভবন/তলা</th>
                      <th>বিন্যাস</th>
                      <th>ধারণক্ষমতা (১/২/৩)</th>
                      <th>অবস্থা</th>
                      <th>কাজ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((r) => {
                      const total = (r.layout ?? []).reduce(
                        (a, x) => a + x.benches,
                        0,
                      );
                      return (
                        <tr key={r.id}>
                          <td>{r.nameBn}</td>
                          <td>
                            {[r.building, r.floor]
                              .filter(Boolean)
                              .join(" / ") || "—"}
                          </td>
                          <td>
                            {(r.layout ?? []).map((x) => x.benches).join("+")}
                          </td>
                          <td>
                            {total} / {total * 2} / {total * 3}
                          </td>
                          <td>
                            <Badge variant="secondary">
                              {r.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                            </Badge>
                          </td>
                          <td className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(pending)}
                              onClick={() => {
                                setEditing(r.id);
                                setForm({
                                  nameBn: r.nameBn,
                                  building: r.building ?? "",
                                  floor: r.floor ?? "",
                                });
                                setLayout(r.layout);
                              }}
                            >
                              সম্পাদনা
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={Boolean(pending)}
                              onClick={() => void toggle(r)}
                            >
                              {pending.includes(r.id) && <Spinner />}{" "}
                              {r.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={Boolean(pending)}
                              onClick={() => void remove(r)}
                            >
                            {pending.includes(r.id) && <Spinner />}
                              মুছুন
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "রুম সম্পাদনা" : "নতুন রুম"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="রুম নম্বর/নাম"
                value={form.nameBn}
                onChange={(e) => setForm({ ...form, nameBn: e.target.value })}
              />
              <Input
                placeholder="ভবন (ঐচ্ছিক)"
                value={form.building}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
              />
              <Input
                placeholder="তলা (ঐচ্ছিক)"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
              />
              <div className="flex items-center justify-between">
                <b>সারির বিন্যাস</b>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    setLayout([
                      ...layout,
                      { benches: layout.at(-1)?.benches ?? 3 },
                    ])
                  }
                >
                  সারি যোগ করুন
                </Button>
              </div>
              {layout.map((row, i) => (
                <div className="flex items-center gap-2" key={i}>
                  <span className="w-16">সারি {i + 1}</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={row.benches}
                    onChange={(e) =>
                      setLayout(
                        layout.map((x, j) =>
                          j === i ? { benches: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(pending)}
                    onClick={() =>
                      setLayout([
                        ...layout.slice(0, i + 1),
                        { benches: row.benches },
                        ...layout.slice(i + 1),
                      ])
                    }
                  >
                    ডুপ্লিকেট
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={Boolean(pending)}
                    onClick={() => setLayout(layout.filter((_, j) => j !== i))}
                  >
                    বাদ
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                disabled={Boolean(pending)}
                onClick={() => {
                  const value = Number(
                    window.prompt(
                      "সব সারিতে কতটি বেঞ্চ বসবে?",
                      String(layout[0]?.benches ?? 3),
                    ),
                  );
                  if (value >= 1 && value <= 20)
                    setLayout(layout.map(() => ({ benches: value })));
                }}
              >
                সব সারিতে একই বেঞ্চ সংখ্যা বসাও
              </Button>
              <p className="text-sm text-muted-foreground">
                মোট সারি {layout.length} · মোট বেঞ্চ {benches} · ধারণক্ষমতা{" "}
                {benches} / {benches * 2} / {benches * 3}
                <br />
                সারি: {layout.map((x) => x.benches).join("+")}
              </p>
              <RoomGraphic layout={layout} />
              <div className="flex gap-2">
                <Button disabled={Boolean(pending)} onClick={() => void save()}>
                  {pending.includes("/rooms") && <Spinner />}{" "}
                  {editing ? "পরিবর্তন সংরক্ষণ" : "রুম সংরক্ষণ"}
                </Button>
                {editing && (
                  <Button
                    variant="outline"
                    disabled={Boolean(pending)}
                    onClick={reset}
                  >
                    বাতিল
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
