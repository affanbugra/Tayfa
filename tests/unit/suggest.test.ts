import { describe, expect, it } from "vitest";
import { suggest, type SuggestInput } from "../../lib/matching/suggest";

const types = [
  { id: "bowling", name: "Bowling", order: 1 },
  { id: "havuz", name: "Havuz", order: 2 },
  { id: "foto", name: "Fotoğraf", order: 3 },
];
const teams = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bora" },
  { id: "c", name: "Cem" },
];

function base(over: Partial<SuggestInput> = {}): SuggestInput {
  return {
    weekStart: "2026-11-07",
    teams,
    types,
    history: {
      a: { bowling: { count: 2, last: "2026-10-24" }, havuz: { count: 1, last: "2026-10-10" }, foto: { count: 1, last: "2026-10-03" } },
      b: { bowling: { count: 1, last: "2026-10-17" }, foto: { count: 2, last: "2026-10-24" } },
      c: { bowling: { count: 1, last: "2026-10-03" }, havuz: { count: 1, last: "2026-10-17" } },
    },
    recent: { a: ["bowling"], b: ["foto"], c: ["havuz"] },
    capacity: { bowling: 2, havuz: 2, foto: 2 },
    fixed: {},
    ...over,
  };
}

describe("öneri algoritması", () => {
  it("hiç yapılmamış türe öncelik verir", () => {
    const r = suggest(base());
    expect(r.byTeam.b.pick?.typeId).toBe("havuz");
    expect(r.byTeam.b.pick?.reason).toBe("Havuz hiç yapılmadı");
    expect(r.byTeam.c.pick?.typeId).toBe("foto");
    expect(r.neverBefore).toBe(2);
    expect(r.neverAfter).toBe(0);
  });

  it("kontenjanı aşmaz", () => {
    const r = suggest(base({ capacity: { bowling: 1, havuz: 1, foto: 0 } }));
    const picks = Object.values(r.byTeam).map((t) => t.pick?.typeId).filter(Boolean);
    expect(picks.filter((p) => p === "foto")).toHaveLength(0);
    expect(picks.filter((p) => p === "havuz")).toHaveLength(1);
    expect(picks.filter((p) => p === "bowling")).toHaveLength(1);
    // Üçüncü ekibe yer kalmadı
    expect(Object.values(r.byTeam).filter((t) => !t.pick)).toHaveLength(1);
  });

  it("elle seçilenleri korur ve kontenjandan düşer", () => {
    const r = suggest(base({ fixed: { c: "havuz" }, capacity: { bowling: 2, havuz: 1, foto: 2 } }));
    expect(r.byTeam.c.pick).toBeNull();
    expect(r.byTeam.b.pick?.typeId).not.toBe("havuz");
  });

  it("son yapılanı tekrar önermez", () => {
    const r = suggest(base());
    expect(r.byTeam.a.pick?.typeId).not.toBe("bowling");
  });

  it("aynı girdiye aynı çıktı", () => {
    expect(suggest(base())).toEqual(suggest(base()));
  });
});
