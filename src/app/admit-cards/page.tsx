"use client";

import {
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Printer,
  Users,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminSWR } from "@/lib/swr";
import { bn, bnDate } from "@/lib/format";

type ExamOption = { id: string; nameBn: string; classId?: string };
type AdmitStudent = {
  id: string;
  nameBn: string;
  nameEn?: string | null;
  registrationNumber?: string | null;
  roll?: number | null;
  sectionId?: string | null;
  sectionNameBn?: string | null;
  groupName?: string | null;
  photoUrl?: string | null;
  fatherNameBn?: string | null;
};
type AdmitData = {
  school?: {
    nameBn: string;
    nameEn?: string;
    eiin?: string;
    address?: string;
    logoUrl?: string | null;
  } | null;
  exam: {
    id: string;
    nameBn: string;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  classNameBn: string;
  subjects: Array<{ code?: string | null; nameBn: string }>;
  students: AdmitStudent[];
};

const DEFAULT_INSTRUCTIONS =
  "পরীক্ষার্থীকে অবশ্যই প্রবেশপত্র সঙ্গে আনতে হবে। পরীক্ষা শুরুর ৩০ মিনিট আগে কেন্দ্রে উপস্থিত হতে হবে। মোবাইল ফোন, স্মার্টওয়াচ বা যেকোনো ইলেকট্রনিক ডিভাইস পরীক্ষার হলে আনা সম্পূর্ণ নিষিদ্ধ।";

function AdmitCardsInner() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [examId, setExamId] = useState(searchParams.get("examId") ?? "");
  const [printing, setPrinting] = useState(false);
  const [sectionFilter, setSectionFilter] = useState("");
  const [perPage, setPerPage] = useState("1");
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);

  const { data: examsPayload } = useAdminSWR<{ data: ExamOption[] }>(
    "/api/backend/results/exams",
  );
  const exams = examsPayload?.data ?? [];
  const admitKey = examId
    ? `/api/backend/results/exams/${encodeURIComponent(examId)}/admit-data`
    : null;
  const {
    data: admitPayload,
    error: admitError,
    isLoading,
  } = useAdminSWR<{ data: AdmitData }>(admitKey);
  const data = admitPayload?.data ?? null;
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

  const students = useMemo(
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

  const school = data?.school ?? {
    nameBn: "বিদ্যালয়",
    nameEn: "",
    eiin: "",
    address: "",
    logoUrl: null,
  };
  const period =
    data?.exam.startsAt || data?.exam.endsAt
      ? `${data.exam.startsAt ? bnDate(data.exam.startsAt) : ""}${data.exam.endsAt ? ` — ${bnDate(data.exam.endsAt)}` : ""}`
      : "";

  async function handlePrint() {
    if (!students.length || printing) return;

    setPrinting(true);
    document.body.classList.add("printing-admit");

    const cleanup = () => {
      document.body.classList.remove("printing-admit");
      setPrinting(false);
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    try {
      await document.fonts.ready;
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(".admit-sheet img"),
      );
      await Promise.race([
        Promise.all(
          images.map((image) => image.decode().catch(() => undefined)),
        ),
        new Promise<void>((resolve) => window.setTimeout(resolve, 3500)),
      ]);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        );
      });
      window.print();
    } catch {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
      toast.error("প্রিন্ট ডায়ালগ খোলা যায়নি");
    }
  }

  return (
    <main className="admit-page">
      <header className="admit-hero no-print">
        <div className="admit-hero-icon" aria-hidden="true">
          <GraduationCap />
        </div>
        <div className="admit-hero-copy">
          <p className="admit-hero-eyebrow">EXAM OFFICE / STUDENT SERVICES</p>
          <h1>পরীক্ষার প্রবেশপত্র</h1>
          <p className="admit-hero-description">
            শিক্ষার্থীর তথ্য সাজিয়ে নিন, তারপর সব প্রবেশপত্র একসাথে A4-এ
            প্রিন্ট করুন বা PDF হিসেবে সংরক্ষণ করুন।
          </p>
        </div>
        <div className="admit-format-badge" aria-label="A4 print-ready format">
          <span className="admit-format-icon" aria-hidden="true">
            <FileText />
          </span>
          <span>
            <strong>A4</strong>
            <small>PRINT READY</small>
          </span>
        </div>
      </header>

      <Card
        className="card admit-config-card no-print"
        aria-labelledby="admit-config-title"
      >
        <CardHeader className="admit-config-header">
          <span className="admit-config-icon" aria-hidden="true">
            <CalendarDays />
          </span>
          <div className="admit-config-heading">
            <span className="admit-step-label">01 / PRINT SETUP</span>
            <CardTitle
              id="admit-config-title"
              role="heading"
              aria-level={2}
              className="admit-config-title"
            >
              প্রিন্ট সেটআপ
            </CardTitle>
            <CardDescription className="admit-config-description">
              পরীক্ষা, শাখা, প্রতি পাতায় কার্ডের সংখ্যা এবং নির্দেশনা ঠিক করুন।
            </CardDescription>
          </div>
          {data && !loading ? (
            <span className="admit-ready-status">
              <CheckCircle2 aria-hidden="true" />
              প্রিভিউ প্রস্তুত
            </span>
          ) : null}
        </CardHeader>

        <CardContent className="admit-config-content">
          <div className="admit-config-grid">
            <div className="admit-field">
              <label className="admit-field-label" htmlFor="admit-exam">
                <span>পরীক্ষা নির্বাচন</span>
                <small>প্রবেশপত্রের পরীক্ষা</small>
              </label>
              <Select
                id="admit-exam"
                className="sel admit-select"
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
                  </option>
                ))}
              </Select>
            </div>

            <div className="admit-field">
              <label className="admit-field-label" htmlFor="admit-section">
                <span>শাখা</span>
                <small>প্রয়োজন হলে ফিল্টার করুন</small>
              </label>
              <Select
                id="admit-section"
                className="sel admit-select"
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

            <div className="admit-field">
              <label className="admit-field-label" htmlFor="admit-per-page">
                <span>প্রতি পাতায় কার্ড</span>
                <small>A4 পৃষ্ঠার বিন্যাস</small>
              </label>
              <Select
                id="admit-per-page"
                className="sel admit-select"
                value={perPage}
                onChange={(event) => setPerPage(event.target.value)}
              >
                <option value="1">১টি · বড় ফরম্যাট</option>
                <option value="2">২টি · অর্ধ-পৃষ্ঠা</option>
                <option value="4">৪টি · কমপ্যাক্ট</option>
              </Select>
            </div>
          </div>

          <div className="admit-instructions-field">
            <label className="admit-field-label" htmlFor="admit-instructions">
              <span>পরীক্ষার্থীর নির্দেশনা</span>
              <small>এই লেখা প্রতিটি কার্ডে ছাপা হবে</small>
            </label>
            <textarea
              id="admit-instructions"
              className="inp admit-instructions-input"
              rows={3}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </div>

          <div className="admit-config-footer">
            <div className="admit-student-count" aria-live="polite">
              <span className="admit-count-icon" aria-hidden="true">
                <Users />
              </span>
              <span className="admit-count-copy">
                <strong>{bn(students.length)}</strong>
                <span>জন শিক্ষার্থী</span>
                <small>
                  {loading
                    ? "পরীক্ষার তথ্য আনা হচ্ছে…"
                    : data
                      ? `${bn(cardPages.length)}টি A4 পৃষ্ঠা তৈরি হবে`
                      : "পরীক্ষা বেছে নিলে প্রিভিউ দেখা যাবে"}
                </small>
              </span>
            </div>
            <div className="admit-print-action">
              <Button
                type="button"
                className="btn pri admit-print-button"
                disabled={!students.length || loading || printing}
                onClick={() => void handlePrint()}
                aria-label={`প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন, ${bn(students.length)}টি প্রবেশপত্র`}
              >
                <Printer className="ic" aria-hidden="true" />
                {printing
                  ? "প্রিন্ট প্রস্তুত হচ্ছে…"
                  : "প্রিন্ট / PDF তৈরি করুন"}
              </Button>
              <small>প্রিন্ট ডায়ালগে “Save as PDF” বেছে নিন</small>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="admit-loading no-print" aria-live="polite">
          <ListSkeleton rows={4} />
        </div>
      ) : data && students.length ? (
        <>
          <section
            className="admit-preview-heading no-print"
            aria-labelledby="admit-preview-title"
          >
            <div className="admit-preview-copy">
              <span className="admit-step-label">02 / REVIEW</span>
              <h2 id="admit-preview-title">প্রিন্ট প্রিভিউ</h2>
              <p>প্রিন্ট করার আগে কার্ড ও পাতার বিন্যাস দেখে নিন।</p>
            </div>
            <div className="admit-preview-stats" aria-label="প্রিভিউ সারাংশ">
              <div>
                <strong>{bn(students.length)}</strong>
                <span>টি কার্ড</span>
              </div>
              <span className="admit-stat-divider" aria-hidden="true" />
              <div>
                <strong>{bn(cardPages.length)}</strong>
                <span>টি পৃষ্ঠা</span>
              </div>
            </div>
          </section>

          <div className="admit-sheet" aria-label="প্রবেশপত্রের প্রিভিউ">
            {cardPages.map((pageStudents, pageIndex) => (
              <section
                className={`admit-print-page admit-print-page-${perPage}`}
                key={`${pageIndex}-${pageStudents[0]?.id ?? "page"}`}
                aria-label={`পৃষ্ঠা ${bn(pageIndex + 1)} এর প্রবেশপত্র`}
              >
                <div className="admit-page-meta no-print">
                  <span>
                    পৃষ্ঠা {bn(pageIndex + 1)} / {bn(cardPages.length)}
                  </span>
                  <span>{bn(pageStudents.length)}টি কার্ড</span>
                </div>
                <div className={`admit-page-grid admit-page-grid-${perPage}`}>
                  {pageStudents.map((student) => (
                    <article
                      className={`admit-card admit-card-layout-${perPage}`}
                      key={student.id}
                    >
                      <header className="admit-card-header">
                        <div className="admit-school-mark">
                          {school.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="admit-logo"
                              src={school.logoUrl}
                              alt=""
                              loading="eager"
                              decoding="async"
                            />
                          ) : (
                            <GraduationCap aria-hidden="true" />
                          )}
                        </div>
                        <div className="admit-school">
                          <span className="admit-school-overline">
                            EXAMINATION OFFICE
                          </span>
                          <h2>{school.nameBn}</h2>
                          {school.nameEn ? (
                            <p className="admit-school-en">{school.nameEn}</p>
                          ) : null}
                          <div className="admit-school-meta">
                            {school.eiin ? (
                              <span>EIIN: {bn(school.eiin)}</span>
                            ) : null}
                            {school.address ? (
                              <span>{school.address}</span>
                            ) : null}
                          </div>
                        </div>
                      </header>

                      <div className="admit-band">
                        <div className="admit-band-label">
                          <span>STUDENT IDENTIFICATION</span>
                          <strong>প্রবেশপত্র</strong>
                        </div>
                        <span className="admit-band-exam">
                          {data.exam.nameBn}
                        </span>
                      </div>

                      <div className="admit-identity-layout">
                        <div className="admit-student-details">
                          <div className="admit-student-name">
                            <span>পরীক্ষার্থীর নাম</span>
                            <strong dir="auto">{student.nameBn}</strong>
                            {student.nameEn ? (
                              <small dir="auto">{student.nameEn}</small>
                            ) : null}
                          </div>
                          <table className="admit-info">
                            <tbody>
                              <tr>
                                <th scope="row">শ্রেণি</th>
                                <td dir="auto">{data.classNameBn}</td>
                              </tr>
                              {student.sectionNameBn ? (
                                <tr>
                                  <th scope="row">শাখা</th>
                                  <td dir="auto">{student.sectionNameBn}</td>
                                </tr>
                              ) : null}
                              {student.groupName ? (
                                <tr>
                                  <th scope="row">গ্রুপ</th>
                                  <td dir="auto">{student.groupName}</td>
                                </tr>
                              ) : null}
                              <tr>
                                <th scope="row">রোল</th>
                                <td>
                                  {student.roll != null
                                    ? bn(student.roll)
                                    : "—"}
                                </td>
                              </tr>
                              <tr>
                                <th scope="row">রেজিস্ট্রেশন</th>
                                <td>
                                  {student.registrationNumber
                                    ? bn(student.registrationNumber)
                                    : "—"}
                                </td>
                              </tr>
                              <tr>
                                <th scope="row">পিতার নাম</th>
                                <td dir="auto">
                                  {student.fatherNameBn ?? "—"}
                                </td>
                              </tr>
                              {period ? (
                                <tr>
                                  <th scope="row">পরীক্ষার সময়</th>
                                  <td>{period}</td>
                                </tr>
                              ) : null}
                              <tr>
                                <th scope="row">আসন / কক্ষ</th>
                                <td>……………………</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="admit-photo">
                          {student.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.photoUrl}
                              alt={`${student.nameBn} — শিক্ষার্থীর ছবি`}
                              loading="eager"
                              decoding="async"
                            />
                          ) : (
                            <span>ছবি</span>
                          )}
                        </div>
                      </div>

                      {(data.subjects ?? []).length ? (
                        <div className="admit-subjects">
                          <strong>বিষয়সমূহ</strong>
                          <p>
                            {data.subjects
                              .map(
                                (subject) =>
                                  `${subject.nameBn}${subject.code ? ` (${bn(subject.code)})` : ""}`,
                              )
                              .join(" · ")}
                          </p>
                        </div>
                      ) : null}

                      {instructions.trim() ? (
                        <div className="admit-note">
                          <strong>নির্দেশনা</strong>
                          <p>{instructions.trim()}</p>
                        </div>
                      ) : null}

                      <footer className="admit-signs">
                        <span>শ্রেণি শিক্ষকের স্বাক্ষর</span>
                        <span>প্রধান শিক্ষকের স্বাক্ষর ও সিল</span>
                      </footer>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <section className="admit-empty no-print" role="status">
          <span className="admit-empty-icon" aria-hidden="true">
            {loadError ? <FileText /> : <CalendarDays />}
          </span>
          <div>
            <h2>
              {loadError
                ? "পরীক্ষার তথ্য লোড করা যায়নি"
                : data
                  ? "এই শাখায় কোনো শিক্ষার্থী নেই"
                  : examId
                    ? "এই পরীক্ষার তথ্য পাওয়া যায়নি"
                    : "প্রথমে একটি পরীক্ষা বেছে নিন"}
            </h2>
            <p>
              {loadError ||
                (data
                  ? "অন্য শাখা নির্বাচন করুন অথবা ফিল্টারটি ‘সব শাখা’ করুন।"
                  : "পরীক্ষা নির্বাচন করলে শিক্ষার্থীদের প্রবেশপত্র এখানে প্রিভিউ হবে।")}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

export default function AdmitCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="admit-loading no-print">
          <ListSkeleton rows={4} />
        </div>
      }
    >
      <AdmitCardsInner />
    </Suspense>
  );
}
