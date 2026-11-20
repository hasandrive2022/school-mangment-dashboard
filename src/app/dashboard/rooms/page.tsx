"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RoomGraphic,
  type RoomLayout,
} from "@/components/seat-plans/room-graphic";
import { useToast } from "@/components/ui/toast";

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
const apiMessage = (payload: { message?: string }, fallback: string) =>
  payload.message ?? fallback;
function Spinner() {
  return (
    <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
    const payload = (await response.json().catch(() => ({}))) as {
      data?: Room[];
      message?: string;
    };
    if (!response.ok)
      throw new Error(apiMessage(payload, "রুমের তালিকা লোড করা যায়নি"));
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
    () => layout.reduce((total, row) => total + row.benches, 0),
    [layout],
  );
  function reset() {
    setEditing(null);
    setForm({ nameBn: "", building: "", floor: "" });
    setLayout(blank());
  }
  function startEdit(room: Room) {
    setEditing(room.id);
    setForm({
      nameBn: room.nameBn,
      building: room.building ?? "",
      floor: room.floor ?? "",
    });
    setLayout(room.layout);
  }
  async function save() {
    if (pending) return;
    if (!form.nameBn.trim() || !layout.length) {
      toast.error("রুমের নাম ও অন্তত একটি সারি দিন");
      return;
    }
    setPending("save");
    try {
      const response = await fetch(
        editing ? `/api/backend/rooms/${editing}` : "/api/backend/rooms",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            layout,
            ...(editing
              ? {
                  confirmDraftLayoutChange: window.confirm(
                    "খসড়া প্ল্যান থাকলে পুনরায় জেনারেট করতে হবে। এগোবেন?",
                  ),
                }
              : {}),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(apiMessage(payload, "রুম সংরক্ষণ করা যায়নি"));
      toast.success(
        editing ? "রুমের পরিবর্তন সংরক্ষিত হয়েছে" : "রুম তৈরি হয়েছে",
      );
      reset();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "রুম সংরক্ষণ করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function toggle(room: Room) {
    if (
      pending ||
      !window.confirm(
        room.isActive ? "এই রুম নিষ্ক্রিয় করবেন?" : "এই রুম সক্রিয় করবেন?",
      )
    )
      return;
    setPending(`toggle-${room.id}`);
    try {
      const response = await fetch(`/api/backend/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          apiMessage(payload, "রুমের অবস্থা পরিবর্তন করা যায়নি"),
        );
      toast.success(
        room.isActive ? "রুম নিষ্ক্রিয় হয়েছে" : "রুম সক্রিয় হয়েছে",
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "রুমের অবস্থা পরিবর্তন করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function remove(room: Room) {
    if (pending || !window.confirm(`রুম “${room.nameBn}” মুছবেন?`)) return;
    setPending(`delete-${room.id}`);
    try {
      const response = await fetch(`/api/backend/rooms/${room.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) throw new Error(apiMessage(payload, "রুম মুছা যায়নি"));
      toast.success("রুম মুছে ফেলা হয়েছে");
      if (editing === room.id) reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "রুম মুছা যায়নি");
    } finally {
      setPending("");
    }
  }
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <h1>রুমসমূহ</h1>
          <p>সারি অনুযায়ী বাস্তব বেঞ্চ লেআউট ও ধারণক্ষমতা পরিচালনা করুন।</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
        <Card>
          <CardHeader>
            <CardTitle>রুমের তালিকা</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tbl-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>রুম</th>
                    <th>ভবন/তলা</th>
                    <th>বিন্যাস</th>
                    <th>ধারণক্ষমতা (১/২/৩)</th>
                    <th>অবস্থা</th>
                    <th>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length ? (
                    rooms.map((room) => {
                      const total = room.layout.reduce(
                        (sum, row) => sum + row.benches,
                        0,
                      );
                      return (
                        <tr key={room.id}>
                          <td>{room.nameBn}</td>
                          <td>
                            {[room.building, room.floor]
                              .filter(Boolean)
                              .join(" / ") || "—"}
                          </td>
                          <td>
                            {room.layout.map((row) => row.benches).join("+")}
                          </td>
                          <td>
                            {total} / {total * 2} / {total * 3}
                          </td>
                          <td>
                            <Badge variant="secondary">
                              {room.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={Boolean(pending)}
                                onClick={() => startEdit(room)}
                              >
                                সম্পাদনা
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={Boolean(pending)}
                                onClick={() => void toggle(room)}
                              >
                                {pending === `toggle-${room.id}` && <Spinner />}
                                {room.isActive
                                  ? "নিষ্ক্রিয় করুন"
                                  : "সক্রিয় করুন"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={Boolean(pending)}
                                onClick={() => void remove(room)}
                              >
                                {pending === `delete-${room.id}` && <Spinner />}
                                মুছুন
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        কোনো রুম নেই — নতুন রুম যোগ করুন
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                onChange={(event) =>
                  setForm({ ...form, nameBn: event.target.value })
                }
              />
              <Input
                placeholder="ভবন (ঐচ্ছিক)"
                value={form.building}
                onChange={(event) =>
                  setForm({ ...form, building: event.target.value })
                }
              />
              <Input
                placeholder="তলা (ঐচ্ছিক)"
                value={form.floor}
                onChange={(event) =>
                  setForm({ ...form, floor: event.target.value })
                }
              />
              <div className="flex items-center justify-between">
                <b>সারির বিন্যাস</b>
                <Button
                  size="sm"
                  variant="outline"
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
              {layout.map((row, index) => (
                <div
                  className="flex items-center gap-2"
                  key={`${index}-${row.benches}`}
                >
                  <span className="w-16">সারি {index + 1}</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={row.benches}
                    onChange={(event) =>
                      setLayout(
                        layout.map((item, itemIndex) =>
                          itemIndex === index
                            ? { benches: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLayout([
                        ...layout.slice(0, index + 1),
                        { benches: row.benches },
                        ...layout.slice(index + 1),
                      ])
                    }
                  >
                    ডুপ্লিকেট
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setLayout(
                        layout.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    বাদ
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
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
                সারি: {layout.map((row) => row.benches).join("+")}
              </p>
              <RoomGraphic layout={layout} />
              <div className="flex gap-2">
                <Button disabled={Boolean(pending)} onClick={() => void save()}>
                  {pending === "save" && <Spinner />}
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
