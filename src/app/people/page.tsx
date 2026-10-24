/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Plus, Printer, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton, StatSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-api";
import { bn, bnNum, formatTaka, paisaToTaka, takaToPaisa } from "@/lib/format";
import {
  printReceiptSheet,
  ReceiptView,
  type ReceiptData,
  type ReceiptSchool,
} from "@/components/finance/receipt";

type Row = Record<string, unknown> & { id: string };

type FeeAssignment = {
  id: string;
  eventNameBn?: string;
  dueDate?: string;
  amount: number;
  paidAmount: number;
  remainingAmount?: number;
  status: string;
};

type FeePayment = {
  id: string;
  studentFeeId?: string;
  paidAt?: string;
  amount: number;
  method?: string;
  receiptNumber?: string;
  verifyCode?: string;
  collectedByName?: string | null;
  eventNameBn?: string;
};

type ResultSubject = {
  nameBn?: string;
  totalMarks?: number;
  letter?: string;
  gpa?: string | number;
  isAbsent?: boolean;
  fullMarks?: number;
  passMarks?: number;
  cqMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
  cq?: number | null;
  mcq?: number | null;
  practical?: number | null;
};

type StudentResult = {
  result: {
    id: string;
    totalMarks?: number;
    gpa?: string | number;
    letter?: string;
    isPassed?: boolean;
    meritPosition?: number;
  };
  exam: {
    id: string;
    nameBn?: string;
    isPublished?: boolean;
  };
  sessionName?: string | null;
  subjects: ResultSubject[];
};

type AttendanceSummary = {
  totalDays: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
};

type AttendanceData = {
  month: string;
  months: string[];
  summary: AttendanceSummary;
  overall: AttendanceSummary;
  records: Array<{ date: string; status: string; note?: string | null }>;
};

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const name = BN_MONTHS[Number(month) - 1] ?? "";
  return `${name} ${bn(year ?? "")}`;
}

function attendanceChip(status: string) {
  if (status === "PRESENT") return <span className="chip g">উপস্থিত</span>;
  if (status === "ABSENT") return <span className="chip r">অনুপস্থিত</span>;
  if (status === "LEAVE") return <span className="chip w">ছুটি</span>;
  return <span className="chip gr">{status}</span>;
}

const PAYMENT_METHODS = ["ক্যাশ", "বিকাশ", "ব্যাংক", "চেক"];

type FeeStatement = {
  totals: { totalAmount: number; totalPaid: number; totalDue: number };
  assignments: FeeAssignment[];
  payments: FeePayment[];
};

function feeStatusChip(status: string) {
  if (status === "PAID") return <span className="chip g">পরিশোধিত</span>;
  if (status === "PARTIAL") return <span className="chip w">আংশিক</span>;
  return <span className="chip w">বকেয়া</span>;
}

const tabs = [
  ["students", "শিক্ষার্থী"],
  ["teachers", "শিক্ষক"],
  ["staff", "কর্মচারী"],
  ["subjectAssignments", "বিষয় বরাদ্দ"],
] as const;

type TabKey = (typeof tabs)[number][0];

const emptyStudent = {
  displayNameBn: "",
  nameEn: "",
  sessionId: "",
  classId: "",
  sectionId: "",
  roll: "",
  fatherNameBn: "",
  motherNameBn: "",
  dateOfBirth: "",
  gender: "",
  religion: "",
  bloodGroup: "",
  guardianMobile: "",
  presentAddress: "",
  permanentAddress: "",
  birthCertificateNumber: "",
  admissionDate: "",
  previousInstitution: "",
};

const emptyTeacher = {
  displayNameBn: "",
  designation: "সহকারী শিক্ষক",
  mobile: "",
  email: "",
  qualification: "",
  joiningDate: "",
  monthlySalary: "",
};

const emptyStaff = { nameBn: "", designation: "", mobile: "" };
const emptyAssignment = { teacherId: "", subjectId: "", classId: "", sectionId: "" };

function rowName(row: Row): string {
  return String(
    row.displayNameBn ?? row.nameBn ?? row.teacherCode ?? row.designation ?? row.id,
  );
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function PeoplePage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("students");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudent);
  const [teacherForm, setTeacherForm] = useState(emptyTeacher);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [editingStudent, setEditingStudent] = useState<Row | null>(null);
  const [profile, setProfile] = useState<Row | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "results" | "attendance" | "fees">("info");
  const [statement, setStatement] = useState<FeeStatement | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementFor, setStatementFor] = useState<string | null>(null);
  const [results, setResults] = useState<StudentResult[] | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [resultsFor, setResultsFor] = useState<string | null>(null);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<string | null>(null);
  const [school, setSchool] = useState<ReceiptSchool | null>(null);
  const [meName, setMeName] = useState<string>("");
  const [payTarget, setPayTarget] = useState<FeeAssignment | null>(null);
  const [payForm, setPayForm] = useState({ amountTaka: "", method: "ক্যাশ", paidAt: "" });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<ReceiptData | null>(null);
  const [receiptModal, setReceiptModal] = useState<ReceiptData | null>(null);
  const [issuedLogin, setIssuedLogin] = useState<{ username?: string; temporaryPassword?: string } | null>(null);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [sections, setSections] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [teachers, setTeachers] = useState<Row[]>([]);

  async function loadRows() {
    setRows(null);
    try {
      const payload = await apiGet<{ data?: Row[] }>(`/api/backend/people/${tab}`);
      setRows(payload.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "তালিকা লোড করা যায়নি");
      setRows([]);
    }
  }
  useEffect(() => {
    void loadRows();
  }, [tab]);

  function openProfile(row: Row) {
    setProfile(row);
    setProfileTab("info");
    setStatement(null);
    setStatementError(null);
    setStatementFor(null);
    setResults(null);
    setResultsError(null);
    setResultsFor(null);
    setExpandedExam(null);
    setAttendance(null);
    setAttendanceError(null);
    setAttendanceFor(null);
    setPayTarget(null);
    setSuccessReceipt(null);
    setReceiptModal(null);
  }

  async function loadStatement(studentId: string) {
    setStatement(null);
    setStatementError(null);
    setStatementFor(studentId);
    try {
      const payload = await apiGet<{ data?: FeeStatement }>(
        `/api/backend/finance/students/${studentId}/statement`,
      );
      setStatement(
        payload.data ?? {
          totals: { totalAmount: 0, totalPaid: 0, totalDue: 0 },
          assignments: [],
          payments: [],
        },
      );
    } catch (error) {
      setStatementError(
        error instanceof Error ? error.message : "ফি তথ্য লোড করা যায়নি",
      );
    }
  }

  useEffect(() => {
    if (profile && profileTab === "fees" && statementFor !== profile.id) {
      void loadStatement(profile.id);
    }
  }, [profile, profileTab]);

  async function loadResults(studentId: string) {
    setResults(null);
    setResultsError(null);
    setResultsFor(studentId);
    setExpandedExam(null);
    try {
      const payload = await apiGet<{ data?: StudentResult[] }>(
        `/api/backend/results/students/${studentId}`,
      );
      setResults(payload.data ?? []);
    } catch (error) {
      setResultsError(
        error instanceof Error ? error.message : "ফলাফল লোড করা যায়নি",
      );
    }
  }

  useEffect(() => {
    if (profile && profileTab === "results" && resultsFor !== profile.id) {
      void loadResults(profile.id);
    }
  }, [profile, profileTab]);

  async function loadAttendance(studentId: string, month?: string) {
    setAttendance(null);
    setAttendanceError(null);
    setAttendanceFor(studentId);
    try {
      const query = month ? `?month=${encodeURIComponent(month)}` : "";
      const payload = await apiGet<{ data?: AttendanceData }>(
        `/api/backend/attendance/students/${studentId}${query}`,
      );
      setAttendance(
        payload.data ?? {
          month: month ?? "",
          months: [],
          summary: { totalDays: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
          overall: { totalDays: 0, present: 0, absent: 0, leave: 0, percentage: 0 },
          records: [],
        },
      );
    } catch (error) {
      setAttendanceError(
        error instanceof Error ? error.message : "হাজিরা লোড করা যায়নি",
      );
    }
  }

  useEffect(() => {
    if (profile && profileTab === "attendance" && attendanceFor !== profile.id) {
      void loadAttendance(profile.id);
    }
  }, [profile, profileTab]);

  // School identity (receipt header) + the signed-in admin's name
  // (receipt "গ্রহণকারী") — fetched once, failures just leave fallbacks.
  useEffect(() => {
    void fetch("/api/school-settings")
      .then((response) => response.json())
      .then((payload: { data?: { school?: ReceiptSchool } }) => {
        if (payload.data?.school) setSchool(payload.data.school);
      })
      .catch(() => undefined);
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user?: { displayNameBn?: string } }) => {
        if (payload.user?.displayNameBn) setMeName(payload.user.displayNameBn);
      })
      .catch(() => undefined);
  }, []);

  function remainingOf(assignment: FeeAssignment): number {
    return assignment.remainingAmount !== undefined
      ? Number(assignment.remainingAmount)
      : Number(assignment.amount) - Number(assignment.paidAmount);
  }

  function openPayment(assignment: FeeAssignment) {
    setPayTarget(assignment);
    setSuccessReceipt(null);
    setPayError(null);
    setPayForm({
      amountTaka: String(paisaToTaka(remainingOf(assignment))),
      method: "ক্যাশ",
      paidAt: new Date().toISOString().slice(0, 10),
    });
  }

  function closePayment() {
    setPayTarget(null);
    setSuccessReceipt(null);
    setPayError(null);
  }

  async function submitProfilePayment() {
    if (!payTarget || !profile) return;
    const remaining = remainingOf(payTarget);
    const paisa = takaToPaisa(Number(payForm.amountTaka));
    if (!Number.isFinite(paisa) || paisa <= 0) {
      setPayError("সঠিক পরিমাণ লিখুন");
      return;
    }
    if (paisa > remaining) {
      setPayError("পরিমাণ বাকি পরিমাণের বেশি হতে পারে না");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      // Same payments flow the collection screen uses — no parallel
      // semantics: partial payments and status derivation stay server-side.
      const payload = await apiPost<{
        data?: {
          receipt?: { receiptNumber?: string; verifyCode?: string };
          paidAmount?: number;
          remaining?: number;
        };
      }>(
        `/api/backend/finance/dues/${payTarget.id}/pay`,
        { amount: paisa, method: payForm.method, paidAt: payForm.paidAt },
        "পেমেন্ট করা যায়নি",
      );
      const receipt = payload.data?.receipt;
      setSuccessReceipt({
        school,
        receiptNumber: receipt?.receiptNumber ?? "—",
        verifyCode: receipt?.verifyCode,
        paidAt: payForm.paidAt,
        studentNameBn: rowName(profile),
        registrationNumber: profile.registrationNumber
          ? String(profile.registrationNumber)
          : undefined,
        classNameBn: profile.classNameBn ? String(profile.classNameBn) : undefined,
        sectionNameBn: profile.sectionNameBn
          ? String(profile.sectionNameBn)
          : undefined,
        eventNameBn: payTarget.eventNameBn ?? "ফি ইভেন্ট",
        amount: paisa,
        method: payForm.method,
        remaining: payload.data?.remaining,
        receivedBy: meName || undefined,
      });
      // Refresh the fee statement behind the modal so totals, statuses
      // and the payment history already include this payment on close.
      await loadStatement(profile.id);
    } catch (error) {
      setPayError(
        error instanceof Error ? error.message : "পেমেন্ট করা যায়নি",
      );
    } finally {
      setPaying(false);
    }
  }

  function paymentReceiptData(payment: FeePayment): ReceiptData {
    return {
      school,
      receiptNumber: payment.receiptNumber ?? "—",
      verifyCode: payment.verifyCode,
      paidAt: payment.paidAt,
      studentNameBn: profile ? rowName(profile) : "শিক্ষার্থী",
      registrationNumber: profile?.registrationNumber
        ? String(profile.registrationNumber)
        : undefined,
      classNameBn: profile?.classNameBn ? String(profile.classNameBn) : undefined,
      sectionNameBn: profile?.sectionNameBn
        ? String(profile.sectionNameBn)
        : undefined,
      eventNameBn: payment.eventNameBn ?? "ফি ইভেন্ট",
      amount: Number(payment.amount),
      method: payment.method,
      receivedBy: payment.collectedByName ?? undefined,
    };
  }

  useEffect(() => {
    void Promise.all([
      apiGet<{ data?: Row[] }>("/api/backend/academics/sessions").catch(() => ({ data: [] })),
      apiGet<{ data?: Row[] }>("/api/backend/academics/classes").catch(() => ({ data: [] })),
      apiGet<{ data?: Row[] }>("/api/backend/academics/sections").catch(() => ({ data: [] })),
      apiGet<{ data?: Row[] }>("/api/backend/academics/subjects").catch(() => ({ data: [] })),
      apiGet<{ data?: Row[] }>("/api/backend/people/teachers").catch(() => ({ data: [] })),
    ]).then(([sessionData, classData, sectionData, subjectData, teacherData]) => {
      setSessions(sessionData.data ?? []);
      setClasses(classData.data ?? []);
      setSections(sectionData.data ?? []);
      setSubjects(subjectData.data ?? []);
      setTeachers(teacherData.data ?? []);
    });
  }, []);

  function studentPayload() {
    // Keys match the backend student DTO exactly (B2): every collected
    // field is sent, with the *NameBn spellings the service persists plus
    // the plain aliases, so nothing the admin typed is dropped.
    return {
      displayNameBn: studentForm.displayNameBn,
      nameEn: studentForm.nameEn || undefined,
      sessionId: studentForm.sessionId,
      classId: studentForm.classId,
      sectionId: studentForm.sectionId || undefined,
      roll: studentForm.roll ? Number(studentForm.roll) : undefined,
      fatherNameBn: studentForm.fatherNameBn || undefined,
      fatherName: studentForm.fatherNameBn || undefined,
      motherNameBn: studentForm.motherNameBn || undefined,
      motherName: studentForm.motherNameBn || undefined,
      dateOfBirth: studentForm.dateOfBirth || undefined,
      gender: studentForm.gender || undefined,
      religion: studentForm.religion || undefined,
      bloodGroup: studentForm.bloodGroup || undefined,
      guardianMobile: studentForm.guardianMobile || undefined,
      presentAddress: studentForm.presentAddress || undefined,
      permanentAddress: studentForm.permanentAddress || undefined,
      birthCertificateNumber: studentForm.birthCertificateNumber || undefined,
      admissionDate: studentForm.admissionDate || undefined,
      previousInstitution: studentForm.previousInstitution || undefined,
    };
  }

  async function submitStudent(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingStudent) {
        await apiPatch(`/api/backend/people/students/${editingStudent.id}`, { value: studentPayload() }, "শিক্ষার্থী হালনাগাদ করা যায়নি");
        toast.success("শিক্ষার্থীর তথ্য হালনাগাদ হয়েছে");
        setEditingStudent(null);
      } else {
        const payload = await apiPost<{ data?: Row }>("/api/backend/people/students", { value: studentPayload() }, "শিক্ষার্থী তৈরি করা যায়নি");
        toast.success(
          payload.data?.registrationNumber
            ? `শিক্ষার্থী তৈরি হয়েছে — রেজিস্ট্রেশন নম্বর: ${String(payload.data.registrationNumber)}`
            : "শিক্ষার্থী তৈরি হয়েছে",
        );
      }
      setStudentForm(emptyStudent);
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি");
    }
  }

  function startEditStudent(row: Row) {
    setEditingStudent(row);
    setStudentForm({
      displayNameBn: String(row.displayNameBn ?? row.nameBn ?? ""),
      nameEn: String(row.nameEn ?? ""),
      sessionId: String(row.sessionId ?? ""),
      classId: String(row.classId ?? ""),
      sectionId: String(row.sectionId ?? ""),
      roll: row.roll === null || row.roll === undefined ? "" : String(row.roll),
      fatherNameBn: String(row.fatherNameBn ?? row.fatherName ?? ""),
      motherNameBn: String(row.motherNameBn ?? row.motherName ?? ""),
      dateOfBirth: String(row.dateOfBirth ?? "").slice(0, 10),
      gender: String(row.gender ?? ""),
      religion: String(row.religion ?? ""),
      bloodGroup: String(row.bloodGroup ?? ""),
      guardianMobile: String(row.guardianMobile ?? ""),
      presentAddress: String(row.presentAddress ?? ""),
      permanentAddress: String(row.permanentAddress ?? ""),
      birthCertificateNumber: String(row.birthCertificateNumber ?? ""),
      admissionDate: String(row.admissionDate ?? "").slice(0, 10),
      previousInstitution: String(row.previousInstitution ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitTeacher(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = await apiPost<{ data?: Row }>(
        "/api/backend/people/teachers",
        {
          value: {
            displayNameBn: teacherForm.displayNameBn,
            designation: teacherForm.designation,
            mobile: teacherForm.mobile || undefined,
            email: teacherForm.email || undefined,
            qualification: teacherForm.qualification || undefined,
            joiningDate: teacherForm.joiningDate || undefined,
            // The field is labelled টাকা but the backend stores integer
            // paisa — convert at submit so the two units never mix.
            monthlySalary: teacherForm.monthlySalary ? takaToPaisa(Number(teacherForm.monthlySalary)) : undefined,
          },
        },
        "শিক্ষক তৈরি করা যায়নি",
      );
      toast.success("শিক্ষক তৈরি হয়েছে");
      if (payload.data?.username || payload.data?.temporaryPassword) {
        setIssuedLogin({
          username: payload.data.username ? String(payload.data.username) : undefined,
          temporaryPassword: payload.data.temporaryPassword ? String(payload.data.temporaryPassword) : undefined,
        });
      }
      setTeacherForm(emptyTeacher);
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি");
    }
  }

  async function submitStaff(event: FormEvent) {
    event.preventDefault();
    try {
      await apiPost("/api/backend/people/staff", { value: staffForm }, "কর্মচারী তৈরি করা যায়নি");
      toast.success("কর্মচারী তৈরি হয়েছে");
      setStaffForm(emptyStaff);
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি");
    }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault();
    try {
      await apiPost(
        "/api/backend/people/subjectAssignments",
        { value: { ...assignmentForm, sectionId: assignmentForm.sectionId || undefined } },
        "বিষয় বরাদ্দ তৈরি করা যায়নি",
      );
      toast.success("বিষয় বরাদ্দ তৈরি হয়েছে");
      setAssignmentForm(emptyAssignment);
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি");
    }
  }

  const tabLabel = tabs.find(([key]) => key === tab)?.[1] ?? "";
  const visibleRows = (rows ?? []).filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
  );
  const activeCount = (rows ?? []).filter((row) => row.isActive !== false).length;

  return (
    <div className="dstack">
      <div className="chead" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="rowflex" style={{ gap: 9 }}>
            <span className="ic-wrap" style={{ width: 38, height: 38, flexBasis: 38 }}>
              <Users className="ic" />
            </span>
            <div>
              <h2 className="dpage-title">{tabLabel} ব্যবস্থাপনা</h2>
              <p className="cs">প্রোফাইল, শ্রেণি ও একাডেমিক তথ্য পরিচালনা করুন</p>
            </div>
          </div>
        </div>
        <span className="sp" />
        <Link className="btn gho sm" href="/people/import">
          <Download className="ic" data-icon="inline-start" /> ইমপোর্ট
        </Link>
        <Link className="btn gho sm" href="/people/promotion">
          প্রমোশন
        </Link>
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <Button className={tab === key ? "on" : ""} variant="ghost" size="sm" key={key} onClick={() => { setTab(key); setProfile(null); setEditingStudent(null); }} type="button">
            {label}
          </Button>
        ))}
      </div>

      <div className="g3">
        {rows === null ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="card stat"><div><div className="v num">{rows.length}</div><div className="l">মোট {tabLabel}</div></div><div className="ic-wrap"><Users className="ic lg" /></div></div>
            <div className="card stat"><div><div className="v num">{activeCount}</div><div className="l">সক্রিয় {tabLabel}</div></div><div className="ic-wrap g"><Users className="ic lg" /></div></div>
            <div className="card stat"><div><div className="v num">{rows.length - activeCount}</div><div className="l">নিষ্ক্রিয় {tabLabel}</div></div><div className="ic-wrap r"><Users className="ic lg" /></div></div>
          </>
        )}
      </div>

      {tab === "students" && (
        <div className="card">
          <div className="chead">
            <div>
              <h3 className="ct">{editingStudent ? "শিক্ষার্থী সম্পাদনা" : "নতুন শিক্ষার্থী যোগ করুন"}</h3>
              <p className="cs">সব তথ্য পূরণ করুন — প্রতিটি ফিল্ডই প্রোফাইলে সংরক্ষিত হবে</p>
            </div>
            {editingStudent && (
              <Button type="button" variant="outline" className="btn gho sm" onClick={() => { setEditingStudent(null); setStudentForm(emptyStudent); }}>
                <X className="ic" data-icon="inline-start" /> বাতিল
              </Button>
            )}
          </div>
          <form onSubmit={submitStudent} className="grid gap-3 md:grid-cols-3">
            <Field label="নাম (বাংলা)" required>
              <Input className="inp" value={studentForm.displayNameBn} onChange={(e) => setStudentForm({ ...studentForm, displayNameBn: e.target.value })} required />
            </Field>
            <Field label="নাম (ইংরেজি)">
              <Input className="inp" value={studentForm.nameEn} onChange={(e) => setStudentForm({ ...studentForm, nameEn: e.target.value })} />
            </Field>
            <Field label="রোল">
              <Input className="inp" type="number" min="1" value={studentForm.roll} onChange={(e) => setStudentForm({ ...studentForm, roll: e.target.value })} />
            </Field>
            <Field label="সেশন" required>
              <Select className="sel" value={studentForm.sessionId} onChange={(e) => setStudentForm({ ...studentForm, sessionId: e.target.value })} required>
                <option value="">নির্বাচন করুন</option>
                {sessions.map((row) => (<option key={row.id} value={row.id}>{String(row.name ?? row.year ?? row.id)}</option>))}
              </Select>
            </Field>
            <Field label="শ্রেণি" required>
              <Select className="sel" value={studentForm.classId} onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })} required>
                <option value="">নির্বাচন করুন</option>
                {classes.map((row) => (<option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>))}
              </Select>
            </Field>
            <Field label="শাখা">
              <Select className="sel" value={studentForm.sectionId} onChange={(e) => setStudentForm({ ...studentForm, sectionId: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                {sections.filter((row) => !studentForm.classId || String(row.classId ?? "") === studentForm.classId || !row.classId).map((row) => (<option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>))}
              </Select>
            </Field>
            <Field label="পিতার নাম">
              <Input className="inp" value={studentForm.fatherNameBn} onChange={(e) => setStudentForm({ ...studentForm, fatherNameBn: e.target.value })} />
            </Field>
            <Field label="মাতার নাম">
              <Input className="inp" value={studentForm.motherNameBn} onChange={(e) => setStudentForm({ ...studentForm, motherNameBn: e.target.value })} />
            </Field>
            <Field label="অভিভাবকের মোবাইল">
              <Input className="inp" value={studentForm.guardianMobile} onChange={(e) => setStudentForm({ ...studentForm, guardianMobile: e.target.value })} />
            </Field>
            <Field label="জন্ম তারিখ">
              <Input className="inp" type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="লিঙ্গ">
              <Select className="sel" value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                <option value="ছেলে">ছেলে</option>
                <option value="মেয়ে">মেয়ে</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </Select>
            </Field>
            <Field label="ধর্ম">
              <Select className="sel" value={studentForm.religion} onChange={(e) => setStudentForm({ ...studentForm, religion: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                <option value="ইসলাম">ইসলাম</option>
                <option value="হিন্দু">হিন্দু</option>
                <option value="বৌদ্ধ">বৌদ্ধ</option>
                <option value="খ্রিস্টান">খ্রিস্টান</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </Select>
            </Field>
            <Field label="রক্তের গ্রুপ">
              <Select className="sel" value={studentForm.bloodGroup} onChange={(e) => setStudentForm({ ...studentForm, bloodGroup: e.target.value })}>
                <option value="">নির্বাচন করুন</option>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((group) => (<option key={group} value={group}>{group}</option>))}
              </Select>
            </Field>
            <Field label="জন্ম নিবন্ধন নম্বর">
              <Input className="inp" value={studentForm.birthCertificateNumber} onChange={(e) => setStudentForm({ ...studentForm, birthCertificateNumber: e.target.value })} />
            </Field>
            <Field label="ভর্তির তারিখ">
              <Input className="inp" type="date" value={studentForm.admissionDate} onChange={(e) => setStudentForm({ ...studentForm, admissionDate: e.target.value })} />
            </Field>
            <Field label="পূর্ববর্তী প্রতিষ্ঠান">
              <Input className="inp" value={studentForm.previousInstitution} onChange={(e) => setStudentForm({ ...studentForm, previousInstitution: e.target.value })} />
            </Field>
            <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
              <Field label="বর্তমান ঠিকানা">
                <Textarea className="inp" rows={2} value={studentForm.presentAddress} onChange={(e) => setStudentForm({ ...studentForm, presentAddress: e.target.value })} />
              </Field>
              <Field label="স্থায়ী ঠিকানা">
                <Textarea className="inp" rows={2} value={studentForm.permanentAddress} onChange={(e) => setStudentForm({ ...studentForm, permanentAddress: e.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Button type="submit" className="btn">
                <Plus className="ic" data-icon="inline-start" /> {editingStudent ? "হালনাগাদ করুন" : "শিক্ষার্থী যোগ করুন"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === "teachers" && (
        <div className="card">
          <div className="chead"><div><h3 className="ct">নতুন শিক্ষক যোগ করুন</h3><p className="cs">তৈরি হলে সিস্টেম ইউজারনেম ও অস্থায়ী পাসওয়ার্ড দেবে</p></div></div>
          <form onSubmit={submitTeacher} className="grid gap-3 md:grid-cols-3">
            <Field label="নাম (বাংলা)" required>
              <Input className="inp" value={teacherForm.displayNameBn} onChange={(e) => setTeacherForm({ ...teacherForm, displayNameBn: e.target.value })} required />
            </Field>
            <Field label="পদবি">
              <Input className="inp" value={teacherForm.designation} onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })} />
            </Field>
            <Field label="মোবাইল">
              <Input className="inp" value={teacherForm.mobile} onChange={(e) => setTeacherForm({ ...teacherForm, mobile: e.target.value })} />
            </Field>
            <Field label="ইমেইল">
              <Input className="inp" type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} />
            </Field>
            <Field label="যোগ্যতা">
              <Input className="inp" value={teacherForm.qualification} onChange={(e) => setTeacherForm({ ...teacherForm, qualification: e.target.value })} />
            </Field>
            <Field label="যোগদানের তারিখ">
              <Input className="inp" type="date" value={teacherForm.joiningDate} onChange={(e) => setTeacherForm({ ...teacherForm, joiningDate: e.target.value })} />
            </Field>
            <Field label="মাসিক বেতন (টাকা)">
              <Input className="inp" type="number" min="0" value={teacherForm.monthlySalary} onChange={(e) => setTeacherForm({ ...teacherForm, monthlySalary: e.target.value })} />
            </Field>
            <div className="md:col-span-3">
              <Button type="submit" className="btn"><Plus className="ic" data-icon="inline-start" /> শিক্ষক যোগ করুন</Button>
            </div>
          </form>
          {issuedLogin && (
            <p className="alert g" style={{ marginTop: 12 }}>
              লগইন তথ্য — ইউজারনেম: <b className="num">{issuedLogin.username ?? "—"}</b>
              {issuedLogin.temporaryPassword && (
                <> · অস্থায়ী পাসওয়ার্ড: <b className="num">{issuedLogin.temporaryPassword}</b> (শিক্ষককে জানিয়ে দিন; পরে দেখা যাবে না)</>
              )}
            </p>
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="card">
          <div className="chead"><div><h3 className="ct">নতুন কর্মচারী যোগ করুন</h3></div></div>
          <form onSubmit={submitStaff} className="rowflex">
            <Input className="inp" style={{ flex: 1, minWidth: 180 }} placeholder="নাম" value={staffForm.nameBn} onChange={(e) => setStaffForm({ ...staffForm, nameBn: e.target.value })} required />
            <Input className="inp" style={{ flex: 1, minWidth: 160 }} placeholder="পদবি" value={staffForm.designation} onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })} required />
            <Input className="inp" style={{ flex: 1, minWidth: 160 }} placeholder="মোবাইল" value={staffForm.mobile} onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })} />
            <Button type="submit" className="btn"><Plus className="ic" data-icon="inline-start" /> যোগ করুন</Button>
          </form>
        </div>
      )}

      {tab === "subjectAssignments" && (
        <div className="card">
          <div className="chead"><div><h3 className="ct">নতুন বিষয় বরাদ্দ</h3></div></div>
          <form onSubmit={submitAssignment} className="rowflex">
            <Select className="sel" style={{ flex: 1, minWidth: 180 }} value={assignmentForm.teacherId} onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })} required>
              <option value="">শিক্ষক নির্বাচন</option>
              {teachers.map((row) => (<option key={row.id} value={row.id}>{String(row.displayNameBn ?? row.nameBn ?? row.teacherCode ?? row.id)}</option>))}
            </Select>
            <Select className="sel" style={{ flex: 1, minWidth: 160 }} value={assignmentForm.subjectId} onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })} required>
              <option value="">বিষয় নির্বাচন</option>
              {subjects.map((row) => (<option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>))}
            </Select>
            <Select className="sel" style={{ flex: 1, minWidth: 140 }} value={assignmentForm.classId} onChange={(e) => setAssignmentForm({ ...assignmentForm, classId: e.target.value })} required>
              <option value="">শ্রেণি নির্বাচন</option>
              {classes.map((row) => (<option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>))}
            </Select>
            <Select className="sel" style={{ flex: 1, minWidth: 140 }} value={assignmentForm.sectionId} onChange={(e) => setAssignmentForm({ ...assignmentForm, sectionId: e.target.value })}>
              <option value="">শাখা (ঐচ্ছিক)</option>
              {sections.map((row) => (<option key={row.id} value={row.id}>{String(row.nameBn ?? row.id)}</option>))}
            </Select>
            <Button type="submit" className="btn"><Plus className="ic" data-icon="inline-start" /> বরাদ্দ করুন</Button>
          </form>
        </div>
      )}

      {tab === "students" && profile && (
        <>
          <div className="card">
            <div className="chead" style={{ marginBottom: 0 }}>
              <div>
                <h3 className="ct">শিক্ষার্থীর প্রোফাইল — {rowName(profile)}</h3>
                <p className="cs">রেজিস্ট্রেশন নম্বর: {show(profile.registrationNumber)}</p>
              </div>
              <span className="sp" />
              <Button type="button" variant="outline" className="btn gho sm" onClick={() => setProfile(null)}>
                <X className="ic" data-icon="inline-start" /> বন্ধ করুন
              </Button>
            </div>
          </div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <Button type="button" variant="ghost" size="sm" className={profileTab === "info" ? "on" : ""} onClick={() => setProfileTab("info")}>তথ্য</Button>
            <Button type="button" variant="ghost" size="sm" className={profileTab === "results" ? "on" : ""} onClick={() => setProfileTab("results")}>ফলাফল</Button>
            <Button type="button" variant="ghost" size="sm" className={profileTab === "attendance" ? "on" : ""} onClick={() => setProfileTab("attendance")}>হাজিরা</Button>
            <Button type="button" variant="ghost" size="sm" className={profileTab === "fees" ? "on" : ""} onClick={() => setProfileTab("fees")}>ফি ও পেমেন্ট</Button>
          </div>
          {profileTab === "info" && (
          <div className="card">
          <dl className="admission-details">
            <ProfileRow label="নাম (বাংলা)" value={profile.displayNameBn ?? profile.nameBn} />
            <ProfileRow label="নাম (ইংরেজি)" value={profile.nameEn} />
            <ProfileRow label="শ্রেণি" value={profile.classNameBn} />
            <ProfileRow label="শাখা" value={profile.sectionNameBn} />
            <ProfileRow label="সেশন" value={profile.sessionName} />
            <ProfileRow label="রোল" value={profile.roll} />
            <ProfileRow label="পিতার নাম" value={profile.fatherNameBn ?? profile.fatherName} />
            <ProfileRow label="মাতার নাম" value={profile.motherNameBn ?? profile.motherName} />
            <ProfileRow label="জন্ম তারিখ" value={profile.dateOfBirth} />
            <ProfileRow label="লিঙ্গ" value={profile.gender} />
            <ProfileRow label="ধর্ম" value={profile.religion} />
            <ProfileRow label="রক্তের গ্রুপ" value={profile.bloodGroup} />
            <ProfileRow label="অভিভাবকের মোবাইল" value={profile.guardianMobile} />
            <ProfileRow label="জন্ম নিবন্ধন নম্বর" value={profile.birthCertificateNumber} />
            <ProfileRow label="ভর্তির তারিখ" value={profile.admissionDate} />
            <ProfileRow label="পূর্ববর্তী প্রতিষ্ঠান" value={profile.previousInstitution} />
            <ProfileRow label="বর্তমান ঠিকানা" value={profile.presentAddress} />
            <ProfileRow label="স্থায়ী ঠিকানা" value={profile.permanentAddress} />
          </dl>
          </div>
          )}
          {profileTab === "results" && resultsError && (
            <div className="card">
              <p className="alert r">{resultsError}</p>
              <Button type="button" variant="outline" className="btn gho sm" style={{ marginTop: 12 }} onClick={() => { if (resultsFor) void loadResults(resultsFor); }}>
                আবার চেষ্টা করুন
              </Button>
            </div>
          )}
          {profileTab === "results" && !resultsError && results === null && (
            <div className="card flush">
              <ListSkeleton rows={4} />
            </div>
          )}
          {profileTab === "results" && !resultsError && results !== null && results.length === 0 && (
            <div className="card">
              <p className="admin-empty">এই শিক্ষার্থীর কোনো ফলাফল এখনো তৈরি হয়নি।</p>
            </div>
          )}
          {profileTab === "results" && !resultsError && results !== null && results.map((entry) => {
            const hasCq = entry.subjects.some((s) => (s.cqMarks ?? 0) > 0);
            const hasMcq = entry.subjects.some((s) => (s.mcqMarks ?? 0) > 0);
            const hasPractical = entry.subjects.some((s) => (s.practicalMarks ?? 0) > 0);
            const expanded = expandedExam === entry.result.id;
            return (
              <div className="card flush" key={entry.result.id}>
                <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
                  <div>
                    <h3 className="ct">{entry.exam.nameBn ?? "পরীক্ষা"}</h3>
                    <p className="cs">
                      {entry.sessionName ?? ""}
                      {entry.result.meritPosition ? ` · মেধাক্রম: ${bnNum(entry.result.meritPosition)}` : ""}
                    </p>
                  </div>
                  <span className="sp" />
                  {entry.exam.isPublished === false && <span className="chip w">অপ্রকাশিত</span>}
                  <span className={`chip ${entry.result.isPassed ? "g" : "r"}`}>
                    {entry.result.isPassed ? "উত্তীর্ণ" : "অকৃতকার্য"}
                  </span>
                  <Badge variant="success">
                    GPA {bn(String(entry.result.gpa ?? "—"))} · {entry.result.letter ?? "—"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="btn gho sm"
                    onClick={() => setExpandedExam(expanded ? null : entry.result.id)}
                  >
                    {expanded ? "মার্কশিট লুকান" : "মার্কশিট দেখুন"}
                  </Button>
                </div>
                <div className="rowflex" style={{ padding: "0 18px 14px" }}>
                  <span className="cs">মোট নম্বর: <b className="num">{bnNum(Number(entry.result.totalMarks ?? 0))}</b></span>
                </div>
                {expanded && (
                  entry.subjects.length === 0 ? (
                    <p className="admin-empty" style={{ margin: "0 18px 18px" }}>এই পরীক্ষার বিষয়ভিত্তিক নম্বর পাওয়া যায়নি।</p>
                  ) : (
                    <div className="tw">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>বিষয়</th>
                            {hasCq && <th className="r">সৃজনশীল</th>}
                            {hasMcq && <th className="r">বহুনির্বাচনি</th>}
                            {hasPractical && <th className="r">ব্যবহারিক</th>}
                            <th className="r">মোট</th>
                            <th className="r">পূর্ণমান</th>
                            <th>গ্রেড</th>
                            <th className="r">GPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.subjects.map((subject, index) => (
                            <tr key={index}>
                              <td className="b">{subject.nameBn ?? "বিষয়"}</td>
                              {hasCq && <td className="r num">{subject.cq === null || subject.cq === undefined ? "—" : bnNum(subject.cq)}</td>}
                              {hasMcq && <td className="r num">{subject.mcq === null || subject.mcq === undefined ? "—" : bnNum(subject.mcq)}</td>}
                              {hasPractical && <td className="r num">{subject.practical === null || subject.practical === undefined ? "—" : bnNum(subject.practical)}</td>}
                              <td className="r num">
                                {subject.isAbsent ? <span className="chip r">অনুপস্থিত</span> : bnNum(Number(subject.totalMarks ?? 0))}
                              </td>
                              <td className="r num">{bnNum(Number(subject.fullMarks ?? 0))}</td>
                              <td>{subject.letter ?? "—"}</td>
                              <td className="r num">{bn(String(subject.gpa ?? "—"))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}
          {profileTab === "attendance" && attendanceError && (
            <div className="card">
              <p className="alert r">{attendanceError}</p>
              <Button type="button" variant="outline" className="btn gho sm" style={{ marginTop: 12 }} onClick={() => { if (attendanceFor) void loadAttendance(attendanceFor); }}>
                আবার চেষ্টা করুন
              </Button>
            </div>
          )}
          {profileTab === "attendance" && !attendanceError && attendance === null && (
            <>
              <div className="g4">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </div>
              <div className="card flush">
                <ListSkeleton rows={4} />
              </div>
            </>
          )}
          {profileTab === "attendance" && !attendanceError && attendance !== null && (
            <>
              <div className="card">
                <div className="chead" style={{ marginBottom: 0 }}>
                  <div>
                    <h3 className="ct">{monthLabel(attendance.month)}</h3>
                    <p className="cs">
                      উপস্থিতির হার: {bn(String(attendance.summary.percentage))}%
                      {attendance.overall.totalDays > 0
                        ? ` · সার্বিক: মোট ${bnNum(attendance.overall.totalDays)} দিন, হার ${bn(String(attendance.overall.percentage))}%`
                        : ""}
                    </p>
                  </div>
                  <span className="sp" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="btn gho sm"
                    disabled={attendance.months.indexOf(attendance.month) <= 0}
                    onClick={() => {
                      const idx = attendance.months.indexOf(attendance.month);
                      const next = attendance.months[idx - 1];
                      if (next && profile) void loadAttendance(profile.id, next);
                    }}
                  >
                    <ChevronLeft className="ic" data-icon="inline-start" /> পরের মাস
                  </Button>
                  <Select
                    className="sel"
                    style={{ width: 190 }}
                    value={attendance.month}
                    onChange={(e) => { if (profile) void loadAttendance(profile.id, e.target.value); }}
                  >
                    {attendance.months.length === 0 && (
                      <option value={attendance.month}>{monthLabel(attendance.month)}</option>
                    )}
                    {attendance.months.map((month) => (
                      <option key={month} value={month}>{monthLabel(month)}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="btn gho sm"
                    disabled={attendance.months.indexOf(attendance.month) < 0 || attendance.months.indexOf(attendance.month) >= attendance.months.length - 1}
                    onClick={() => {
                      const idx = attendance.months.indexOf(attendance.month);
                      const prev = attendance.months[idx + 1];
                      if (prev && profile) void loadAttendance(profile.id, prev);
                    }}
                  >
                    আগের মাস <ChevronRight className="ic" data-icon="inline-end" />
                  </Button>
                </div>
              </div>
              <div className="g4">
                <div className="card stat"><div><div className="v num">{bnNum(attendance.summary.totalDays)}</div><div className="l">মোট দিন</div></div></div>
                <div className="card stat"><div><div className="v num" style={{ color: "var(--green)" }}>{bnNum(attendance.summary.present)}</div><div className="l">উপস্থিত</div></div></div>
                <div className="card stat"><div><div className="v num" style={{ color: "var(--red, #c0392b)" }}>{bnNum(attendance.summary.absent)}</div><div className="l">অনুপস্থিত</div></div></div>
                <div className="card stat"><div><div className="v num" style={{ color: "var(--warn)" }}>{bnNum(attendance.summary.leave)}</div><div className="l">ছুটি</div></div></div>
              </div>
              <div className="card flush">
                <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
                  <div><h3 className="ct">দিনভিত্তিক হাজিরা</h3><p className="cs">{monthLabel(attendance.month)} মাসের রেকর্ড</p></div>
                  <span className="sp" />
                  <Badge variant="success">{attendance.records.length}টি রেকর্ড</Badge>
                </div>
                {attendance.records.length === 0 ? (
                  <p className="admin-empty" style={{ margin: "0 18px 18px" }}>এই মাসে কোনো হাজিরা রেকর্ড নেই।</p>
                ) : (
                  <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr><th>তারিখ</th><th>অবস্থা</th><th>মন্তব্য</th></tr>
                      </thead>
                      <tbody>
                        {attendance.records.map((record) => (
                          <tr key={record.date}>
                            <td className="num">{bn(record.date.slice(0, 10))}</td>
                            <td>{attendanceChip(record.status)}</td>
                            <td>{record.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          {profileTab === "fees" && statementError && (
            <div className="card">
              <p className="alert r">{statementError}</p>
              <Button type="button" variant="outline" className="btn gho sm" style={{ marginTop: 12 }} onClick={() => { if (statementFor) void loadStatement(statementFor); }}>
                আবার চেষ্টা করুন
              </Button>
            </div>
          )}
          {profileTab === "fees" && !statementError && statement === null && (
            <>
              <div className="g3">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </div>
              <div className="card flush">
                <ListSkeleton rows={4} />
              </div>
            </>
          )}
          {profileTab === "fees" && !statementError && statement !== null && (
            <>
              <div className="g3">
                <div className="card stat"><div><div className="v num">{formatTaka(statement.totals.totalAmount)}</div><div className="l">মোট ধার্য</div></div></div>
                <div className="card stat"><div><div className="v num" style={{ color: "var(--green)" }}>{formatTaka(statement.totals.totalPaid)}</div><div className="l">মোট পরিশোধিত</div></div></div>
                <div className="card stat"><div><div className="v num" style={statement.totals.totalDue > 0 ? { color: "var(--warn)" } : undefined}>{formatTaka(statement.totals.totalDue)}</div><div className="l">মোট বকেয়া</div></div></div>
              </div>
              <div className="card flush">
                <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
                  <div><h3 className="ct">ফি ইভেন্ট অনুযায়ী হিসাব</h3><p className="cs">এই শিক্ষার্থীর সব ফি বরাদ্দ</p></div>
                  <span className="sp" />
                  <Badge variant="success">{statement.assignments.length}টি রেকর্ড</Badge>
                  {(() => {
                    const firstDue = statement.assignments.find((row) => remainingOf(row) > 0);
                    return firstDue ? (
                      <Button type="button" className="btn grn sm" onClick={() => openPayment(firstDue)}>
                        পেমেন্ট নিন
                      </Button>
                    ) : null;
                  })()}
                </div>
                {statement.assignments.length === 0 ? (
                  <p className="admin-empty" style={{ margin: "0 18px 18px" }}>এই শিক্ষার্থীর কোনো ফি বরাদ্দ নেই।</p>
                ) : (
                  <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr><th>ফি ইভেন্ট</th><th>শেষ তারিখ</th><th className="r">ধার্য</th><th className="r">পরিশোধিত</th><th className="r">বাকি</th><th>অবস্থা</th><th className="r">অ্যাকশন</th></tr>
                      </thead>
                      <tbody>
                        {statement.assignments.map((row) => (
                          <tr key={row.id}>
                            <td className="b">{row.eventNameBn ?? "ফি ইভেন্ট"}</td>
                            <td className="num">{row.dueDate ? bn(String(row.dueDate).slice(0, 10)) : "—"}</td>
                            <td className="r num">{formatTaka(Number(row.amount))}</td>
                            <td className="r num">{formatTaka(Number(row.paidAmount))}</td>
                            <td className="r num">{formatTaka(row.remainingAmount !== undefined ? Number(row.remainingAmount) : Number(row.amount) - Number(row.paidAmount))}</td>
                            <td>{feeStatusChip(row.status)}</td>
                            <td className="r">
                              {remainingOf(row) > 0 ? (
                                <Button type="button" size="sm" className="btn sm" onClick={() => openPayment(row)}>
                                  পেমেন্ট নিন
                                </Button>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="card flush">
                <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
                  <div><h3 className="ct">পেমেন্ট ইতিহাস</h3><p className="cs">সব পেমেন্ট ও রশিদ নম্বর</p></div>
                  <span className="sp" />
                  <Badge variant="success">{statement.payments.length}টি পেমেন্ট</Badge>
                </div>
                {statement.payments.length === 0 ? (
                  <p className="admin-empty" style={{ margin: "0 18px 18px" }}>কোনো পেমেন্ট রেকর্ড নেই।</p>
                ) : (
                  <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr><th>তারিখ</th><th>ফি ইভেন্ট</th><th>মাধ্যম</th><th className="r">পরিমাণ</th><th>রশিদ নম্বর</th><th className="r">রশিদ</th></tr>
                      </thead>
                      <tbody>
                        {statement.payments.map((row) => (
                          <tr key={row.id}>
                            <td className="num">{row.paidAt ? bn(String(row.paidAt).slice(0, 10)) : "—"}</td>
                            <td>{row.eventNameBn ?? "ফি ইভেন্ট"}</td>
                            <td>{show(row.method)}</td>
                            <td className="r num">{formatTaka(Number(row.amount))}</td>
                            <td>{row.receiptNumber ? <span className="chip b num">{row.receiptNumber}</span> : "—"}</td>
                            <td className="r">
                              {row.receiptNumber ? (
                                <Button type="button" variant="outline" size="sm" className="btn gho sm" onClick={() => setReceiptModal(paymentReceiptData(row))}>
                                  <Printer className="ic" data-icon="inline-start" /> প্রিন্ট
                                </Button>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
          {payTarget && (
            <div className="modal-wrap" style={{ position: "fixed", zIndex: 120 }}>
              <div className="modal" role="dialog" aria-modal="true" aria-label="পেমেন্ট গ্রহণ">
                {!successReceipt ? (
                  <>
                    <div className="mhead">
                      <h3 className="ct" style={{ margin: 0 }}>পেমেন্ট গ্রহণ করুন</h3>
                      <span style={{ flex: 1 }} />
                      <Button type="button" variant="ghost" size="sm" className="btn gho sm" onClick={closePayment}>
                        <X className="ic" data-icon="inline-start" /> বন্ধ
                      </Button>
                    </div>
                    <p className="cs" style={{ margin: "0 0 12px" }}>
                      {rowName(profile)}
                      {profile.registrationNumber ? ` (${bn(String(profile.registrationNumber))})` : ""}
                      {" · "}
                      {payTarget.eventNameBn ?? "ফি ইভেন্ট"}
                      {" · "}বাকি {formatTaka(remainingOf(payTarget))}
                    </p>
                    <div className="fgrid">
                      <div>
                        <label className="lbl">পরিমাণ (টাকা) <span className="req">*</span></label>
                        <Input
                          className="inp num"
                          type="number"
                          min="0"
                          step="any"
                          value={payForm.amountTaka}
                          onChange={(e) => setPayForm({ ...payForm, amountTaka: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="lbl">মাধ্যম</label>
                        <Select className="sel" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="lbl">তারিখ</label>
                        <Input
                          className="inp"
                          type="date"
                          value={payForm.paidAt}
                          onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })}
                        />
                      </div>
                    </div>
                    {payError && <p className="alert r" style={{ marginTop: 12 }}>{payError}</p>}
                    <div className="rowflex" style={{ marginTop: 16 }}>
                      <Button type="button" className="btn grn" disabled={paying} onClick={() => void submitProfilePayment()}>
                        {paying ? "প্রক্রিয়াকরণ চলছে…" : "পেমেন্ট গ্রহণ করুন"}
                      </Button>
                      <Button type="button" className="btn gho" onClick={closePayment}>
                        বাতিল
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mhead">
                      <h3 className="ct" style={{ margin: 0 }}>পেমেন্ট সফল হয়েছে</h3>
                      <span style={{ flex: 1 }} />
                      <Button type="button" variant="ghost" size="sm" className="btn gho sm" onClick={closePayment}>
                        <X className="ic" data-icon="inline-start" /> বন্ধ
                      </Button>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <ReceiptView data={successReceipt} />
                    </div>
                    <div className="rowflex" style={{ marginTop: 16 }}>
                      <Button type="button" className="btn" onClick={() => printReceiptSheet()}>
                        <Printer className="ic" data-icon="inline-start" /> রশিদ প্রিন্ট করুন
                      </Button>
                      <Button type="button" className="btn gho" onClick={closePayment}>
                        বন্ধ করুন
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {receiptModal && (
            <div className="modal-wrap" style={{ position: "fixed", zIndex: 120 }}>
              <div className="modal" role="dialog" aria-modal="true" aria-label="রশিদ">
                <div className="mhead">
                  <h3 className="ct" style={{ margin: 0 }}>টাকা গ্রহণের রশিদ</h3>
                  <span style={{ flex: 1 }} />
                  <Button type="button" variant="ghost" size="sm" className="btn gho sm" onClick={() => setReceiptModal(null)}>
                    <X className="ic" data-icon="inline-start" /> বন্ধ
                  </Button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <ReceiptView data={receiptModal} />
                </div>
                <div className="rowflex" style={{ marginTop: 16 }}>
                  <Button type="button" className="btn" onClick={() => printReceiptSheet()}>
                    <Printer className="ic" data-icon="inline-start" /> প্রিন্ট করুন
                  </Button>
                  <Button type="button" className="btn gho" onClick={() => setReceiptModal(null)}>
                    বন্ধ করুন
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="card flush">
        <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
          <div><h3 className="ct">{tabLabel} তালিকা</h3><p className="cs">সকল নিবন্ধিত {tabLabel}র তথ্য</p></div>
          <span className="sp" />
          <div className="search" style={{ width: 220, position: "relative" }}>
            <Search className="ic" style={{ position: "absolute", left: 10, top: 9, color: "var(--sub)" }} />
            <Input className="inp" style={{ paddingLeft: 34, height: 36 }} placeholder="নাম খুঁজুন" aria-label="নাম খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {rows !== null && <Badge variant="success">{visibleRows.length}টি রেকর্ড</Badge>}
        </div>
        {rows === null ? (
          <ListSkeleton rows={5} />
        ) : visibleRows.length === 0 ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>কোনো রেকর্ড নেই।</p>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>নাম</th>
                  <th>পরিচিতি</th>
                  <th>অবস্থা</th>
                  <th className="r">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const name = rowName(row);
                  const sub =
                    tab === "students"
                      ? `${show(row.classNameBn)}${row.sectionNameBn ? ` · ${String(row.sectionNameBn)}` : ""} · রোল ${show(row.roll)} · রেজি ${show(row.registrationNumber)}`
                      : tab === "subjectAssignments"
                        ? `${show(row.subjectNameBn)} · ${show(row.classNameBn)}${row.sectionNameBn ? ` · ${String(row.sectionNameBn)}` : ""}`
                        : String(row.teacherCode ?? row.designation ?? row.mobile ?? "সক্রিয় রেকর্ড");
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="person">
                          <span className="av">{Array.from(name)[0]}</span>
                          <div>
                            <div className="nm">{name}</div>
                            <div className="ds">{sub}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{sub}</td>
                      <td>
                        <span className={`chip ${row.isActive === false ? "r" : "g"}`}>
                          {row.isActive === false ? "নিষ্ক্রিয়" : "সক্রিয়"}
                        </span>
                      </td>
                      <td className="r">
                        <div className="rowflex" style={{ justifyContent: "flex-end" }}>
                          {tab === "students" && (
                            <>
                              <Button type="button" variant="outline" size="sm" className="btn gho sm" onClick={() => openProfile(row)}>প্রোফাইল</Button>
                              <Button type="button" variant="outline" size="sm" className="btn gho sm" onClick={() => startEditStudent(row)}>সম্পাদনা</Button>
                            </>
                          )}
                          <DeleteButton
                            itemLabel={name}
                            size="sm"
                            onDelete={() => apiDelete(`/api/backend/people/${tab}/${row.id}`).then(() => undefined)}
                            onDeleted={loadRows}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="lbl">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function ProfileRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{show(value)}</dd>
    </div>
  );
}
