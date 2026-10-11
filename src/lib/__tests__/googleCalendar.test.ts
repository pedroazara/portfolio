import { describe, expect, it } from "vitest";
import { googleEventUrl } from "../googleCalendar";

const params = (url: string) => new URL(url).searchParams;

describe("googleEventUrl", () => {
  it("monta um evento com horário no fuso de São Paulo", () => {
    const url = googleEventUrl({ title: " Reunião ", date: "2026-10-12", start: "09:00", end: "10:30", location: "Lab 2" });
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    const query = params(url);
    expect(query.get("action")).toBe("TEMPLATE");
    expect(query.get("text")).toBe("Reunião");
    expect(query.get("dates")).toBe("20261012T090000/20261012T103000");
    expect(query.get("ctz")).toBe("America/Sao_Paulo");
    expect(query.get("location")).toBe("Lab 2");
    expect(query.has("details")).toBe(false);
  });
  it("sem fim, dura uma hora — e vira o dia se precisar", () => {
    expect(params(googleEventUrl({ title: "a", date: "2026-10-12", start: "14:15" })).get("dates")).toBe(
      "20261012T141500/20261012T151500",
    );
    expect(params(googleEventUrl({ title: "a", date: "2026-10-31", start: "23:30" })).get("dates")).toBe(
      "20261031T233000/20261101T003000",
    );
  });
  it("fim antes do início termina no dia seguinte", () => {
    expect(params(googleEventUrl({ title: "a", date: "2026-10-12", start: "23:00", end: "01:00" })).get("dates")).toBe(
      "20261012T230000/20261013T010000",
    );
  });
  it("sem horário é de dia inteiro", () => {
    expect(params(googleEventUrl({ title: "a", date: "2026-12-31" })).get("dates")).toBe("20261231/20270101");
  });
});
