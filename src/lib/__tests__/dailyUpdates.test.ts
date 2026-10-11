import { describe, expect, it } from "vitest";
import { monthGrid, parseAgenda, shiftDay, todayKey } from "../dailyUpdates";

describe("shiftDay", () => {
  it("atravessa meses e anos", () => {
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("todayKey", () => {
  it("usa o fuso de São Paulo", () => {
    expect(todayKey(new Date("2026-10-11T02:00:00Z"))).toBe("2026-10-10");
  });
});

describe("monthGrid", () => {
  it("começa no domingo e cobre o mês inteiro", () => {
    const weeks = monthGrid(2026, 10);
    // 1º de outubro de 2026 é uma quinta-feira.
    expect(weeks[0][0]).toEqual({ day: "2026-09-27", inMonth: false });
    expect(weeks[0][4]).toEqual({ day: "2026-10-01", inMonth: true });
    const days = weeks.flat().filter((cell) => cell.inMonth).map((cell) => cell.day);
    expect(days).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[weeks.length - 1].some((cell) => cell.day === "2026-10-31")).toBe(true);
  });
  it("não cria uma semana a mais quando o mês termina no sábado", () => {
    // Fevereiro de 2026 termina num sábado.
    const weeks = monthGrid(2026, 2);
    expect(weeks[weeks.length - 1][6].day).toBe("2026-02-28");
  });
  it("vira o ano em dezembro", () => {
    const weeks = monthGrid(2026, 12);
    expect(weeks.flat().filter((cell) => cell.inMonth)).toHaveLength(31);
  });
});

describe("parseAgenda", () => {
  it("lê horário, nome e local de cada linha", () => {
    const { events, notes } = parseAgenda(
      "- **Dia inteiro** · Entrega do relatório\n" +
        "- **09:00–10:00** · Reunião do grupo · Google Meet\n" +
        "- **9:30** · Café\n\n" +
        "Lembrete: levar o notebook.",
    );
    expect(events).toEqual([
      { time: "Dia inteiro", allDay: true, start: undefined, end: undefined, title: "Entrega do relatório", place: undefined },
      { time: "09:00–10:00", allDay: false, start: "09:00", end: "10:00", title: "Reunião do grupo", place: "Google Meet" },
      { time: "9:30", allDay: false, start: "09:30", end: undefined, title: "Café", place: undefined },
    ]);
    expect(notes).toBe("Lembrete: levar o notebook.");
  });
  it("devolve tudo como nota quando não há eventos", () => {
    expect(parseAgenda("Nenhum compromisso hoje.")).toEqual({ events: [], notes: "Nenhum compromisso hoje." });
  });
});
