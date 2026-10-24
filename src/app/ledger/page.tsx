/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { ListSkeleton, StatSkeleton } from "@/components/ui/list-skeleton";
import { useToast } from "@/components/ui/toast";
import { apiDelete, apiGet } from "@/lib/admin-api";
import { formatTaka } from "@/lib/format";

type Entry = {
  id: string;
  type: string;
  amount: number;
  entryDate: string;
  description?: string;
  sourceType?: string | null;
};
type Report = {
  data?: Entry[];
  totals?: { income: number; expense: number; balance: number };
};

export default function LedgerPage() {
  const toast = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const payload = await apiGet<Report>(
        `/api/backend/finance/ledger?from=${from}&to=${to}`,
      );
      setReport(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "রিপোর্ট লোড করা যায়নি");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const entries = report?.data ?? [];

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
      {loading ? (
        <div className="g3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : report?.totals ? (
        <div className="g3">
          <div className="card stat">
            <div>
              <div className="v num">{formatTaka(report.totals.income)}</div>
              <div className="l">মোট আয়</div>
            </div>
            <div className="ic-wrap g" />
          </div>
          <div className="card stat">
            <div>
              <div className="v num">{formatTaka(report.totals.expense)}</div>
              <div className="l">মোট ব্যয়</div>
            </div>
            <div className="ic-wrap w" />
          </div>
          <div className="card stat">
            <div>
              <div className="v num">{formatTaka(report.totals.balance)}</div>
              <div className="l">ব্যালেন্স</div>
            </div>
            <div className="ic-wrap" />
          </div>
        </div>
      ) : null}
      <div className="card flush">
        <div className="chead" style={{ padding: "18px 18px 14px", marginBottom: 0 }}>
          <div>
            <h3 className="ct">লেনদেনের তালিকা</h3>
            <p className="cs">ফি সংগ্রহ ও বেতন পরিশোধ স্বয়ংক্রিয়ভাবে এখানে পোস্ট হয়</p>
          </div>
        </div>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : entries.length === 0 ? (
          <p className="admin-empty" style={{ margin: "0 18px 18px" }}>এই সময়সীমায় কোনো লেনদেন নেই।</p>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>বিবরণ</th>
                  <th>ধরন</th>
                  <th className="r">পরিমাণ</th>
                  <th className="r">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="num">{entry.entryDate}</td>
                    <td>{entry.description || "—"}</td>
                    <td>
                      <span className={`chip ${entry.type === "INCOME" ? "g" : "r"}`}>
                        {entry.type === "INCOME" ? "আয়" : "ব্যয়"}
                      </span>
                    </td>
                    <td className="r num">{formatTaka(entry.amount)}</td>
                    <td className="r">
                      <DeleteButton
                        itemLabel={entry.description || "লেজার এন্ট্রি"}
                        onDelete={() =>
                          apiDelete(`/api/backend/finance/ledger/${entry.id}`).then(() => undefined)
                        }
                        onDeleted={load}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
