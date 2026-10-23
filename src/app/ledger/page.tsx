/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function LedgerPage() {
  const [report, setReport] = useState<{
    totals?: { income: number; expense: number; balance: number };
  } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  async function load() {
    const r = await fetch(`/api/backend/finance/ledger?from=${from}&to=${to}`);
    setReport(
      (await r.json()) as {
        totals?: { income: number; expense: number; balance: number };
      },
    );
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="dstack">
        <div className="chead">
          <div>
            <h2 className="dpage-title">আয়–ব্যয় রিপোর্ট</h2>
            <p className="cs">সময়সীমা অনুযায়ী মোট আয়, ব্যয় ও ব্যালেন্স।</p>
          </div>
        </div>
        <div className="card filterbar">
          <Input className="inp"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input className="inp"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Button className="btn" onClick={() => void load()}>রিপোর্ট</Button>
        </div>
        {report?.totals && (
          <div className="g3">
            <div className="card stat">
              <div>
                <div className="v num">৳ {report.totals.income}</div>
                <div className="l">মোট আয়</div>
              </div>
              <div className="ic-wrap g" />
            </div>
            <div className="card stat">
              <div>
                <div className="v num">৳ {report.totals.expense}</div>
                <div className="l">মোট ব্যয়</div>
              </div>
              <div className="ic-wrap w" />
            </div>
            <div className="card stat">
              <div>
                <div className="v num">৳ {report.totals.balance}</div>
                <div className="l">ব্যালেন্স</div>
              </div>
              <div className="ic-wrap" />
            </div>
          </div>
        )}
    </div>
  );
}
