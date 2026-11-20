import { useEffect, useLayoutEffect, useRef } from "react";
import { bn, bnDate } from "@/lib/format";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/* Base and smallest type size (px) per layout. A card starts at the base size
   and shrinks only as far as needed to fit its box. */
const FIT: Record<AdmitLayout, { base: number; min: number }> = {
  "1": { base: 14, min: 10 },
  "2": { base: 11.5, min: 8.5 },
  "4": { base: 9.5, min: 7.5 },
};

export type AdmitSubject = {
  code?: string | null;
  nameBn: string;
  examDate?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type AdmitStudent = {
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
  seat?: {
    roomName?: string | null;
    building?: string | null;
    floor?: string | null;
    seatNo?: number | null;
    subjectNameBn?: string | null;
  } | null;
  seatPlans?: Array<{
    roomName?: string | null;
    seatNo?: number | null;
    subjectNameBn?: string | null;
  }>;
};

export type AdmitData = {
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
    headteacherSignatureUrl?: string | null;
    preparedByTeacherId?: string | null;
    preparedByTeacherNameBn?: string | null;
    preparedBySignatureUrl?: string | null;
  };
  classNameBn: string;
  subjects: AdmitSubject[];
  students: AdmitStudent[];
};

export type AdmitLayout = "1" | "2" | "4";

export type AdmitCardProps = {
  student: AdmitStudent;
  data: AdmitData;
  layout: AdmitLayout;
  instructions: string;
  /** Tear-off invigilator stub. Only drawn on the one-card-per-page layout. */
  showStub: boolean;
  headteacherSignatureUrl?: string | null;
  preparedBySignatureUrl?: string | null;
  preparedByName?: string | null;
  period?: string;
};

/* "22:00" -> "রাত ১০:০০" — 24-hour clock reads oddly on a Bangla notice. */
function dayPart(hour: number) {
  if (hour < 4) return "রাত";
  if (hour < 12) return "সকাল";
  if (hour < 16) return "দুপুর";
  if (hour < 18) return "বিকেল";
  if (hour < 20) return "সন্ধ্যা";
  return "রাত";
}

export function formatClock(value?: string | null) {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return bn(value);
  const hour = Number(match[1]);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${dayPart(hour)} ${bn(hour12)}:${bn(match[2])}`;
}

function weekday(value?: string | null) {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return "";
  const date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
  return date.toLocaleDateString("bn-BD", { weekday: "long", timeZone: "UTC" });
}

function CapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 2 9 2 12 0v-5" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </svg>
  );
}

export function AdmitCard({
  student,
  data,
  layout,
  instructions,
  showStub,
  headteacherSignatureUrl,
  preparedBySignatureUrl,
  preparedByName,
  period,
}: AdmitCardProps) {
  const school = data.school ?? { nameBn: "বিদ্যালয়" };
  const subjects = data.subjects ?? [];
  const stub = showStub && layout === "1";
  const note = instructions.trim();
  const cardRef = useRef<HTMLElement>(null);

  // Fit the card to its box so nothing is clipped on paper, whatever the
  // number of subjects or the length of the instructions.
  useIsoLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const { base, min } = FIT[layout];
    const fits = (size: number) => {
      el.style.fontSize = `${size}px`;
      return el.scrollHeight <= el.clientHeight + 1;
    };
    const run = () => {
      if (!el.clientHeight) return;
      let overflow = false;
      if (!fits(base)) {
        if (!fits(min)) {
          overflow = true;
        } else {
          let lo = min;
          let hi = base;
          for (let step = 0; step < 6; step += 1) {
            const mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid;
            else hi = mid;
          }
          el.style.fontSize = `${lo}px`;
        }
      }
      el.dataset.overflow = overflow ? "true" : "false";
    };
    run();
    void document.fonts?.ready.then(run);
  }, [
    layout,
    student,
    data,
    instructions,
    showStub,
    preparedByName,
    period,
    headteacherSignatureUrl,
    preparedBySignatureUrl,
  ]);

  const classSection = [data.classNameBn, student.sectionNameBn]
    .filter(Boolean)
    .join(", ");

  return (
    <article
      ref={cardRef}
      className={`admit-card ac-card ac-l${layout}${subjects.length > 6 ? " is-dense" : ""}`}
    >
      <header className="ac-head">
        <div className="ac-mark">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="" loading="eager" decoding="async" />
          ) : (
            <CapIcon />
          )}
        </div>
        <div className="ac-school">
          <h2>{school.nameBn}</h2>
          {school.nameEn ? (
            <p className="ac-school-en">{school.nameEn}</p>
          ) : null}
          {school.eiin || school.address ? (
            <p className="ac-school-meta">
              {school.eiin ? <span>EIIN {bn(school.eiin)}</span> : null}
              {school.address ? <span>{school.address}</span> : null}
            </p>
          ) : null}
        </div>
        {stub ? <span className="ac-copy">শিক্ষার্থীর কপি</span> : null}
      </header>

      <div className="ac-title">
        <h3>প্রবেশপত্র</h3>
        <p>
          {data.exam.nameBn}
          {period ? <span>{period}</span> : null}
        </p>
      </div>

      <div className="ac-body">
        <div className="ac-ident">
          <div className="ac-id">
            <div className="ac-photo">
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
            <div className="ac-who">
              <p className="ac-name" dir="auto">
                {student.nameBn}
              </p>
              {student.nameEn ? (
                <p className="ac-name-en" dir="auto">
                  {student.nameEn}
                </p>
              ) : null}
              <dl className="ac-facts">
                <div>
                  <dt>রেজিস্ট্রেশন নং</dt>
                  <dd>
                    {student.registrationNumber
                      ? bn(student.registrationNumber)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>পিতার নাম</dt>
                  <dd dir="auto">{student.fatherNameBn ?? "—"}</dd>
                </div>
                {student.groupName ? (
                  <div>
                    <dt>গ্রুপ</dt>
                    <dd dir="auto">{student.groupName}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <dl className="ac-key">
            <div>
              <dt>শ্রেণি</dt>
              <dd dir="auto">{data.classNameBn}</dd>
            </div>
            {student.sectionNameBn ? (
              <div>
                <dt>শাখা</dt>
                <dd dir="auto">{student.sectionNameBn}</dd>
              </div>
            ) : null}
            <div className="is-roll">
              <dt>রোল</dt>
              <dd>{student.roll != null ? bn(student.roll) : "—"}</dd>
            </div>
            <div className="is-wide">
              <dt>কক্ষ ও আসন</dt>
              <dd className="is-soft">&nbsp;</dd>
            </div>
          </dl>
        </div>

        {subjects.length ? (
          <section className="ac-routine" aria-label="পরীক্ষার রুটিন">
            <h4>পরীক্ষার রুটিন</h4>
            <div className="ac-rt" role="table">
              <div
                className="ac-rt-row ac-rt-head"
                role="row"
              >
                <span role="columnheader">নং</span>
                <span role="columnheader">বিষয়</span>
                <span role="columnheader">তারিখ</span>
                <span role="columnheader">সময়</span>
              </div>
              {subjects.map((subject, index) => {
                const day = weekday(subject.examDate);
                const start = formatClock(subject.startsAt);
                const end = formatClock(subject.endsAt);
                return (
                  <div
                    className="ac-rt-row"
                    role="row"
                    key={`${subject.code ?? subject.nameBn}-${subject.examDate ?? index}`}
                  >
                    <span role="cell">{bn(index + 1)}</span>
                    <span role="cell" className="ac-rt-sub">
                      <b>{subject.nameBn}</b>
                      {subject.code ? (
                        <small>কোড {bn(subject.code)}</small>
                      ) : null}
                    </span>
                    <span role="cell" className="ac-rt-date">
                      {subject.examDate ? bnDate(subject.examDate) : "—"}
                      {day ? <small>{day}</small> : null}
                    </span>
                    <span role="cell">
                      {start && end ? `${start} – ${end}` : start || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      {note ? (
        <div className="ac-note">
          <b>নির্দেশনা</b>
          <div dangerouslySetInnerHTML={{ __html: note }} />
        </div>
      ) : null}

      <footer className="ac-signs">
        <div className="ac-sign">
          <div className="ac-sign-mark">
            {preparedBySignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preparedBySignatureUrl}
                alt="প্রস্তুতকারী শিক্ষকের স্বাক্ষর"
              />
            ) : null}
          </div>
          <b>প্রস্তুতকারী শিক্ষক</b>
          {preparedByName ? <small>{preparedByName}</small> : null}
        </div>
        <div className="ac-sign">
          <div className="ac-sign-mark">
            {headteacherSignatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headteacherSignatureUrl}
                alt="প্রধান শিক্ষকের স্বাক্ষর"
              />
            ) : null}
          </div>
          <b>প্রধান শিক্ষক</b>
          <small>স্বাক্ষর ও সিল</small>
        </div>
      </footer>

      {stub ? (
        <aside className="ac-stub" aria-label="কক্ষ পরিদর্শকের কপি">
          <div className="ac-cut">
            <ScissorsIcon />
            <span>কক্ষ পরিদর্শকের কপি</span>
            <small>এখানে কেটে আলাদা করুন</small>
          </div>
          <div className="ac-stub-top">
            <div className="ac-stub-roll">
              <span>রোল</span>
              <b>{student.roll != null ? bn(student.roll) : "—"}</b>
            </div>
            <div className="ac-stub-who">
              <b dir="auto">{student.nameBn}</b>
              <span>{classSection}</span>
              <span>{data.exam.nameBn}</span>
            </div>
          </div>
          {subjects.length ? (
            <div className="ac-stub-marks">
              <p>উপস্থিতির স্বাক্ষর</p>
              <div>
                {subjects.map((subject, index) => (
                  <div key={`${subject.code ?? subject.nameBn}-${index}`}>
                    <span>{subject.nameBn}</span>
                    <i />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}
    </article>
  );
}
