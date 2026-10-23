"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Check, Edit3, Filter, Plus, Search, Settings2, Trash2, Users, WalletCards } from "lucide-react";

const configs: Record<string, { title: string; description: string; icon: typeof Users; columns: string[]; rows: string[][] }> = {
  settings: { title: "বিদ্যালয়ের সেটিংস", description: "প্রতিষ্ঠানের তথ্য, ব্র্যান্ডিং ও প্রকাশনা নিয়ন্ত্রণ করুন", icon: Settings2, columns: ["বিষয়", "বর্তমান তথ্য", "অবস্থা"], rows: [["প্রতিষ্ঠানের নাম", "আদর্শ মডেল উচ্চ বিদ্যালয়", "সক্রিয়"], ["EIIN নম্বর", "১২৩৪৫৬", "যাচাই করা"], ["ওয়েবসাইট", "সর্বসাধারণের জন্য প্রকাশিত", "চালু"]] },
  notices: { title: "বিজ্ঞপ্তি ব্যবস্থাপনা", description: "বিদ্যালয়ের সকল বিজ্ঞপ্তি তৈরি ও প্রকাশ করুন", icon: BarChart3, columns: ["শিরোনাম", "বিভাগ", "প্রকাশের তারিখ", "অবস্থা"], rows: [["অর্ধবার্ষিক পরীক্ষার সময়সূচি", "পরীক্ষা", "১২ অক্টোবর ২০২৬", "প্রকাশিত"], ["বার্ষিক ক্রীড়া প্রতিযোগিতা", "সাধারণ", "০৮ অক্টোবর ২০২৬", "খসড়া"], ["বেতন জমা দেওয়ার বিজ্ঞপ্তি", "প্রশাসন", "০২ অক্টোবর ২০২৬", "প্রকাশিত"]] },
  exams: { title: "পরীক্ষা ও মূল্যায়ন", description: "পরীক্ষার সময়সূচি, বিষয় ও ফলাফল পরিচালনা করুন", icon: BarChart3, columns: ["পরীক্ষার নাম", "শ্রেণি", "সময়কাল", "অবস্থা"], rows: [["অর্ধবার্ষিক পরীক্ষা ২০২৬", "ষষ্ঠ–দশম", "১৫–২৮ অক্টোবর", "চলমান"], ["সাপ্তাহিক মূল্যায়ন", "নবম", "০৫ অক্টোবর", "সম্পন্ন"]] },
  "fee-events": { title: "ফি ইভেন্ট", description: "শ্রেণিভিত্তিক ফি নির্ধারণ ও সংগ্রহের অগ্রগতি দেখুন", icon: WalletCards, columns: ["ফি ইভেন্ট", "প্রযোজ্য শ্রেণি", "পরিমাণ", "অগ্রগতি"], rows: [["মাসিক বেতন — অক্টোবর", "ষষ্ঠ–দশম", "৳ ১,২০০", "৭৮%"], ["পরীক্ষার ফি", "নবম–দশম", "৳ ৫০০", "৬৪%"], ["উন্নয়ন ফি", "সকল শ্রেণি", "৳ ২,০০০", "৪২%"]] },
  collection: { title: "ফি সংগ্রহ", description: "শিক্ষার্থীর বকেয়া দেখুন এবং পেমেন্ট গ্রহণ করুন", icon: WalletCards, columns: ["শিক্ষার্থী", "শ্রেণি", "বকেয়া", "অবস্থা", "কার্যক্রম"], rows: [["রাফি ইসলাম", "দশম–ক", "৳ ২,৪০০", "বকেয়া", "পেমেন্ট নিন"], ["মেহজাবিন আক্তার", "নবম–খ", "৳ ৬০০", "আংশিক", "পেমেন্ট নিন"], ["সুমাইয়া রহমান", "অষ্টম–ক", "৳ ০", "পরিশোধিত", "রসিদ দেখুন"]] },
  salary: { title: "শিক্ষক বেতন", description: "মাসিক বেতন, পরিশোধের অবস্থা ও হিসাব দেখুন", icon: WalletCards, columns: ["শিক্ষক", "পদবি", "মাস", "বেতন", "অবস্থা"], rows: [["মো. কামরুল হাসান", "সহকারী শিক্ষক", "অক্টোবর ২০২৬", "৳ ৩২,০০০", "পরিশোধিত"], ["ফারজানা ইয়াসমিন", "সিনিয়র শিক্ষক", "অক্টোবর ২০২৬", "৳ ৪৫,০০০", "বাকি"]] },
  ledger: { title: "আয়–ব্যয় হিসাব", description: "বিদ্যালয়ের আর্থিক লেনদেন ও মাসিক ব্যালেন্স পরিচালনা করুন", icon: WalletCards, columns: ["তারিখ", "বিবরণ", "বিভাগ", "আয়", "ব্যয়"], rows: [["১২ অক্টোবর", "মাসিক বেতন সংগ্রহ", "ফি", "৳ ৮৫,০০০", "—"], ["১০ অক্টোবর", "বিদ্যুৎ বিল", "পরিচালন", "—", "৳ ১২,৪০০"], ["০৮ অক্টোবর", "বেতন প্রদান", "বেতন", "—", "৳ ৩২,০০০"]] },
  admissions: { title: "ভর্তি আবেদন", description: "নতুন শিক্ষার্থীদের আবেদন যাচাই ও অনুমোদন করুন", icon: Users, columns: ["আবেদনকারী", "শ্রেণি", "অভিভাবকের মোবাইল", "আবেদনের তারিখ", "অবস্থা"], rows: [["তানভীর আহমেদ", "ষষ্ঠ", "০১৭১২৩৪৫৬৭৮", "১২ অক্টোবর ২০২৬", "পর্যালোচনাধীন"], ["নুসরাত জাহান", "নবম", "০১৮১২৩৪৫৬৭৮", "১০ অক্টোবর ২০২৬", "অনুমোদিত"], ["আরমান কবির", "সপ্তম", "০১৯১২৩৪৫৬৭৮", "০৮ অক্টোবর ২০২৬", "অপেক্ষমাণ"]] },
  inbox: { title: "ইনবক্স", description: "অভিযোগ, যোগাযোগ ও অভিভাবকদের বার্তা পরিচালনা করুন", icon: Users, columns: ["প্রেরক", "বিষয়", "তারিখ", "অবস্থা"], rows: [["সালমা আক্তার", "ছুটির আবেদন সম্পর্কে", "আজ, ১০:২৫", "নতুন"], ["মো. রাকিব", "ফি পরিশোধের রসিদ", "গতকাল", "উত্তর দেওয়া হয়েছে"]] },
};

const defaultConfig = { title: "শিক্ষার্থী তালিকা", description: "সকল শিক্ষার্থীর প্রোফাইল, শ্রেণি ও একাডেমিক তথ্য", icon: Users, columns: ["শিক্ষার্থী", "শ্রেণি ও শাখা", "অভিভাবক", "মোবাইল", "অবস্থা"], rows: [["রাফি ইসলাম", "দশম–ক", "মো. হাবিবুর রহমান", "০১৭১২৩৪৫৬৭৮", "সক্রিয়"], ["মেহজাবিন আক্তার", "নবম–খ", "সেলিম আক্তার", "০১৮১২৩৪৫৬৭৮", "সক্রিয়"], ["সুমাইয়া রহমান", "অষ্টম–ক", "রহমান আলী", "০১৯১২৩৪৫৬৭৮", "ছুটিতে"]] };

export function ScreenWorkspace({ screen }: { screen: string }) {
  const config = configs[screen] ?? defaultConfig;
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(true);
  const rows = useMemo(() => config.rows.filter((row) => row.join(" ").includes(query)), [config.rows, query]);
  const Icon = config.icon;
  return <div className="dstack screen-workspace">
    <section className="screen-hero">
      <div className="screen-hero-copy"><span className="screen-icon"><Icon className="ic lg" /></span><div><p className="eyebrow">অ্যাডমিন প্যানেল</p><h1 className="dpage-title">{config.title}</h1><p className="cs">{config.description}</p></div></div>
      <div className="screen-actions"><Button className="btn gho sm"><Filter className="ic" data-icon="inline-start" /> ফিল্টার</Button><Button className="btn sm"><Plus className="ic" data-icon="inline-start" /> নতুন যোগ করুন</Button></div>
    </section>
    <div className="g4 screen-stats"><div className="card stat"><div><div className="v num">১,২৪৮</div><div className="l">মোট রেকর্ড</div></div><div className="ic-wrap"><Users className="ic lg" /></div></div><div className="card stat"><div><div className="v num">১,১৮৬</div><div className="l">সক্রিয়</div></div><div className="ic-wrap g"><Check className="ic lg" /></div></div><div className="card stat"><div><div className="v num">৬২</div><div className="l">অপেক্ষমাণ</div></div><div className="ic-wrap w"><WalletCards className="ic lg" /></div></div><div className="card stat"><div><div className="v num">৯৪%</div><div className="l">সম্পন্নতা</div></div><div className="ic-wrap"><BarChart3 className="ic lg" /></div></div></div>
    <section className="card quick-controls"><div className="chead"><div><h2 className="ct">দ্রুত নিয়ন্ত্রণ</h2><p className="cs">এই স্ক্রিনের সাধারণ সেটিংস ও অনুসন্ধান</p></div><span className="sp" /><label className="rowflex small"><span>প্রকাশনা চালু</span><Switch checked={enabled} onCheckedChange={setEnabled} /></label></div><div className="workspace-search"><div className="search-field"><Search className="ic" /><Input className="inp" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="নাম, আইডি বা তথ্য খুঁজুন" /></div><Button className="btn gho"><Search className="ic" data-icon="inline-start" /> অনুসন্ধান</Button></div></section>
    <section className="card flush data-card"><div className="chead data-card-head"><div><h2 className="ct">{config.title}</h2><p className="cs">সর্বশেষ হালনাগাদ: আজ, সকাল ১০:৩০</p></div><span className="sp" /><Badge variant="success">{rows.length}টি রেকর্ড</Badge></div><div className="tw"><table className="tbl"><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th>কার্যক্রম</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cellIndex === row.length - 1 ? <span className={cell.includes("বাকি") || cell.includes("অপেক্ষ") || cell.includes("ছুটি") || cell.includes("নতুন") ? "chip w" : "chip g"}>{cell}</span> : cell}</td>)}<td><div className="rowflex"><Button variant="outline" size="sm"><Edit3 className="ic" data-icon="inline-start" /> দেখুন</Button><Button variant="outline" size="icon" aria-label="মুছুন"><Trash2 className="ic" /></Button></div></td></tr>)}</tbody></table></div></section>
  </div>;
}
