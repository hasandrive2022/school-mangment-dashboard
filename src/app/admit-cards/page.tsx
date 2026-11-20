/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Printer,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminSWR } from "@/lib/swr";
import { bn, bnDate } from "@/lib/format";
import { apiPatch, apiPost } from "@/lib/admin-api";
import { printElement } from "@/lib/print";
import { UploadThingField } from "@/components/uploadthing-field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  AdmitCard,
  AdmitData,
  AdmitLayout,
  AdmitStudent,
} from "@/components/admit-card";

type ExamOption = {
  id: string;
  nameBn: string;
  classId?: string;
  sessionId?: string;
  classNameBn?: string;
};
type SetupOption = {
  id: string;
  nameBn?: string;
  name?: string;
  year?: number;
};
type SetupSubject = {
  id: string;
  subjectId: string;
  subjectNameBn?: string;
  fullMarks?: number;
  passMarks?: number;
  examDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

const DEFAULT_INSTRUCTIONS =
  "পরীক্ষার্থীকে অবশ্যই প্রবেশপত্র সঙ্গে আনতে হবে। পরীক্ষা শুরুর ৩০ মিনিট আগে কেন্দ্রে উপস্থিত হতে হবে। মোবাইল ফোন, স্মার্টওয়াচ বা যেকোনো ইলেকট্রনিক ডিভাইস পরীক্ষার হলে আনা সম্পূর্ণ নিষিদ্ধ।";

const LAYOUTS: Array<{ value: AdmitLayout; label: string; cells: number }> = [
  { value: "1", label: "১টি", cells: 1 },
  { value: "2", label: "২টি", cells: 2 },
  { value: "4", label: "৪টি", cells: 4 },
];

type CheckState = "ok" | "warn" | "idle";

const PAGE_WIDTH = 794; // A4 at 96dpi

/* ---------- ছোট UI অংশ (সব Tailwind) ---------- */

const fieldLabel = "text-[13px] font-semibold text-foreground";
const fieldHint = "text-xs text-muted-foreground";
const controlClass = "h-11 w-full rounded-lg text-sm";

function Panel({
  id,
  className = "",
  title,
  children,
}: {
  id?: string;
  className?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-4 rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,49,81,0.05)] ${className}`}
    >
      <h2 className="mb-3 text-[15px] font-bold text-primary-800">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Fold({
  id,
  className = "",
  title,
  children,
}: {
  id?: string;
  className?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open
      className={`group rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,49,81,0.05)] ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-[15px] font-bold text-primary-800 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid gap-2 border-t border-border p-4">{children}</div>
    </details>
  );
}

/** A4 পাতা আসল মাপে এঁকে স্ক্রিনের প্রস্থে ছোট করে দেখায়। */
function PageScaler({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, offset: 0, height: 0 });

  useEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;
    const update = () => {
      const scale = Math.min(1, outerEl.clientWidth / PAGE_WIDTH);
      setView({
        scale,
        offset: Math.max(0, (outerEl.clientWidth - PAGE_WIDTH * scale) / 2),
        height: innerEl.offsetHeight * scale,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(outerEl);
    observer.observe(innerEl);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      className="ac-scaler"
      style={{ height: view.height || undefined }}
    >
      <div
        ref={inner}
        className="ac-scaler-inner"
        style={{
          width: PAGE_WIDTH,
          transform: `translateX(${view.offset}px) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function LayoutGlyph({ cells }: { cells: number }) {
  const grid =
    cells === 1
      ? "grid-cols-1 grid-rows-1"
      : cells === 2
        ? "grid-cols-1 grid-rows-2"
        : "grid-cols-2 grid-rows-2";
  return (
    <span
      aria-hidden="true"
      className={`grid h-[34px] w-[26px] gap-0.5 rounded-[3px] border-[1.5px] border-current p-0.5 ${grid}`}
    >
      {Array.from({ length: cells }).map((_, index) => (
        <i key={index} className="rounded-[1px] bg-current opacity-35" />
      ))}
    </span>
  );
}

function AdmitCardsInner() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [examId, setExamId] = useState(searchParams.get("examId") ?? "");
  const [wizardStep, setWizardStep] = useState(
    searchParams.get("examId") ? 2 : 1,
  );
  const [printing, setPrinting] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");
  const [perPage, setPerPage] = useState<AdmitLayout>("1");
  const [showStub, setShowStub] = useState(true);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [headteacherSignatureUrl, setHeadteacherSignatureUrl] = useState("");
  const [preparedByTeacherId, setPreparedByTeacherId] = useState("");
  const [preparedBySignatureUrl, setPreparedBySignatureUrl] = useState("");
  const [signaturesSaved, setSignaturesSaved] = useState(false);
  const [savingSignatures, setSavingSignatures] = useState(false);
  const [setupForm, setSetupForm] = useState({
    nameBn: "",
    classId: "",
    sessionId: "",
  });
  const [setupSubject, setSetupSubject] = useState({
    subjectId: "",
    fullMarks: "100",
    passMarks: "33",
    examDate: "",
    startsAt: "",
    endsAt: "",
  });
  const [routineDrafts, setRoutineDrafts] = useState<
    Record<
      string,
      {
        fullMarks: string;
        passMarks: string;
        examDate: string;
        startsAt: string;
        endsAt: string;
      }
    >
  >({});
  const [routineDirty, setRoutineDirty] = useState(false);
  const [setupSaving, setSetupSaving] = useState("");

  const {
    data: examsPayload,
    error: examsError,
    mutate: refreshExams,
  } = useAdminSWR<{ data: ExamOption[] }>("/api/backend/results/admit-exams");
  const exams = examsPayload?.data ?? [];
  const examLoadError = examsError
    ? examsError instanceof Error
      ? examsError.message
      : "পরীক্ষার তালিকা লোড করা যায়নি"
    : "";

  useEffect(() => {
    const selectedExam = exams.find((exam) => exam.id === examId);
    if (!selectedExam) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetupForm((current) => ({
      ...current,
      nameBn: selectedExam.nameBn,
      classId: selectedExam.classId ?? current.classId,
      sessionId: selectedExam.sessionId ?? current.sessionId,
    }));
  }, [examId, exams]);
  const { data: classPayload } = useAdminSWR<{ data?: SetupOption[] }>(
    "/api/backend/academics/classes",
  );
  const { data: sessionPayload } = useAdminSWR<{ data?: SetupOption[] }>(
    "/api/backend/academics/sessions",
  );
  const { data: subjectPayload } = useAdminSWR<{ data?: SetupOption[] }>(
    "/api/backend/academics/subjects",
  );
  const { data: setupSubjectsPayload, mutate: refreshSetupSubjects } =
    useAdminSWR<{ data?: SetupSubject[] }>(
      examId
        ? `/api/backend/results/exam-subjects?examId=${encodeURIComponent(examId)}`
        : null,
    );
  const setupClasses = classPayload?.data ?? [];
  const setupSessions = sessionPayload?.data ?? [];
  const setupSubjects = subjectPayload?.data ?? [];
  const setupExamSubjects = setupSubjectsPayload?.data ?? [];
  useEffect(() => {
    if (!setupExamSubjects.length) return;
    // Existing routine rows remain selected and become editable in this step.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutineDrafts(
      Object.fromEntries(
        setupExamSubjects.map((subject) => [
          subject.id,
          {
            fullMarks: String(subject.fullMarks ?? 100),
            passMarks: String(subject.passMarks ?? 33),
            examDate: subject.examDate ?? "",
            startsAt: subject.startsAt ?? "",
            endsAt: subject.endsAt ?? "",
          },
        ]),
      ),
    );
    setRoutineDirty(false);
  }, [setupExamSubjects]);
  const { data: teachersPayload } = useAdminSWR<{
    data?: Array<{ id: string; nameBn?: string; displayNameBn?: string }>;
  }>("/api/backend/people/teachers");
  const admitKey = examId
    ? `/api/backend/results/exams/${encodeURIComponent(examId)}/admit-data`
    : null;
  const {
    data: admitPayload,
    error: admitError,
    isLoading,
  } = useAdminSWR<{ data: AdmitData }>(admitKey);
  const data = admitPayload?.data ?? null;
  const teachers = teachersPayload?.data ?? [];
  const loading = Boolean(examId) && isLoading;
  const loadError = admitError
    ? admitError instanceof Error
      ? admitError.message
      : "ডেটা লোড করা যায়নি"
    : "";

  const sectionOptions = useMemo(() => {
    const sections = new Map<string, string>();
    for (const student of data?.students ?? []) {
      if (student.sectionId) {
        sections.set(student.sectionId, student.sectionNameBn ?? "শাখা");
      }
    }
    return [...sections.entries()];
  }, [data]);

  const students: AdmitStudent[] = useMemo(
    () =>
      (data?.students ?? []).filter(
        (student) => !sectionFilter || student.sectionId === sectionFilter,
      ),
    [data, sectionFilter],
  );

  const pageSize = Number(perPage);
  const cardPages = useMemo(() => {
    const pages: AdmitStudent[][] = [];
    for (let index = 0; index < students.length; index += pageSize) {
      pages.push(students.slice(index, index + pageSize));
    }
    return pages;
  }, [pageSize, students]);

  useEffect(() => {
    if (!data) return;
    // Hydrate editable signature fields when the selected exam data arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadteacherSignatureUrl(data.exam.headteacherSignatureUrl ?? "");
    setPreparedBySignatureUrl(data.exam.preparedBySignatureUrl ?? "");
    setPreparedByTeacherId(data.exam.preparedByTeacherId ?? "");
    setSignaturesSaved(
      Boolean(
        data.exam.headteacherSignatureUrl &&
        data.exam.preparedByTeacherId &&
        data.exam.preparedBySignatureUrl,
      ),
    );
  }, [data]);

  async function saveSignatures() {
    if (!examId || savingSignatures) return;
    setSavingSignatures(true);
    try {
      await apiPatch(
        `/api/backend/results/exams/${encodeURIComponent(examId)}`,
        {
          value: {
            headteacherSignatureUrl: headteacherSignatureUrl || null,
            preparedByTeacherId: preparedByTeacherId || null,
            preparedBySignatureUrl: preparedBySignatureUrl || null,
          },
        },
      );
      setSignaturesSaved(true);
      toast.success("দুইটি স্বাক্ষর সংরক্ষণ হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "স্বাক্ষর সংরক্ষণ করা যায়নি",
      );
    } finally {
      setSavingSignatures(false);
    }
  }

  async function createExamFromAdmit() {
    if (
      !setupForm.nameBn ||
      !setupForm.classId ||
      !setupForm.sessionId ||
      setupSaving
    ) {
      toast.error("পরীক্ষার নাম, শ্রেণি ও সেশন নির্বাচন করুন");
      return;
    }
    setSetupSaving("exam");
    try {
      const payload = await apiPost<{ data?: { id?: string } }>(
        "/api/backend/results/exams",
        { value: { ...setupForm, examType: "other", failAnySubject: true } },
        "পরীক্ষা তৈরি করা যায়নি",
      );
      await refreshExams();
      const createdId = payload.data?.id;
      if (createdId) setExamId(createdId);
      setSetupForm({ nameBn: "", classId: "", sessionId: "" });
      toast.success("পরীক্ষা তৈরি হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "পরীক্ষা তৈরি করা যায়নি",
      );
    } finally {
      setSetupSaving("");
    }
  }

  async function addSubjectRoutine() {
    if (
      !examId ||
      !setupSubject.subjectId ||
      !setupSubject.examDate ||
      !setupSubject.startsAt ||
      !setupSubject.endsAt ||
      setupSaving
    ) {
      toast.error("বিষয়, তারিখ, শুরু ও শেষ সময় পূরণ করুন");
      return;
    }
    setSetupSaving("subject");
    try {
      await apiPost(
        "/api/backend/results/exam-subjects",
        {
          examId,
          subjectId: setupSubject.subjectId,
          fullMarks: Number(setupSubject.fullMarks),
          passMarks: Number(setupSubject.passMarks),
          examDate: setupSubject.examDate,
          startsAt: setupSubject.startsAt,
          endsAt: setupSubject.endsAt,
        },
        "বিষয় ও রুটিন সংরক্ষণ করা যায়নি",
      );
      await refreshSetupSubjects();
      setSetupSubject({
        subjectId: "",
        fullMarks: "100",
        passMarks: "33",
        examDate: "",
        startsAt: "",
        endsAt: "",
      });
      toast.success("বিষয় ও রুটিন সংরক্ষণ হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "বিষয় ও রুটিন সংরক্ষণ করা যায়নি",
      );
    } finally {
      setSetupSaving("");
    }
  }

  async function saveAllRoutines() {
    if (!examId || !setupExamSubjects.length || setupSaving) return;
    const drafts = setupExamSubjects.map((subject) => ({
      subject,
      draft: routineDrafts[subject.id],
    }));
    if (
      drafts.some(
        ({ draft }) => !draft?.examDate || !draft.startsAt || !draft.endsAt,
      )
    ) {
      toast.error("প্রতিটি বিষয়ের তারিখ, শুরু ও শেষ সময় পূরণ করুন");
      return;
    }
    setSetupSaving("routines");
    try {
      for (const { subject, draft } of drafts) {
        if (!draft) continue;
        await apiPost(
          "/api/backend/results/exam-subjects",
          {
            examId,
            subjectId: subject.subjectId,
            fullMarks: Number(draft.fullMarks),
            passMarks: Number(draft.passMarks),
            examDate: draft.examDate,
            startsAt: draft.startsAt,
            endsAt: draft.endsAt,
          },
          "রুটিন সংরক্ষণ করা যায়নি",
        );
      }
      await refreshSetupSubjects();
      setRoutineDirty(false);
      toast.success("সব বিষয়ের routine সংরক্ষণ হয়েছে");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "রুটিন সংরক্ষণ করা যায়নি",
      );
    } finally {
      setSetupSaving("");
    }
  }

  async function handlePrint() {
    if (!students.length || printing) return;
    setPrinting(true);
    try {
      await printElement(".admit-sheet", "printing-admit");
    } catch {
      toast.error("প্রিন্ট ডায়ালগ খোলা যায়নি");
    } finally {
      setPrinting(false);
    }
  }

  const period =
    data?.exam.startsAt || data?.exam.endsAt
      ? `${data.exam.startsAt ? bnDate(data.exam.startsAt) : ""}${data.exam.endsAt ? ` — ${bnDate(data.exam.endsAt)}` : ""}`
      : "";

  // স্ক্রিনে যে স্বাক্ষর আছে কার্ডে তা-ই দেখায়, সংরক্ষণের আগেই।
  const preparedByName =
    teachers.find((teacher) => teacher.id === preparedByTeacherId)?.nameBn ??
    teachers.find((teacher) => teacher.id === preparedByTeacherId)
      ?.displayNameBn ??
    data?.exam.preparedByTeacherNameBn ??
    null;

  // প্রিন্টের আগের যাচাই: যা না থাকলে কাগজে ফাঁকা ছাপা হবে।
  const subjectCount = data?.subjects?.length ?? 0;
  const routineComplete =
    setupExamSubjects.length > 0 &&
    !routineDirty &&
    setupExamSubjects.every((subject) => {
      const draft = routineDrafts[subject.id];
      return Boolean(draft?.examDate && draft.startsAt && draft.endsAt);
    });
  const noPhoto = students.filter((student) => !student.photoUrl).length;
  const missingSignatures = [
    !headteacherSignatureUrl ? "প্রধান শিক্ষকের" : "",
    !preparedBySignatureUrl ? "প্রস্তুতকারী শিক্ষকের" : "",
  ].filter(Boolean);
  const signaturesComplete = Boolean(
    headteacherSignatureUrl && preparedByTeacherId && preparedBySignatureUrl,
  );

  const checks: Array<{
    key: string;
    state: CheckState;
    title: React.ReactNode;
    hint?: React.ReactNode;
  }> = !data
    ? [
        {
          key: "idle",
          state: "idle",
          title: "পরীক্ষা বেছে নিলে এখানে প্রিন্টের আগের যাচাই দেখা যাবে",
        },
      ]
    : [
        subjectCount
          ? {
              key: "routine",
              state: "ok",
              title: `${bn(subjectCount)}টি বিষয়ের রুটিন আছে`,
            }
          : {
              key: "routine",
              state: "warn",
              title: "পরীক্ষার রুটিন নেই",
              hint: (
                <Link
                  className="text-primary underline underline-offset-2"
                  href="#admit-routine"
                >
                  রুটিন যোগ করুন
                </Link>
              ),
            },
        missingSignatures.length
          ? {
              key: "sign",
              state: "warn",
              title: `${missingSignatures.join(" ও ")} স্বাক্ষর নেই`,
              hint: (
                <a
                  className="text-primary underline underline-offset-2"
                  href="#admit-signatures"
                >
                  স্বাক্ষর যোগ করুন
                </a>
              ),
            }
          : { key: "sign", state: "ok", title: "দুইটি স্বাক্ষরই আছে" },
        noPhoto
          ? {
              key: "photo",
              state: "warn",
              title: `${bn(noPhoto)} জনের ছবি নেই`,
              hint: "ফাঁকা ঘর ছাপা হবে, হাতে ছবি লাগানো যাবে",
            }
          : { key: "photo", state: "ok", title: "সবার ছবি আছে" },
      ];

  const admitSteps = [
    {
      label: "পরীক্ষা ও ক্লাস",
      done: Boolean(examId),
      href: "#admit-exam-setup",
    },
    {
      label: "রুটিন",
      done: routineComplete,
      href: "#admit-routine",
    },
    {
      label: "প্রধান শিক্ষকের স্বাক্ষর",
      done: signaturesComplete && signaturesSaved,
      href: "#admit-signatures",
    },
    {
      label: "প্রিভিউ ও প্রিন্ট",
      done: Boolean(data && students.length),
      href: "#admit-preview",
    },
  ];
  const activeAdmitStep = admitSteps.findIndex((step) => !step.done);
  const visibleAdmitSteps = admitSteps.slice(0, wizardStep);
  const showPreview = Boolean(
    wizardStep === 4 &&
    data &&
    routineComplete &&
    signaturesComplete &&
    signaturesSaved,
  );
  const currentAdmitStep = admitSteps[wizardStep - 1] ?? admitSteps[0];

  return (
    <main className="mx-auto w-full max-w-[1280px] px-3 pb-12 pt-4 sm:px-5 sm:pt-6">
      {/* শিরোনাম */}
      <header className="no-print mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-5">
        <div>
          <h1 className="text-[clamp(24px,2.6vw,30px)] font-bold leading-snug text-primary-800">
            পরীক্ষার প্রবেশপত্র
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            এই একই পেজে ধাপ ১ থেকে ৫ শেষ করুন: পরীক্ষা তৈরি/বাছাই, বিষয় ও
            রুটিন, স্বাক্ষর, প্রিভিউ এবং শেষে প্রিন্ট। Results ও Seat Plan আলাদা
            workflow—এখানে সেগুলো করতে হবে না।
          </p>
          <p className="mt-3 inline-flex rounded-full border border-primary/20 bg-secondary px-3 py-1.5 text-sm font-semibold text-primary-800">
            বর্তমান ধাপ: {currentAdmitStep.label}
          </p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-secondary px-3 py-2 text-[13px] text-primary-800">
          শুরু করুন নিচের <b>ধাপ ১</b> থেকে। সব ধাপ একই পেজে আছে।
        </div>
      </header>

      {/* ধাপ — এটি সত্যিই একটি ক্রম, তাই নম্বর আছে */}
      <ol
        className="no-print mb-6 flex flex-wrap items-center gap-x-1 gap-y-2"
        aria-label="প্রবেশপত্র তৈরির ধাপ"
      >
        {visibleAdmitSteps.map((step, index) => {
          const current = index === activeAdmitStep;
          return (
            <li key={step.label} className="flex items-center gap-1">
              <a
                href={step.href}
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition-colors ${
                  step.done
                    ? "border-accent/40 bg-accent/5 text-accent"
                    : current
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-accent text-accent-foreground"
                      : current
                        ? "bg-white/20"
                        : "bg-muted"
                  }`}
                >
                  {step.done ? "✓" : bn(index + 1)}
                </span>
                {step.label}
              </a>
              {index < visibleAdmitSteps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="mx-1 hidden h-px w-5 bg-border sm:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div
        className={`grid items-start gap-6 ${showPreview ? "lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]" : "grid-cols-1"}`}
      >
        {/* বাঁ পাশ: নিয়ন্ত্রণ */}
        <div
          className={`no-print grid gap-3.5 ${showPreview ? "lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] lg:overflow-y-auto lg:pr-0.5" : "mx-auto w-full max-w-3xl"}`}
        >
          {wizardStep === 4 &&
          data &&
          routineComplete &&
          signaturesComplete &&
          signaturesSaved ? (
            <Panel
              id="admit-print-setup"
              className="order-3"
              title="ধাপ ৪: প্রিভিউ ও প্রিন্ট সেটআপ"
            >
              <div className="grid gap-1.5">
                <label htmlFor="admit-section" className={fieldLabel}>
                  শাখা
                </label>
                <Select
                  id="admit-section"
                  className={controlClass}
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  disabled={!sectionOptions.length}
                >
                  <option value="">সব শাখা</option>
                  {sectionOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-1.5">
                <span className={fieldLabel} id="ac-per-page">
                  প্রতি পাতায় কার্ড
                </span>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-labelledby="ac-per-page"
                >
                  {LAYOUTS.map((layout) => {
                    const on = perPage === layout.value;
                    return (
                      <button
                        key={layout.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setPerPage(layout.value)}
                        className={`grid justify-items-center gap-1.5 rounded-lg border px-1.5 pb-2 pt-2.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          on
                            ? "border-primary bg-secondary font-semibold text-primary-800 shadow-[inset_0_0_0_1px_var(--primary)]"
                            : "border-border bg-card text-muted-foreground hover:border-primary"
                        }`}
                      >
                        <LayoutGlyph cells={layout.cells} />
                        {layout.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label
                className={`flex items-start gap-2.5 text-[13.5px] leading-snug ${
                  perPage !== "1"
                    ? "cursor-not-allowed opacity-55"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary"
                  checked={showStub && perPage === "1"}
                  disabled={perPage !== "1"}
                  onChange={(event) => setShowStub(event.target.checked)}
                />
                <span>
                  কক্ষ পরিদর্শকের কপি যোগ করুন
                  <small className={`mt-0.5 block ${fieldHint}`}>
                    {perPage === "1"
                      ? "কার্ডের নিচে কেটে নেওয়ার অংশ, প্রতি বিষয়ে উপস্থিতির ঘরসহ"
                      : "পাতায় ১টি কার্ড বেছে নিলে পাওয়া যাবে"}
                  </small>
                </span>
              </label>

              <div className="grid gap-1.5">
                <label htmlFor="admit-instructions" className={fieldLabel}>
                  পরীক্ষার্থীর নির্দেশনা
                </label>
                <RichTextEditor
                  value={instructions}
                  onChange={setInstructions}
                  placeholder="পরীক্ষার্থীর নির্দেশনা লিখুন…"
                />
                <small className={fieldHint}>
                  এই লেখা প্রতিটি কার্ডে ছাপা হবে।
                </small>
              </div>
            </Panel>
          ) : null}

          {wizardStep === 3 && data ? (
            <Panel
              id="admit-signatures"
              className="order-4"
              title="ধাপ ৩: স্বাক্ষর"
            >
              <div className="grid gap-1.5">
                <span className={fieldLabel}>প্রধান শিক্ষকের স্বাক্ষর</span>
                <UploadThingField
                  endpoint="signatureImage"
                  value={headteacherSignatureUrl}
                  onChange={(value) => {
                    setSignaturesSaved(false);
                    setHeadteacherSignatureUrl(value);
                  }}
                  label="স্বাক্ষর আপলোড করুন"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="prepared-by-teacher" className={fieldLabel}>
                  প্রস্তুতকারী শিক্ষক
                </label>
                <Select
                  id="prepared-by-teacher"
                  className={controlClass}
                  value={preparedByTeacherId}
                  onChange={(event) => {
                    setSignaturesSaved(false);
                    setPreparedByTeacherId(event.target.value);
                  }}
                >
                  <option value="">শিক্ষক বেছে নিন</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nameBn ?? teacher.displayNameBn ?? "শিক্ষক"}
                    </option>
                  ))}
                </Select>
                <UploadThingField
                  endpoint="signatureImage"
                  value={preparedBySignatureUrl}
                  onChange={(value) => {
                    setSignaturesSaved(false);
                    setPreparedBySignatureUrl(value);
                  }}
                  label="প্রস্তুতকারীর স্বাক্ষর আপলোড করুন"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={savingSignatures || !preparedByTeacherId}
                onClick={() => void saveSignatures()}
              >
                {savingSignatures ? "সংরক্ষণ হচ্ছে…" : "স্বাক্ষর সংরক্ষণ করুন"}
              </Button>
              <Button
                type="button"
                disabled={
                  !signaturesComplete || !signaturesSaved || savingSignatures
                }
                onClick={() => setWizardStep(4)}
              >
                পরের ধাপ: প্রিভিউ ও প্রিন্ট
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWizardStep(2)}
              >
                পেছনে: বিষয় ও routine
              </Button>
            </Panel>
          ) : null}

          {wizardStep === 4 && data && signaturesComplete && signaturesSaved ? (
            <>
              <Panel className="order-5" title="প্রিন্টের আগে দেখে নিন">
                <ul className="m-0 grid list-none gap-3 p-0">
                  {checks.map((check) => (
                    <li
                      key={check.key}
                      className="grid grid-cols-[18px_1fr] gap-2.5 text-[13.5px] leading-snug"
                    >
                      {check.state === "ok" ? (
                        <CheckCircle2
                          className="mt-px size-[18px] text-accent"
                          aria-hidden="true"
                        />
                      ) : check.state === "warn" ? (
                        <AlertTriangle
                          className="mt-px size-[18px] text-warning-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="mt-px size-[18px] text-muted-foreground/60"
                          aria-hidden="true"
                        />
                      )}
                      <span>
                        {check.title}
                        {check.hint ? (
                          <small className={`block ${fieldHint}`}>
                            {check.hint}
                          </small>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* প্রিন্ট বার */}
              <section
                className="order-6 grid gap-3 rounded-xl border border-primary-800/20 bg-secondary p-4"
                aria-live="polite"
              >
                <h2 className="m-0 text-[15px] font-bold text-primary-800">
                  ধাপ ৫: প্রবেশপত্র প্রিন্ট / PDF
                </h2>
                <div className="flex items-baseline gap-2">
                  <strong className="text-3xl font-bold leading-none tabular-nums text-primary-800">
                    {bn(students.length)}
                  </strong>
                  <span className="text-[13.5px] text-muted-foreground">
                    {loading
                      ? "তথ্য আনা হচ্ছে…"
                      : data
                        ? `জন শিক্ষার্থী, ${bn(cardPages.length)}টি A4 পাতা`
                        : "জন শিক্ষার্থী"}
                  </span>
                </div>
                <Button
                  type="button"
                  className="min-h-11 w-full justify-center gap-2 rounded-lg text-sm font-semibold"
                  disabled={!students.length || loading || printing}
                  onClick={() => void handlePrint()}
                  aria-label={`প্রিন্ট বা PDF করুন, ${bn(students.length)}টি প্রবেশপত্র`}
                >
                  <Printer className="size-[17px]" aria-hidden="true" />
                  {printing ? "প্রিন্ট প্রস্তুত হচ্ছে…" : "প্রিন্ট / PDF করুন"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => setWizardStep(3)}
                >
                  পেছনে: স্বাক্ষর
                </Button>
                <p className="m-0 text-center text-xs text-muted-foreground">
                  PDF চাইলে প্রিন্ট ডায়ালগে “Save as PDF” বেছে নিন
                </p>
              </section>
            </>
          ) : null}

          {/* নতুন পরীক্ষা / রুটিন — কম লাগে, তাই ভাঁজ করা */}
          {wizardStep === 1 ? (
            <Fold
              id="admit-exam-setup"
              className="order-1"
              title="ধাপ ১: পরীক্ষা, শ্রেণি ও সেশন"
            >
              <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                আগে একটি পরীক্ষা বেছে নিন। নতুন পরীক্ষা না থাকলে এখানে নাম,
                শ্রেণি ও সেশন দিয়ে তৈরি করুন। তৈরি হলে সেটি উপরের পরীক্ষার
                তালিকায় নিজে থেকেই নির্বাচিত হবে।
              </p>
              {examLoadError ? (
                <p className="m-0 rounded-lg border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {examLoadError}
                </p>
              ) : null}
              <div className="grid gap-1.5">
                <label htmlFor="admit-exam" className={fieldLabel}>
                  তৈরি করা পরীক্ষা বেছে নিন
                </label>
                <Select
                  id="admit-exam"
                  className={controlClass}
                  value={examId}
                  onChange={(event) => {
                    setExamId(event.target.value);
                    setSectionFilter("");
                  }}
                >
                  <option value="">পরীক্ষা বেছে নিন</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.nameBn}
                      {exam.classNameBn ? ` — শ্রেণি ${exam.classNameBn}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                placeholder="পরীক্ষার নাম"
                value={setupForm.nameBn}
                onChange={(event) =>
                  setSetupForm({ ...setupForm, nameBn: event.target.value })
                }
              />
              <Select
                className={controlClass}
                value={setupForm.classId}
                onChange={(event) =>
                  setSetupForm({ ...setupForm, classId: event.target.value })
                }
              >
                <option value="">শ্রেণি নির্বাচন করুন</option>
                {setupClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameBn ?? item.name ?? "শ্রেণি"}
                  </option>
                ))}
              </Select>
              <Select
                className={controlClass}
                value={setupForm.sessionId}
                onChange={(event) =>
                  setSetupForm({ ...setupForm, sessionId: event.target.value })
                }
              >
                <option value="">সেশন নির্বাচন করুন</option>
                {setupSessions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameBn ?? item.name ?? item.year ?? "সেশন"}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                disabled={Boolean(setupSaving)}
                onClick={() => void createExamFromAdmit()}
              >
                {setupSaving === "exam" ? "তৈরি হচ্ছে…" : "পরীক্ষা তৈরি করুন"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!examId}
                onClick={() => setWizardStep(2)}
              >
                পরের ধাপ: বিষয় ও routine
              </Button>
            </Fold>
          ) : null}

          {wizardStep === 2 && examId ? (
            <Fold
              id="admit-routine"
              className="order-2"
              title="ধাপ ২: বিষয় ও রুটিন"
            >
              <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                নির্বাচিত পরীক্ষার প্রতিটি বিষয়ের তারিখ, পূর্ণ/পাস নম্বর এবং
                শুরু ও শেষ সময় যোগ করুন। সব বিষয় সম্পূর্ণ না হলে
                প্রিভিউ/প্রিন্ট হবে না।
              </p>
              {loadError ? (
                <p className="m-0 rounded-lg border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {loadError}
                </p>
              ) : null}
              {setupExamSubjects.length ? (
                <div className="grid gap-2 rounded-lg border border-accent/25 bg-accent/5 p-3">
                  <p className="m-0 text-sm font-semibold text-primary-800">
                    এই পরীক্ষার বিষয় ও routine
                  </p>
                  <div className="grid gap-3">
                    {setupExamSubjects.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-md border border-border bg-card p-3"
                      >
                        <b className="font-semibold text-primary-800">
                          {item.subjectNameBn ?? "বিষয়"}
                        </b>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <Input
                            type="date"
                            value={routineDrafts[item.id]?.examDate ?? ""}
                            onChange={(event) => {
                              setRoutineDirty(true);
                              setRoutineDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  examDate: event.target.value,
                                },
                              }));
                            }}
                            aria-label={`${item.subjectNameBn ?? "বিষয়"} পরীক্ষার তারিখ`}
                          />
                          <Input
                            type="time"
                            value={routineDrafts[item.id]?.startsAt ?? ""}
                            onChange={(event) => {
                              setRoutineDirty(true);
                              setRoutineDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  startsAt: event.target.value,
                                },
                              }));
                            }}
                            aria-label={`${item.subjectNameBn ?? "বিষয়"} শুরুর সময়`}
                          />
                          <Input
                            type="time"
                            value={routineDrafts[item.id]?.endsAt ?? ""}
                            onChange={(event) => {
                              setRoutineDirty(true);
                              setRoutineDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  endsAt: event.target.value,
                                },
                              }));
                            }}
                            aria-label={`${item.subjectNameBn ?? "বিষয়"} শেষের সময়`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={routineDrafts[item.id]?.fullMarks ?? "100"}
                              onChange={(event) => {
                                setRoutineDirty(true);
                                setRoutineDrafts((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...current[item.id],
                                    fullMarks: event.target.value,
                                  },
                                }));
                              }}
                              aria-label={`${item.subjectNameBn ?? "বিষয়"} পূর্ণ নম্বর`}
                            />
                            <Input
                              type="number"
                              min="0"
                              value={routineDrafts[item.id]?.passMarks ?? "33"}
                              onChange={(event) => {
                                setRoutineDirty(true);
                                setRoutineDrafts((current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...current[item.id],
                                    passMarks: event.target.value,
                                  },
                                }));
                              }}
                              aria-label={`${item.subjectNameBn ?? "বিষয়"} পাস নম্বর`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    disabled={setupSaving !== ""}
                    onClick={() => void saveAllRoutines()}
                  >
                    {setupSaving === "routines"
                      ? "সব routine সংরক্ষণ হচ্ছে…"
                      : "সব routine সংরক্ষণ করুন"}
                  </Button>
                </div>
              ) : (
                <p className="m-0 rounded-lg border border-warning-600/30 bg-warning-600/10 px-3 py-2 text-sm text-warning-800">
                  এই পরীক্ষায় এখনো কোনো বিষয়/routine যোগ করা হয়নি।
                </p>
              )}
              <Select
                className={controlClass}
                value={setupSubject.subjectId}
                onChange={(event) =>
                  setSetupSubject({
                    ...setupSubject,
                    subjectId: event.target.value,
                  })
                }
              >
                <option value="">বিষয় নির্বাচন করুন</option>
                {setupSubjects
                  .filter(
                    (item) =>
                      !setupExamSubjects.some(
                        (saved) => saved.subjectId === item.id,
                      ),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nameBn ?? "বিষয়"}
                    </option>
                  ))}
              </Select>
              <Input
                type="date"
                value={setupSubject.examDate}
                onChange={(event) =>
                  setSetupSubject({
                    ...setupSubject,
                    examDate: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="পূর্ণ নম্বর"
                  value={setupSubject.fullMarks}
                  onChange={(event) =>
                    setSetupSubject({
                      ...setupSubject,
                      fullMarks: event.target.value,
                    })
                  }
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="পাস নম্বর"
                  value={setupSubject.passMarks}
                  onChange={(event) =>
                    setSetupSubject({
                      ...setupSubject,
                      passMarks: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  aria-label="শুরুর সময়"
                  value={setupSubject.startsAt}
                  onChange={(event) =>
                    setSetupSubject({
                      ...setupSubject,
                      startsAt: event.target.value,
                    })
                  }
                />
                <Input
                  type="time"
                  aria-label="শেষ সময়"
                  value={setupSubject.endsAt}
                  onChange={(event) =>
                    setSetupSubject({
                      ...setupSubject,
                      endsAt: event.target.value,
                    })
                  }
                />
              </div>
              <Button
                type="button"
                disabled={Boolean(setupSaving)}
                onClick={() => void addSubjectRoutine()}
              >
                {setupSaving === "subject"
                  ? "সংরক্ষণ হচ্ছে…"
                  : "বিষয় ও রুটিন যোগ করুন"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!routineComplete || Boolean(setupSaving)}
                onClick={() => setWizardStep(3)}
              >
                পরের ধাপ: স্বাক্ষর
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWizardStep(1)}
              >
                পেছনে: পরীক্ষা নির্বাচন
              </Button>
            </Fold>
          ) : null}
        </div>

        {/* স্বাক্ষর শেষ হলে তবেই প্রিভিউ ও print column খুলবে */}
        {showPreview ? (
          <section
            className="min-w-0 scroll-mt-4"
            id="admit-preview"
            aria-label="প্রিন্ট প্রিভিউ"
          >
            {loading ? (
              <div className="no-print" aria-live="polite">
                <ListSkeleton rows={4} />
              </div>
            ) : data && students.length && signaturesComplete ? (
              <>
                <div className="no-print mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <div>
                    <h2 className="m-0 text-[17px] font-bold text-primary-800">
                      প্রিন্ট প্রিভিউ
                    </h2>
                    <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
                      কাগজে যেমন আসবে, এখানে ঠিক তেমনই দেখাচ্ছে।
                    </p>
                  </div>
                  <div className="flex gap-4 text-[13px] text-muted-foreground">
                    <span>
                      <b className="tabular-nums text-foreground">
                        {bn(students.length)}
                      </b>{" "}
                      কার্ড
                    </span>
                    <span>
                      <b className="tabular-nums text-foreground">
                        {bn(cardPages.length)}
                      </b>{" "}
                      পাতা
                    </span>
                  </div>
                </div>
                {perPage === "4" && subjectCount > 7 ? (
                  <p className="no-print mb-2.5 rounded-r-md border-l-[3px] border-warning-600 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    বিষয় বেশি হলে ২টি বা ১টি কার্ড বেছে নিলে লেখা বড় ও
                    পরিষ্কার থাকে।
                  </p>
                ) : null}
                <div className="rounded-xl bg-[#e3eaf1] p-2 sm:p-5">
                  <PageScaler>
                    <div
                      className="admit-sheet"
                      aria-label="প্রবেশপত্রের প্রিভিউ"
                    >
                      {cardPages.map((pageStudents, pageIndex) => (
                        <section
                          className={`admit-print-page admit-print-page-${perPage}`}
                          key={`${pageIndex}-${pageStudents[0]?.id ?? "page"}`}
                          aria-label={`পৃষ্ঠা ${bn(pageIndex + 1)} এর প্রবেশপত্র`}
                        >
                          <div className="admit-page-meta no-print">
                            <span>
                              পৃষ্ঠা {bn(pageIndex + 1)} /{" "}
                              {bn(cardPages.length)}
                            </span>
                            <span>{bn(pageStudents.length)}টি কার্ড</span>
                          </div>
                          <div
                            className={`admit-page-grid admit-page-grid-${perPage}`}
                          >
                            {pageStudents.map((student) => (
                              <AdmitCard
                                key={student.id}
                                student={student}
                                data={data}
                                layout={perPage}
                                instructions={instructions}
                                showStub={showStub}
                                headteacherSignatureUrl={
                                  headteacherSignatureUrl ||
                                  data.exam.headteacherSignatureUrl
                                }
                                preparedBySignatureUrl={
                                  preparedBySignatureUrl ||
                                  data.exam.preparedBySignatureUrl
                                }
                                preparedByName={preparedByName}
                                period={period}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </PageScaler>
                </div>
              </>
            ) : (
              <div
                className="no-print rounded-xl border border-dashed border-border bg-card px-7 py-10"
                role="status"
              >
                <h2 className="m-0 text-lg font-bold text-primary-800">
                  {loadError
                    ? "প্রবেশপত্র তৈরির তথ্য অসম্পূর্ণ"
                    : data && !signaturesComplete
                      ? "ধাপ ৩ সম্পূর্ণ করুন"
                      : data
                        ? "এই শাখায় কোনো শিক্ষার্থী নেই"
                        : examId
                          ? "এই পরীক্ষার তথ্য পাওয়া যায়নি"
                          : "একটি পরীক্ষা বেছে নিন"}
                </h2>
                <p className="m-0 mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
                  {loadError ||
                    (data && !signaturesComplete
                      ? "প্রধান শিক্ষক ও প্রস্তুতকারী শিক্ষকের স্বাক্ষর সংরক্ষণ করলে পরের ধাপ খুলবে।"
                      : data
                        ? "অন্য শাখা বেছে নিন, অথবা শাখা “সব শাখা” করুন।"
                        : examId
                          ? "পরীক্ষার ক্লাসে শিক্ষার্থী আছে কি না দেখুন, তারপর আবার চেষ্টা করুন।"
                          : "বাঁ পাশের তালিকা থেকে পরীক্ষা বেছে নিলে সব শিক্ষার্থীর প্রবেশপত্র এখানে দেখা যাবে।")}
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function AdmitCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="no-print p-6">
          <ListSkeleton rows={4} />
        </div>
      }
    >
      <AdmitCardsInner />
    </Suspense>
  );
}
