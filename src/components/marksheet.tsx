"use client";

import { bn, bnNum } from "@/lib/format";
import type { ReceiptSchool } from "@/components/finance/receipt";

type MarksheetSubject = {
  nameBn?: string;
  totalMarks?: number;
  letter?: string;
  gpa?: string | number;
  isAbsent?: boolean;
  fullMarks?: number;
  cqMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  cq?: number | null;
  mcq?: number | null;
  practical?: number | null;
};

type MarksheetData = {
  school?: ReceiptSchool | null;
  student: {
    nameBn: string;
    nameEn?: string;
    classNameBn?: string;
    sectionNameBn?: string;
    sessionName?: string;
    roll?: string;
    registrationNumber?: string;
    fatherNameBn?: string;
  };
  exam: { nameBn: string; isPublished?: boolean };
  result: {
    totalMarks?: number;
    gpa?: string | number;
    letter?: string;
    isPassed?: boolean;
    meritPosition?: number;
  };
  subjects: MarksheetSubject[];
};

export async function printMarksheetSheet() {
  document.body.classList.add("printing-marksheet");

  const clearPrintState = () => {
    window.removeEventListener("afterprint", clearPrintState);
    document.body.classList.remove("printing-marksheet");
  };

  window.addEventListener("afterprint", clearPrintState, { once: true });

  try {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
    window.print();
    window.setTimeout(clearPrintState, 1500);
  } catch (error) {
    clearPrintState();
    throw error;
  }
}

export function MarksheetSheet({ data }: { data: MarksheetData }) {
  const schoolName = data.school?.nameBn?.trim() || "বিদ্যালয়";
  const schoolMeta = [
    data.school?.address,
    data.school?.eiin ? `EIIN: ${bn(data.school.eiin)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasCq = data.subjects.some((subject) => (subject.cqMarks ?? 0) > 0);
  const hasMcq = data.subjects.some((subject) => (subject.mcqMarks ?? 0) > 0);
  const hasPractical = data.subjects.some(
    (subject) => (subject.practicalMarks ?? 0) > 0,
  );
  const fullMarks = data.subjects.reduce(
    (total, subject) => total + Number(subject.fullMarks ?? 0),
    0,
  );
  const passedLabel =
    data.result.isPassed === true
      ? "উত্তীর্ণ"
      : data.result.isPassed === false
        ? "অকৃতকার্য"
        : "ফলাফল";

  return (
    <article
      className="marksheet-sheet"
      aria-label={`${data.exam.nameBn} — ${data.student.nameBn} — নম্বরপত্র`}
    >
      <div className="marksheet-top-rule" aria-hidden="true" />
      <header className="marksheet-header">
        <div className="marksheet-school-mark" aria-hidden="true">
          {schoolName.slice(0, 1)}
        </div>
        <div className="marksheet-school-copy">
          <span className="marksheet-kicker">ACADEMIC RECORD</span>
          <h2>{schoolName}</h2>
          {data.school?.nameEn && (
            <p className="marksheet-school-en">{data.school.nameEn}</p>
          )}
          {schoolMeta && <p className="marksheet-school-meta">{schoolMeta}</p>}
        </div>
        <div className="marksheet-document-mark">
          <span>
            {data.exam.isPublished === true
              ? "OFFICIAL RESULT"
              : data.exam.isPublished === false
                ? "DRAFT RESULT"
                : "RESULT PREVIEW"}
          </span>
          <strong>নম্বরপত্র</strong>
          <small>
            {data.exam.isPublished === true
              ? "প্রকাশিত ফলাফল"
              : data.exam.isPublished === false
                ? "খসড়া কপি"
                : "প্রিভিউ"}
          </small>
        </div>
      </header>

      <div className="marksheet-exam-band">
        <div>
          <span>পরীক্ষার নাম</span>
          <strong>{data.exam.nameBn}</strong>
        </div>
        <small>{data.student.sessionName || "শিক্ষাবর্ষ"}</small>
      </div>

      <section className="marksheet-student-section" aria-label="শিক্ষার্থীর তথ্য">
        <div className="marksheet-section-heading">
          <div>
            <span>STUDENT PROFILE</span>
            <h3>শিক্ষার্থীর পরিচিতি</h3>
          </div>
          <small>রেকর্ড নং · {bn(data.student.registrationNumber || "—")}</small>
        </div>
        <dl className="marksheet-student-grid">
          <div className="marksheet-student-name">
            <dt>শিক্ষার্থীর নাম</dt>
            <dd>{data.student.nameBn}</dd>
            {data.student.nameEn && <small>{data.student.nameEn}</small>}
          </div>
          <div>
            <dt>শ্রেণি</dt>
            <dd>{data.student.classNameBn || "—"}</dd>
          </div>
          <div>
            <dt>শাখা</dt>
            <dd>{data.student.sectionNameBn || "—"}</dd>
          </div>
          <div>
            <dt>রোল</dt>
            <dd>{bn(data.student.roll || "—")}</dd>
          </div>
          <div>
            <dt>রেজিস্ট্রেশন নং</dt>
            <dd>{bn(data.student.registrationNumber || "—")}</dd>
          </div>
          <div>
            <dt>পিতার নাম</dt>
            <dd>{data.student.fatherNameBn || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="marksheet-performance" aria-label="বিষয়ভিত্তিক ফলাফল">
        <div className="marksheet-section-heading">
          <div>
            <span>SUBJECT PERFORMANCE</span>
            <h3>বিষয়ভিত্তিক ফলাফল</h3>
          </div>
          <small>{bnNum(data.subjects.length)}টি বিষয়</small>
        </div>
        <div className="marksheet-table-wrap">
          <table className="marksheet-results-table">
            <thead>
              <tr>
                <th scope="col">বিষয়</th>
                {hasCq && <th className="marksheet-number" scope="col">সৃজনশীল</th>}
                {hasMcq && <th className="marksheet-number" scope="col">বহুনির্বাচনি</th>}
                {hasPractical && <th className="marksheet-number" scope="col">ব্যবহারিক</th>}
                <th className="marksheet-number" scope="col">প্রাপ্ত নম্বর</th>
                <th className="marksheet-number" scope="col">পূর্ণমান</th>
                <th scope="col">গ্রেড</th>
                <th className="marksheet-number" scope="col">GPA</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject, index) => (
                <tr key={`${subject.nameBn ?? "subject"}-${index}`}>
                  <th scope="row">{subject.nameBn || "বিষয়"}</th>
                  {hasCq && (
                    <td className="marksheet-number">
                      {subject.cq === null || subject.cq === undefined
                        ? "—"
                        : bnNum(subject.cq)}
                    </td>
                  )}
                  {hasMcq && (
                    <td className="marksheet-number">
                      {subject.mcq === null || subject.mcq === undefined
                        ? "—"
                        : bnNum(subject.mcq)}
                    </td>
                  )}
                  {hasPractical && (
                    <td className="marksheet-number">
                      {subject.practical === null || subject.practical === undefined
                        ? "—"
                        : bnNum(subject.practical)}
                    </td>
                  )}
                  <td className="marksheet-number marksheet-score">
                    {subject.isAbsent
                      ? "অনুপস্থিত"
                      : bnNum(Number(subject.totalMarks ?? 0))}
                  </td>
                  <td className="marksheet-number">
                    {bnNum(Number(subject.fullMarks ?? 0))}
                  </td>
                  <td>{subject.letter || "—"}</td>
                  <td className="marksheet-number">
                    {bn(String(subject.gpa ?? "—"))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="marksheet-summary" aria-label="সামগ্রিক ফলাফল">
        <div className="marksheet-summary-card marksheet-summary-total">
          <span>মোট প্রাপ্ত নম্বর</span>
          <strong>
            {bnNum(Number(data.result.totalMarks ?? 0))}
            {fullMarks > 0 && <small> / {bnNum(fullMarks)}</small>}
          </strong>
        </div>
        <div className="marksheet-summary-card">
          <span>GPA</span>
          <strong>{bn(String(data.result.gpa ?? "—"))}</strong>
        </div>
        <div className="marksheet-summary-card">
          <span>লেটার গ্রেড</span>
          <strong>{data.result.letter || "—"}</strong>
        </div>
        <div className="marksheet-summary-card">
          <span>মেধাক্রম</span>
          <strong>
            {data.result.meritPosition
              ? bnNum(data.result.meritPosition)
              : "—"}
          </strong>
        </div>
      </section>

      <div
        className={`marksheet-result-status ${data.result.isPassed === false ? "is-fail" : ""}`}
        role="status"
      >
        <span>{passedLabel}</span>
        <span>
          {data.result.isPassed === true
            ? "অভিনন্দন — পরীক্ষায় সফলভাবে উত্তীর্ণ হয়েছে।"
            : data.result.isPassed === false
              ? "পরবর্তী পরীক্ষায় আরও ভালো করার জন্য উৎসাহিত করা হলো।"
              : "পরীক্ষার ফলাফল"}
        </span>
      </div>

      <footer className="marksheet-signatures">
        <div>
          <small>CLASS TEACHER</small>
          <span className="marksheet-signature-space" aria-hidden="true" />
          <strong>শ্রেণি শিক্ষকের স্বাক্ষর</strong>
        </div>
        <div>
          <small>EXAM CONTROLLER</small>
          <span className="marksheet-signature-space" aria-hidden="true" />
          <strong>পরীক্ষা নিয়ন্ত্রক</strong>
        </div>
        <div>
          <small>HEAD TEACHER</small>
          <span className="marksheet-signature-space" aria-hidden="true" />
          <strong>প্রধান শিক্ষকের স্বাক্ষর ও সিল</strong>
        </div>
      </footer>
      <div className="marksheet-footer-note">
        <span>এই নম্বরপত্রটি বিদ্যালয়ের রেকর্ড অনুযায়ী প্রস্তুত করা হয়েছে।</span>
        <strong>{schoolName}</strong>
      </div>
    </article>
  );
}
