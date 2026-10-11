import { describe, expect, it } from "vitest";
import {
  addDays,
  dueCards,
  previewInterval,
  scheduleReview,
  studyStreak,
  type CardSchedule,
  type LanguageCard,
} from "../languageCards";

const fresh: CardSchedule = { due_on: "2026-10-11", interval_days: 0, ease: 2.5, reps: 0, lapses: 0 };

describe("addDays", () => {
  it("atravessa meses e anos", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("scheduleReview", () => {
  it("um cartão novo acertado volta amanhã, depois em 3 dias, depois cresce pela facilidade", () => {
    const first = scheduleReview(fresh, "easy", "2026-10-11");
    expect(first).toMatchObject({ due_on: "2026-10-12", interval_days: 1, reps: 1 });
    const second = scheduleReview(first, "easy", "2026-10-12");
    expect(second).toMatchObject({ due_on: "2026-10-15", interval_days: 3, reps: 2 });
    const third = scheduleReview(second, "easy", "2026-10-15");
    expect(third.interval_days).toBe(8);
  });

  it("errar traz o cartão para hoje, zera a sequência e reduz a facilidade", () => {
    const learned: CardSchedule = { due_on: "2026-10-11", interval_days: 10, ease: 2.5, reps: 4, lapses: 0 };
    expect(scheduleReview(learned, "again", "2026-10-11")).toEqual({
      due_on: "2026-10-11",
      interval_days: 0,
      ease: 2.3,
      reps: 0,
      lapses: 1,
    });
  });

  it("difícil cresce devagar e nunca deixa a facilidade abaixo do mínimo", () => {
    const hard = scheduleReview({ ...fresh, interval_days: 10, reps: 3, ease: 1.35 }, "hard", "2026-10-11");
    expect(hard.interval_days).toBe(12);
    expect(hard.ease).toBe(1.3);
  });
});

describe("previewInterval", () => {
  it("descreve a próxima revisão", () => {
    expect(previewInterval(fresh, "again")).toBe("agora");
    expect(previewInterval(fresh, "easy")).toBe("1 dia");
    expect(previewInterval({ ...fresh, interval_days: 40, reps: 5 }, "easy")).toBe("3 meses");
  });
});

describe("dueCards", () => {
  it("só os vencidos, os mais atrasados primeiro", () => {
    const card = (id: string, due_on: string) => ({ id, due_on, created_at: "2026-10-01T00:00:00Z" }) as LanguageCard;
    const due = dueCards([card("a", "2026-10-11"), card("b", "2026-10-12"), card("c", "2026-10-09")], "2026-10-11");
    expect(due.map((item) => item.id)).toEqual(["c", "a"]);
  });
});

describe("studyStreak", () => {
  const day = (d: string, reviewed = 1, duolingo = false) => ({ lang: "de", day: d, reviewed, duolingo });

  it("conta dias seguidos até hoje, valendo revisão ou Duolingo", () => {
    expect(studyStreak([day("2026-10-11"), day("2026-10-10", 0, true), day("2026-10-09"), day("2026-10-07")], "2026-10-11")).toBe(3);
  });

  it("não zera de manhã enquanto hoje ainda não foi feito", () => {
    expect(studyStreak([day("2026-10-10"), day("2026-10-09")], "2026-10-11")).toBe(2);
  });

  it("um dia sem estudo quebra a sequência", () => {
    expect(studyStreak([day("2026-10-09"), day("2026-10-11", 0)], "2026-10-11")).toBe(0);
  });
});
