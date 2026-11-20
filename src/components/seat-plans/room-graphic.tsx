"use client";
export type RoomLayout = { benches: number }[];
export type GraphicAssignment = {
  id?: string;
  seatNo?: number;
  benchRow: number;
  benchColumn: number;
  benchSlot?: number;
  name?: string | null;
  roll?: number | null;
  classNameBn?: string | null;
  groupName?: string | null;
};
export function RoomGraphic({
  layout,
  assignments = [],
  onBenchClick,
  highlightedStudentId,
}: {
  layout: RoomLayout;
  assignments?: GraphicAssignment[];
  onBenchClick?: (assignment?: GraphicAssignment) => void;
  highlightedStudentId?: string;
}) {
  return (
    <div className="flex min-h-24 w-full flex-col gap-1 overflow-x-auto rounded-[var(--radius)] border border-border bg-muted p-1">
      <div className="rounded border border-primary px-1 py-0.5 text-center text-[10px] font-bold text-primary">
        বোর্ড / শিক্ষকের দিক
      </div>
      {layout.map((row, rowIndex) => (
        <div className="flex min-w-0 items-stretch gap-1" key={rowIndex}>
          <span className="w-10 shrink-0 self-center text-[10px] text-muted-foreground">
            সারি {rowIndex + 1}
          </span>
          {Array.from({ length: row.benches }, (_, benchIndex) => {
            const seats = assignments.filter(
              (a) =>
                a.benchRow === rowIndex + 1 && a.benchColumn === benchIndex + 1,
            );
            return (
              <button
                type="button"
                className={`flex min-h-10 min-w-0 flex-1 flex-col justify-center gap-px rounded border bg-background p-1 text-left text-[9px] text-foreground ${seats.some((a) => a.id === highlightedStudentId) ? "border-primary ring-2 ring-ring" : "border-border"}`}
                key={benchIndex}
                onClick={() => onBenchClick?.(seats[0])}
              >
                <span className="text-[11px] text-muted-foreground">
                  বেঞ্চ {benchIndex + 1}
                </span>
                {seats.length ? (
                  seats.map((a) => (
                    <small key={`${a.id ?? a.seatNo}-${a.benchSlot}`}>
                      {a.seatNo ? `সিট ${a.seatNo} · ` : ""}
                      {a.name ?? ""}
                      {a.roll ? ` · রোল ${a.roll}` : ""}
                    </small>
                  ))
                ) : (
                  <small className="text-muted-foreground">খালি</small>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
