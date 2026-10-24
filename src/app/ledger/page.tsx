/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bnDate, monthRange, takaLabel } from "@/lib/format";

type LedgerEntry = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  entryDate: string;
  description: string;
  sourceType?: string | null;
  sourceId?: string | null;
};
type LedgerPayload = {
  data?: LedgerEntry[];
  totals?: { income: number; expense: number; balance: number };
};

export default function LedgerPage() {
  const initial = monthRange();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [totals, setTotals] = useState<{ income: number; expense: number; balance: number } | null>(null);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loaded, setLoaded] = useState(false);

  async function load(activeFrom = from, activeTo = to) {
    const query = new URLSearchParams();
    if (activeFrom) query.set("from", activeFrom);
    if (activeTo) query.set("to", activeTo);
    const qs = query.toString();
    const response = await fetch(`/api/backend/finance/ledger${qs ? `?${qs}` : ""}`);
    const payload = (await response.json()) as LedgerPayload;
    const sorted = [...(payload.data ?? [])].sort((a, b) =>
      b.entryDate.localeCompare(a.entryDate),
    );
    setEntries(sorted);
    setTotals(payload.totals ?? { income: 0, expense: 0, balance: 0 });
    setLoaded(true);
  }

  useEffect(() => {
    const range = monthRange();
    setFrom(range.from);
    setTo(range.to);
    void load(range.from, range.to);
  }, []);

  return (
    <div className="dstack">
      <div className="chead">
        <div>
          <h2 className="dpage-title">আয়–ব্যয় খাতা</h2>
          <p className="cs">সময়সীমা অনুযায়ী মোট আয়, ব্যয় ও ব্যালেন্স — ফি আদায় ও বেতনের এন্ট্রি স্বয়ংক্রিয়ভাবে আসে।</p>
        </div>
      </div>

      <div className="card filterbar">
        <div className="fld">
          <label className="lbl">শুরুর তারিখ</label>
          <Input
            className="inp"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="fld">
          <label className="lbl">শেষ তারিখ</label>
          <Input
            className="inp"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button className="btn" onClick={() => void load()}>
          রিপোর্ট দেখুন
        </Button>
        <Button
          className="btn gho"
          onClick={() => {
            const range = monthRange();
            setFrom(range.from);
            setTo(range.to);
            void load(range.from, range.to);
          }}
        >
          এই মাস
        </Button>
      </div>

      {totals && (
        <div className="g3">
          <div className="card stat">
            <div>
              <div className="v num" style={{ color: "var(--green)" }}>
                {takaLabel(totals.income)}
              </div>
              <div className="l">মোট আয়</div>
            </div>
            <div className="ic-wrap g" />
          </div>
          <div className="card stat">
            <div>
              <div className="v num" style={{ color: "var(--red)" }}>
                {takaLabel(totals.expense)}
              </div>
              <div className="l">মোট ব্যয়</div>
            </div>
            <div className="ic-wrap r" />
          </div>
          <div className="card stat">
            <div>
              <div className="v num">{takaLabel(totals.balance)}</div>
              <div className="l">ব্যালেন্স (আয় − ব্যয়)</div>
            </div>
            <div className="ic-wrap" />
          </div>
        </div>
      )}

      <div className="card flush">
        <div className="chead" style={{ padding: "16px 18px 0" }}>
          <h3 className="ct">লেনদেনসমূহ</h3>
        </div>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>বিবরণ</th>
                <th>ধরন</th>
                <th className="r">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isIncome = entry.type === "INCOME";
                return (
                  <tr key={entry.id}>
                    <td className="num">{bnDate(entry.entryDate)}</td>
                    <td>{entry.description || "—"}</td>
                    <td>
                      {isIncome ? (
                        <span className="chip g">আয়</span>
                      ) : (
                        <span className="chip r">ব্যয়</span>
                      )}
                    </td>
                    <td
                      className="r num b"
                      style={{ color: isIncome ? "var(--green)" : "var(--red)" }}
                    >
                      {isIncome ? "+ " : "− "}
                      {takaLabel(entry.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loaded && !entries.length && (
          <div className="admin-empty">এই সময়সীমায় কোনো লেনদেন নেই।</div>
        )}
        <div className="hint" style={{ padding: "12px 18px 16px" }}>
          ফি আদায় ও শিক্ষক বেতনের এন্ট্রি স্বয়ংক্রিয়ভাবে তৈরি হয় — সেগুলো এখান
          থেকে বদলানো যায় না।
        </div>
      </div>
    </div>
  );
}
