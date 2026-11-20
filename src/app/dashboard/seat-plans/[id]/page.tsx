"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoomGraphic } from "@/components/seat-plans/room-graphic";
import { bn, bnDate, bnNum, WEEKDAYS_BN } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

type Row = Record<string, unknown> & {
  id: string;
  status?: string;
  student?: Row;
  candidate?: Row;
  assignment?: Row;
  room?: Row;
  link?: Row;
};
type Detail = Row & { subjects?: Row[]; rooms?: Row[]; assignments?: Row[] };
type AcademicClass = Row & { nameBn?: string; orderIndex?: number };
type AcademicSection = Row & {
  classId?: string;
  nameBn?: string;
  groupName?: string | null;
};
const steps = [
  "পরীক্ষা ও বিষয়",
  "ক্লাস ও গ্রুপ",
  "যোগ্যতা ও অনুমোদন",
  "রুম ও বিন্যাস",
  "পর্যালোচনা ও প্রকাশ",
];
const reasonLabels: Record<string, string> = {
  fee_due: "ফি বকেয়া",
  not_failed: "ফেল নয়",
  no_subject: "বিষয় বরাদ্দ নেই",
  manual: "ম্যানুয়ালি বাদ দেওয়া হয়েছে",
};
const selectClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm";
const nested = (v: unknown): Row =>
  v && typeof v === "object" ? (v as Row) : { id: "" };
const apiMessage = (payload: { message?: string }, fallback: string) =>
  payload.message ?? fallback;
const benchTotal = (layout: unknown) =>
  ((layout as { benches: number }[] | undefined) ?? []).reduce(
    (sum, row) => sum + Number(row.benches),
    0,
  );
function Spinner() {
  return (
    <span aria-hidden="true" className="inline-block animate-spin">
      ◌
    </span>
  );
}

export default function SeatPlanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const toast = useToast();
  const [id, setId] = useState("");
  const [step, setStep] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [candidates, setCandidates] = useState<Row[]>([]);
  const [excluded, setExcluded] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [academicClasses, setAcademicClasses] = useState<AcademicClass[]>([]);
  const [academicSections, setAcademicSections] = useState<AcademicSection[]>(
    [],
  );
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>(
    {},
  );
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [pattern, setPattern] = useState("roll_mix");
  const [mode, setMode] = useState("mixed");
  const [perBench, setPerBench] = useState("1");
  const [registration, setRegistration] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [schoolName, setSchoolName] = useState("বিদ্যালয়");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [previewRoomId, setPreviewRoomId] = useState("");
  const [candidateSort, setCandidateSort] = useState<"roll" | "registration">(
    () =>
      (typeof window !== "undefined" &&
        (localStorage.getItem("seat-plan-candidate-sort") as
          "roll" | "registration")) ||
      "roll",
  );
  const [pending, setPending] = useState("");

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);
  async function load() {
    if (!id) return;
    const [
      d,
      c,
      r,
      x,
      schoolResponse,
      classResponse,
      sectionResponse,
      studentResponse,
    ] = await Promise.all([
      fetch(`/api/backend/seat-plans/${id}`),
      fetch(`/api/backend/seat-plans/${id}/candidates`),
      fetch("/api/backend/rooms"),
      fetch(`/api/backend/seat-plans/${id}/excluded`),
      fetch("/api/school-settings"),
      fetch("/api/backend/academics/classes"),
      fetch("/api/backend/academics/sections"),
      fetch("/api/backend/people/students"),
    ]);
    const detailData = ((await d.json()) as { data?: Detail }).data ?? null;
    setDetail(detailData);
    setCandidates(((await c.json()) as { data?: Row[] }).data ?? []);
    setRooms(((await r.json()) as { data?: Row[] }).data ?? []);
    setExcluded(((await x.json()) as { data?: Row[] }).data ?? []);
    setAcademicClasses(
      ((await classResponse.json()) as { data?: AcademicClass[] }).data ?? [],
    );
    const sectionRows =
      ((await sectionResponse.json()) as { data?: AcademicSection[] }).data ??
      [];
    setAcademicSections(sectionRows);
    const studentRows =
      ((await studentResponse.json()) as { data?: Row[] }).data ?? [];
    setSectionCounts(
      studentRows.reduce<Record<string, number>>((counts, student) => {
        const sectionId = String(student.sectionId ?? "");
        if (sectionId) counts[sectionId] = (counts[sectionId] ?? 0) + 1;
        return counts;
      }, {}),
    );
    if (Array.isArray(detailData?.selectedSections))
      setSelectedSections(detailData.selectedSections.map(String));
    const schoolPayload = (await schoolResponse.json()) as { data?: Row };
    setSchoolName(
      String(
        schoolPayload.data?.nameBn ??
          nested(schoolPayload.data?.school).nameBn ??
          "বিদ্যালয়",
      ),
    );
    if (detailData?.rooms)
      setTeacherNames(
        Object.fromEntries(
          detailData.rooms.map((r) => [
            String(nested(r.room).id || nested(r.link).roomId),
            String(nested(r.link).roomTeacherName ?? ""),
          ]),
        ),
      );
  }
  useEffect(() => {
    void load().catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "সিট প্ল্যান লোড করা যায়নি",
      ),
    );
  }, [id]);
  const approved = useMemo(
    () => candidates.filter((c) => nested(c.candidate).status === "approved"),
    [candidates],
  );
  const sortedClasses = useMemo(
    () =>
      [...academicClasses].sort(
        (a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0),
      ),
    [academicClasses],
  );
  const sortedCandidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...candidates]
      .filter(
        (c) =>
          !needle ||
          String(c.name ?? "")
            .toLowerCase()
            .includes(needle) ||
          String(c.roll ?? "").includes(needle) ||
          String(c.registrationNumber ?? "").includes(needle),
      )
      .sort((a, b) => {
        if (candidateSort === "roll") {
          const rollDiff =
            Number(a.roll ?? Number.MAX_SAFE_INTEGER) -
            Number(b.roll ?? Number.MAX_SAFE_INTEGER);
          if (rollDiff) return rollDiff;
        } else {
          const registrationDiff = String(
            a.registrationNumber ?? "",
          ).localeCompare(String(b.registrationNumber ?? ""), undefined, {
            numeric: true,
          });
          if (registrationDiff) return registrationDiff;
        }
        return String(a.name ?? "").localeCompare(String(b.name ?? ""), "bn");
      });
  }, [candidates, candidateSort, query]);
  const selectedBenchCount = useMemo(
    () =>
      roomIds.reduce(
        (sum, roomId) =>
          sum + benchTotal(rooms.find((item) => item.id === roomId)?.layout),
        0,
      ),
    [roomIds, rooms],
  );
  const selectedCapacity = selectedBenchCount * Number(perBench);
  const allSelected =
    candidates.length > 0 && selected.length === candidates.length;
  const short = roomIds.length > 0 && selectedCapacity < approved.length;
  const gaugePercent =
    selectedCapacity > 0
      ? Math.min(100, Math.round((approved.length / selectedCapacity) * 100))
      : 0;

  function goStep(i: number) {
    setMessage("");
    setStep(i);
  }
  function changeCandidateSort(value: "roll" | "registration") {
    setCandidateSort(value);
    localStorage.setItem("seat-plan-candidate-sort", value);
  }
  function toggleSection(sectionId: string) {
    setSelectedSections((current) =>
      current.includes(sectionId)
        ? current.filter((x) => x !== sectionId)
        : [...current, sectionId],
    );
  }
  function toggleClass(sectionIds: string[]) {
    setSelectedSections((current) => {
      const all = sectionIds.every((s) => current.includes(s));
      return all
        ? current.filter((s) => !sectionIds.includes(s))
        : [...new Set([...current, ...sectionIds])];
    });
  }
  async function addCandidate() {
    if (!registration || pending) return;
    setPending("candidate-add");
    try {
      const r = await fetch(`/api/backend/seat-plans/${id}/candidates/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: registration }),
      });
      const payload = (await r.json()) as { message?: string };
      if (!r.ok)
        throw new Error(apiMessage(payload, "শিক্ষার্থী যোগ করা যায়নি"));
      toast.success("শিক্ষার্থী যোগ হয়েছে");
      setMessage("শিক্ষার্থী যোগ হয়েছে");
      setRegistration("");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "শিক্ষার্থী যোগ করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function saveSelection() {
    if (pending) return;
    setPending("selection");
    try {
      const response = await fetch(`/api/backend/seat-plans/${id}/selection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSectionIds: selectedSections }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(apiMessage(payload, "ক্লাস/গ্রুপ সংরক্ষণ করা যায়নি"));
      toast.success("ক্লাস ও গ্রুপ সংরক্ষণ হয়েছে");
      await load();
      setMessage("ক্লাস ও গ্রুপ সংরক্ষণ হয়েছে; প্রার্থী তালিকা আপডেট হয়েছে");
      setStep(2);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ক্লাস/গ্রুপ সংরক্ষণ করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function excludeSelected() {
    if (!selected.length || pending) return;
    setPending("exclude");
    try {
      const response = await fetch(`/api/backend/seat-plans/${id}/candidates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeStudentIds: selected }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(apiMessage(payload, "শিক্ষার্থী বাদ দেওয়া যায়নি"));
      setSelected([]);
      setMessage("নির্বাচিত প্রার্থীদের বাদ দেওয়া হয়েছে");
      toast.success("নির্বাচিত প্রার্থীদের বাদ দেওয়া হয়েছে");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "শিক্ষার্থী বাদ দেওয়া যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function generate() {
    if (pending) return;
    setPending("generate");
    try {
      const r = await fetch(`/api/backend/seat-plans/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomIds,
          roomMode: mode,
          pattern,
          perBench: Number(perBench),
          roomTeacherNames: teacherNames,
        }),
      });
      const p = (await r.json()) as { message?: string };
      if (!r.ok) throw new Error(apiMessage(p, "আসন তৈরি করা যায়নি"));
      setMessage("আসন বিন্যাস তৈরি হয়েছে");
      toast.success("আসন বিন্যাস তৈরি হয়েছে");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "আসন তৈরি করা যায়নি",
      );
    } finally {
      setPending("");
    }
  }
  async function post(action: string) {
    if (pending) return;
    setPending(action);
    try {
      const r = await fetch(`/api/backend/seat-plans/${id}/${action}`, {
        method: "POST",
      });
      const p = (await r.json()) as { message?: string };
      if (!r.ok) throw new Error(apiMessage(p, "কাজটি করা যায়নি"));
      setMessage("কাজ সম্পন্ন হয়েছে");
      toast.success(
        action === "lock"
          ? "প্ল্যান লক হয়েছে"
          : action === "publish"
            ? "প্ল্যান প্রকাশ হয়েছে"
            : "কাজ সম্পন্ন হয়েছে",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "কাজটি করা যায়নি");
    } finally {
      setPending("");
    }
  }
  async function selectGraphicSeat(assignment?: { id?: string }) {
    if (!assignment?.id) return;
    if (!selectedAssignmentId) {
      setSelectedAssignmentId(assignment.id);
      setMessage("এখন দ্বিতীয় শিক্ষার্থীর বেঞ্চে ক্লিক করুন");
      return;
    }
    const first = selectedAssignmentId;
    setSelectedAssignmentId("");
    if (pending) return;
    setPending("swap");
    try {
      const r = await fetch(`/api/backend/seat-plans/${id}/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstAssignmentId: first,
          secondAssignmentId: assignment.id,
        }),
      });
      const payload = (await r.json()) as { message?: string };
      if (!r.ok) throw new Error(apiMessage(payload, "আসন বদলানো যায়নি"));
      setMessage("দুই শিক্ষার্থীর আসন বদলানো হয়েছে");
      toast.success("দুই শিক্ষার্থীর আসন বদলানো হয়েছে");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "আসন বদলানো যায়নি");
    } finally {
      setPending("");
    }
  }
  function print(kind: "chart" | "summary" | "excluded") {
    document.body.dataset.seatPrint = kind;
    window.requestAnimationFrame(() =>
      window.setTimeout(() => window.print(), 30),
    );
    window.addEventListener(
      "afterprint",
      () => delete document.body.dataset.seatPrint,
      { once: true },
    );
  }
  if (!detail)
    return (
      <main className="content sp-page">
        <p>সিট প্ল্যান লোড হচ্ছে…</p>
      </main>
    );
  const status = String(detail.status);
  const assignmentList = detail.assignments ?? [];
  const roomAssignments = (room: Row) =>
    assignmentList
      .filter((a) => String(a.roomName) === String(room.nameBn))
      .map((a) => {
        const assignment = nested(a.assignment);
        const student = nested(a.student);
        return {
          id: String(assignment.id),
          seatNo: Number(assignment.seatNo),
          benchRow: Number(assignment.benchRow),
          benchColumn: Number(assignment.benchColumn),
          benchSlot: Number(assignment.benchSlot),
          name: String(a.name ?? ""),
          roll: student.roll == null ? null : Number(student.roll),
          groupName: a.groupName == null ? null : String(a.groupName),
        };
      });
  const planRooms = detail.rooms ?? [];
  const previewRoom =
    planRooms.map((r) => nested(r.room)).find((r) => r.id === previewRoomId) ??
    nested(planRooms[0]?.room);
  const statusLabel =
    status === "published" ? "প্রকাশিত" : status === "locked" ? "লক" : "খসড়া";

  return (
    <main className="content sp-page seat-plan-detail">
      <header className="sp-head no-seat-print">
        <div>
          <Link className="sp-back" href="/dashboard/seat-plans">
            ← সিট প্ল্যানে ফিরুন
          </Link>
          <h1>{String(detail.title)}</h1>
          <div className="sp-meta">
            <span>{bnDate(String(detail.sittingDate))}</span>
            <span>{String(detail.shift)}</span>
            <Badge>{statusLabel}</Badge>
          </div>
        </div>
      </header>
      {message && (
        <p className="sp-flash no-seat-print" role="status">
          {message}
        </p>
      )}

      <div className="sp-layout no-seat-print">
        <aside className="sp-rail">
          <nav aria-label="ধাপসমূহ">
            <ol className="sp-steps">
              {steps.map((label, i) => (
                <li
                  key={label}
                  className={`sp-step ${i === step ? "is-current" : i < step ? "is-done" : ""}`}
                >
                  <button
                    type="button"
                    aria-current={i === step ? "step" : undefined}
                    onClick={() => goStep(i)}
                  >
                    <span>
                      {bn(String(i + 1))}. {label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <section className="sp-ledger" aria-label="আসন হিসাব">
            <h2>আসন হিসাব</h2>
            <dl>
              <div>
                <dt>অনুমোদিত</dt>
                <dd>{bnNum(approved.length)} জন</dd>
              </div>
              <div>
                <dt>বাদ</dt>
                <dd>{bnNum(excluded.length)} জন</dd>
              </div>
              <div>
                <dt>নির্বাচিত রুমের আসন</dt>
                <dd>{bnNum(selectedCapacity)}</dd>
              </div>
              <div>
                <dt>বসানো হয়েছে</dt>
                <dd>{bnNum(assignmentList.length)} জন</dd>
              </div>
            </dl>
            {roomIds.length > 0 && (
              <>
                <div
                  className={`sp-gauge ${short ? "is-short" : ""}`}
                  role="img"
                  aria-label={`ধারণক্ষমতার ${bnNum(gaugePercent)} শতাংশ ব্যবহৃত`}
                >
                  <i style={{ width: `${gaugePercent}%` }} />
                </div>
                <p className={`sp-gauge-note ${short ? "is-short" : ""}`}>
                  {short
                    ? `আসন ঘাটতি ${bnNum(approved.length - selectedCapacity)} জন`
                    : `${bnNum(selectedCapacity - approved.length)}টি আসন ফাঁকা থাকবে`}
                </p>
              </>
            )}
          </section>
        </aside>

        <div>
          {step === 0 && (
            <section className="sp-panel">
              <div className="sp-panel-head">
                <h2>পরীক্ষা ও বিষয়</h2>
                <p>এই পরীক্ষার সাথে সংযুক্ত বিষয়সমূহ।</p>
              </div>
              <div className="sp-panel-body">
                <ul className="sp-subjects">
                  {(detail.subjects ?? []).map((s, i) => (
                    <li key={String(s.id ?? i)}>
                      {String(s.subjectNameBn ?? s.nameBn ?? "বিষয়")}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sp-panel-foot">
                <Button onClick={() => goStep(1)}>পরবর্তী</Button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="sp-panel">
              <div className="sp-panel-head">
                <h2>ক্লাস ও গ্রুপ</h2>
                <p>
                  পরীক্ষায় অংশ নেওয়া শাখা/গ্রুপ বেছে নিন। বন্ধনীতে শিক্ষার্থী
                  সংখ্যা দেখানো হয়েছে।
                </p>
              </div>
              <div className="sp-panel-body">
                {sortedClasses.map((academicClass) => {
                  const classSections = academicSections.filter(
                    (section) =>
                      String(section.classId) === String(academicClass.id),
                  );
                  const ids = classSections.map((s) => s.id);
                  const allOn =
                    ids.length > 0 &&
                    ids.every((s) => selectedSections.includes(s));
                  const className = String(academicClass.nameBn ?? "—");
                  return (
                    <div className="sp-class" key={academicClass.id}>
                      <div className="sp-class-head">
                        <b>
                          {className.startsWith("শ্রেণি")
                            ? className
                            : `শ্রেণি ${className}`}
                        </b>
                        {ids.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleClass(ids)}
                          >
                            {allOn ? "সব বাদ দিন" : "সব নিন"}
                          </button>
                        )}
                      </div>
                      <div className="sp-sections">
                        {classSections.map((section) => (
                          <label className="sp-chip" key={section.id}>
                            <input
                              type="checkbox"
                              checked={selectedSections.includes(section.id)}
                              onChange={() => toggleSection(section.id)}
                            />
                            <span>
                              {String(section.nameBn ?? "শাখা")}
                              {section.groupName
                                ? ` — ${section.groupName}`
                                : ""}{" "}
                              ({bnNum(sectionCounts[section.id] ?? 0)} জন)
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="sp-panel-foot">
                <Button
                  disabled={Boolean(pending)}
                  onClick={() => void saveSelection()}
                >
                  {pending === "selection" && <Spinner />} সংরক্ষণ করে পরবর্তী
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="sp-panel">
              <div className="sp-panel-head">
                <h2>যোগ্যতা ও অনুমোদন</h2>
                <p>
                  অনুমোদিত {bnNum(approved.length)} জন · বাদ{" "}
                  {bnNum(excluded.length)} জন
                </p>
              </div>
              <div className="sp-panel-body">
                <div className="sp-toolbar">
                  <span className="sp-seg" role="group" aria-label="সাজানো">
                    <button
                      type="button"
                      aria-pressed={candidateSort === "roll"}
                      onClick={() => changeCandidateSort("roll")}
                    >
                      রোল
                    </button>
                    <button
                      type="button"
                      aria-pressed={candidateSort === "registration"}
                      onClick={() => changeCandidateSort("registration")}
                    >
                      রেজিস্ট্রেশন
                    </button>
                  </span>
                  <Input
                    className="w-full sm:w-56"
                    placeholder="নাম, রোল বা রেজি দিয়ে খুঁজুন"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button
                    disabled={Boolean(pending) || !candidates.length}
                    variant="outline"
                    onClick={() =>
                      setSelected(
                        allSelected
                          ? []
                          : candidates.map((candidate) =>
                              String(nested(candidate.student).id),
                            ),
                      )
                    }
                  >
                    {allSelected ? "সব নির্বাচন বাতিল" : "সব নির্বাচন"}
                  </Button>
                  <Button
                    disabled={Boolean(pending) || !selected.length}
                    variant="outline"
                    onClick={() => void excludeSelected()}
                  >
                    {pending === "exclude" && <Spinner />}
                    নির্বাচিত বাদ
                    {selected.length ? ` (${bnNum(selected.length)})` : ""}
                  </Button>
                </div>
                <div className="sp-toolbar">
                  <Input
                    className="w-full sm:w-72"
                    placeholder="রেজিস্ট্রেশন নম্বর দিয়ে শিক্ষার্থী যোগ করুন"
                    value={registration}
                    onChange={(e) => setRegistration(e.target.value)}
                  />
                  <Button
                    disabled={Boolean(pending) || !registration}
                    onClick={() => void addCandidate()}
                  >
                    {pending === "candidate-add" && <Spinner />} যোগ করুন
                  </Button>
                </div>
                <div className="sp-tablewrap">
                  <table className="finance-table w-full">
                    <thead>
                      <tr>
                        <th className="w-10" />
                        <th>নাম</th>
                        <th className="w-20">রোল</th>
                        <th>রেজি</th>
                        <th>শ্রেণি/শাখা/গ্রুপ</th>
                        <th>অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCandidates.map((c) => {
                        const student = nested(c.student);
                        const candidate = nested(c.candidate);
                        const picked = selected.includes(String(student.id));
                        return (
                          <tr
                            key={candidate.id}
                            className={picked ? "is-picked" : ""}
                          >
                            <td>
                              <input
                                type="checkbox"
                                aria-label={`${String(c.name ?? "")} নির্বাচন`}
                                checked={picked}
                                onChange={() =>
                                  setSelected((x) =>
                                    picked
                                      ? x.filter(
                                          (y) => y !== String(student.id),
                                        )
                                      : [...x, String(student.id)],
                                  )
                                }
                              />
                            </td>
                            <td>{String(c.name ?? "—")}</td>
                            <td>{c.roll == null ? "—" : bn(String(c.roll))}</td>
                            <td>
                              {c.registrationNumber == null
                                ? "—"
                                : bn(String(c.registrationNumber))}
                            </td>
                            <td>
                              {[c.classNameBn, c.sectionNameBn, c.groupName]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                            </td>
                            <td>
                              {candidate.status === "approved" ? (
                                <Badge variant="success">অনুমোদিত</Badge>
                              ) : (
                                <Badge variant="warning">
                                  {reasonLabels[
                                    String(candidate.excludeReason)
                                  ] ?? "বাদ"}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="sp-panel-foot">
                <Button onClick={() => goStep(3)}>পরবর্তী</Button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="sp-panel">
              <div className="sp-panel-head">
                <h2>রুম ও বিন্যাস</h2>
                <p>রুম বেছে নিন, তারপর বসানোর নিয়ম ঠিক করে আসন তৈরি করুন।</p>
              </div>
              <div className="sp-panel-body">
                <div className="sp-rooms">
                  {rooms
                    .filter((r) => Boolean(r.isActive))
                    .map((r) => {
                      const layout =
                        (r.layout as { benches: number }[] | undefined) ?? [];
                      const on = roomIds.includes(r.id);
                      return (
                        <div key={r.id} className="grid gap-2">
                          <button
                            type="button"
                            aria-pressed={on}
                            className={`sp-room ${on ? "on" : ""}`}
                            onClick={() =>
                              setRoomIds((x) =>
                                on ? x.filter((y) => y !== r.id) : [...x, r.id],
                              )
                            }
                          >
                            <b>{String(r.nameBn)}</b>
                            <small>
                              আসন {bnNum(benchTotal(layout) * Number(perBench))}{" "}
                              · বেঞ্চ{" "}
                              {layout
                                .map((row) => bnNum(row.benches))
                                .join("+")}
                            </small>
                          </button>
                          {on && (
                            <Input
                              placeholder="দায়িত্বপ্রাপ্ত শিক্ষক"
                              value={teacherNames[r.id] ?? ""}
                              onChange={(e) =>
                                setTeacherNames((x) => ({
                                  ...x,
                                  [r.id]: e.target.value,
                                }))
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                </div>
                <div className="sp-field-row">
                  <label className="sp-field">
                    প্যাটার্ন
                    <select
                      className={selectClass}
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                    >
                      <option value="roll_mix">রোল মিলিয়ে</option>
                      <option value="class_roll">ক্লাস ধরে রোল</option>
                      <option value="reg_serial">রেজিস্ট্রেশন নম্বর ধরে</option>
                    </select>
                  </label>
                  <label className="sp-field">
                    রুম মোড
                    <select
                      className={selectClass}
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="mixed">মিশ্র</option>
                      <option value="separate_by_group">গ্রুপ আলাদা</option>
                    </select>
                  </label>
                  <label className="sp-field">
                    প্রতি বেঞ্চে
                    <select
                      className={selectClass}
                      value={perBench}
                      onChange={(e) => setPerBench(e.target.value)}
                    >
                      <option value="1">১ জন</option>
                      <option value="2">২ জন</option>
                      <option value="3">৩ জন</option>
                    </select>
                  </label>
                </div>
                {short && (
                  <p className="sp-gauge-note is-short mt-4">
                    {bnNum(approved.length)} জনের জন্য আসন আছে{" "}
                    {bnNum(selectedCapacity)}টি। রুম যোগ করুন বা প্রতি বেঞ্চে
                    শিক্ষার্থী বাড়ান।
                  </p>
                )}
              </div>
              <div className="sp-panel-foot">
                <Button
                  disabled={Boolean(pending) || !roomIds.length}
                  onClick={() => void generate()}
                >
                  {pending === "generate" && <Spinner />} আসন তৈরি করুন
                </Button>
                <Button variant="outline" onClick={() => goStep(4)}>
                  পরবর্তী
                </Button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="sp-panel">
              <div className="sp-panel-head">
                <h2>পর্যালোচনা ও প্রকাশ</h2>
                <p>
                  দুজনের আসন বদলাতে নিচের নকশায় প্রথমে এক বেঞ্চে, তারপর অন্য
                  বেঞ্চে ক্লিক করুন।
                </p>
              </div>
              <div className="sp-panel-body">
                <div className="sp-stats">
                  <div className="sp-stat">
                    <small>অনুমোদিত</small>
                    <strong>{bnNum(approved.length)}</strong>
                  </div>
                  <div className="sp-stat">
                    <small>বসানো হয়েছে</small>
                    <strong>{bnNum(assignmentList.length)}</strong>
                  </div>
                  <div className="sp-stat">
                    <small>রুম</small>
                    <strong>{bnNum(planRooms.length)}</strong>
                  </div>
                </div>
                {planRooms.length > 0 && (
                  <>
                    <div className="sp-room-tabs" role="group" aria-label="রুম">
                      {planRooms.map((r) => {
                        const room = nested(r.room);
                        return (
                          <button
                            type="button"
                            key={String(nested(r.link).id || room.id)}
                            aria-pressed={room.id === previewRoom.id}
                            onClick={() => setPreviewRoomId(room.id)}
                          >
                            {String(room.nameBn ?? "রুম")}
                          </button>
                        );
                      })}
                    </div>
                    <p
                      className={`sp-hint ${selectedAssignmentId ? "is-active" : ""}`}
                    >
                      {selectedAssignmentId
                        ? "একজন নির্বাচিত — এখন দ্বিতীয় শিক্ষার্থীর বেঞ্চে ক্লিক করুন"
                        : "বেঞ্চে ক্লিক করে আসন বদল শুরু করুন"}
                    </p>
                    <div className="sp-graphic">
                      <RoomGraphic
                        onBenchClick={(assignment) =>
                          void selectGraphicSeat(assignment)
                        }
                        layout={
                          (previewRoom.layout as
                            { benches: number }[] | undefined) ?? []
                        }
                        assignments={roomAssignments(previewRoom)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="sp-panel-foot">
                <Button onClick={() => print("chart")}>
                  দরজার চার্ট প্রিন্ট
                </Button>
                <Button variant="outline" onClick={() => print("summary")}>
                  সারাংশ প্রিন্ট
                </Button>
                <Button variant="outline" onClick={() => print("excluded")}>
                  বাদ-পড়া তালিকা
                </Button>
                {status === "draft" && (
                  <Button
                    disabled={Boolean(pending)}
                    variant="outline"
                    onClick={() => void post("lock")}
                  >
                    {pending === "lock" && <Spinner />} লক করুন
                  </Button>
                )}
                {status === "locked" && (
                  <Button
                    disabled={Boolean(pending)}
                    onClick={() => void post("publish")}
                  >
                    {pending === "publish" && <Spinner />} প্রকাশ করুন
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ---- প্রিন্ট শীট (স্ক্রিনে লুকানো, আগের মতোই) ---- */}
      <section className="seat-print-sheet">
        <div className="seat-summary-sheet">
          <h1>{schoolName}</h1>
          <h2>সিট প্ল্যানের সারাংশ</h2>
          <p>
            {String(detail.title)} · {bnDate(String(detail.sittingDate))} ·{" "}
            {String(detail.shift)}
          </p>
          <table>
            <thead>
              <tr>
                <th>রুম</th>
                <th>মোট আসন</th>
                <th>বসানো হয়েছে</th>
                <th>রোল পরিসর</th>
              </tr>
            </thead>
            <tbody>
              {planRooms.map((r) => {
                const room = nested(r.room);
                const link = nested(r.link);
                const assigned = assignmentList.filter(
                  (a) =>
                    String(nested(a.assignment).seatPlanRoomId) ===
                    String(link.id),
                );
                const rolls = assigned
                  .map((a) => Number(nested(a.student).roll))
                  .filter((roll) => Number.isFinite(roll) && roll > 0)
                  .sort((a, b) => a - b);
                const capacity =
                  benchTotal(room.layout) * Number(detail.perBench ?? 1);
                return (
                  <tr key={String(link.id || room.id)}>
                    <td>{String(room.nameBn ?? "—")}</td>
                    <td>{bnNum(capacity)}</td>
                    <td>{bnNum(assigned.length)}</td>
                    <td>
                      {rolls.length
                        ? `${bn(rolls[0]!)}–${bn(rolls[rolls.length - 1]!)}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="seat-summary-total">
                <th>মোট</th>
                <th>
                  {bnNum(
                    planRooms.reduce(
                      (sum, r) =>
                        sum +
                        benchTotal(nested(r.room).layout) *
                          Number(detail.perBench ?? 1),
                      0,
                    ),
                  )}
                </th>
                <th>{bnNum(assignmentList.length)}</th>
                <th>—</th>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="seat-excluded-sheet">
          <h2>বাদ-পড়া শিক্ষার্থীদের তালিকা</h2>
          <p>
            {String(detail.title)} · {bnDate(String(detail.sittingDate))}
          </p>
          <table>
            <thead>
              <tr>
                <th>নাম</th>
                <th>রেজিস্ট্রেশন</th>
                <th>শ্রেণি/শাখা/গ্রুপ</th>
                <th>কারণ</th>
              </tr>
            </thead>
            <tbody>
              {excluded.length ? (
                excluded.map((c) => (
                  <tr key={c.id}>
                    <td>{String(c.name ?? "—")}</td>
                    <td>
                      {c.registrationNumber == null
                        ? "—"
                        : bn(String(c.registrationNumber))}
                    </td>
                    <td>
                      {[c.classNameBn, c.sectionNameBn, c.groupName]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td>
                      {reasonLabels[
                        String(nested(c.candidate).excludeReason)
                      ] ?? "বাদ"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>কেউ বাদ পড়েনি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {planRooms.map((r) => {
          const room = nested(r.room);
          const link = nested(r.link);
          const list = assignmentList.filter(
            (a) => String(a.roomName) === String(room.nameBn),
          );
          const printByRegistration = String(detail.pattern) === "reg_serial";
          const roomLayout =
            (room.layout as { benches: number }[] | undefined) ?? [];
          const benchRows = roomLayout.flatMap((row, rowIndex) =>
            Array.from({ length: row.benches }, (_, benchIndex) => ({
              row: rowIndex + 1,
              bench: benchIndex + 1,
            })),
          );
          const numberFor = (item: Row) => {
            const assignment = nested(item.assignment);
            const student = nested(item.student);
            const value = printByRegistration
              ? item.registrationNumber
              : student.roll;
            return value == null ? "—" : bn(String(value));
          };
          return (
            <article
              className="seat-chart-room"
              key={String(link.id || room.id)}
            >
              <h1>{schoolName}</h1>
              <h2>আসন বিন্যাস — {String(room.nameBn ?? "রুম")}</h2>
              <p className="seat-print-date">
                {bnDate(String(detail.sittingDate))} ·{" "}
                {
                  WEEKDAYS_BN[
                    new Date(`${String(detail.sittingDate)}T00:00:00`).getDay()
                  ]
                }{" "}
                · {String(detail.title)}
              </p>
              <p>
                {[room.building, room.floor].filter(Boolean).join(" / ") || ""}{" "}
                ·{" "}
                {(detail.subjects ?? [])
                  .map((subject) => String(subject.subjectNameBn ?? "বিষয়"))
                  .join(" / ")}
              </p>
              <p>
                চার্টের ভিত্তি:{" "}
                {printByRegistration ? "রেজিস্ট্রেশন নম্বর" : "রোল"}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>সারি</th>
                    <th>বেঞ্চ</th>
                    <th>বাম</th>
                    <th>মাঝ</th>
                    <th>ডান</th>
                  </tr>
                </thead>
                <tbody>
                  {benchRows.map((bench) => {
                    const seats = list.filter((item) => {
                      const assignment = nested(item.assignment);
                      return (
                        Number(assignment.benchRow) === bench.row &&
                        Number(assignment.benchColumn) === bench.bench
                      );
                    });
                    const numberAt = (
                      position: "left" | "middle" | "right",
                    ) => {
                      const item = seats.find((candidate) => {
                        const assignment = nested(candidate.assignment);
                        const actual = assignment.benchPosition ?? "left";
                        return actual === position;
                      });
                      return item ? numberFor(item) : "—";
                    };
                    return (
                      <tr key={`${bench.row}-${bench.bench}`}>
                        <td>{bn(String(bench.row))}</td>
                        <td>{bn(String(bench.bench))}</td>
                        <td>{numberAt("left")}</td>
                        <td>{numberAt("middle")}</td>
                        <td>{numberAt("right")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p>
                দায়িত্বপ্রাপ্ত শিক্ষকের নাম:{" "}
                {String(link.roomTeacherName || "____________________________")}
                <span className="seat-signature-line">
                  স্বাক্ষর: ____________________
                </span>
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
