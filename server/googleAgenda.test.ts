import { describe, expect, it } from "vitest";
import { eventBody, normalizeEvent, parseCookies, seal, shiftDate, signState, unseal, verifyState } from "./googleAgenda";

describe("cifra do refresh token", () => {
  it("abre só com o mesmo segredo e recusa conteúdo adulterado", () => {
    const sealed = seal("1//refresh-token", "segredo");
    expect(sealed).not.toContain("refresh-token");
    expect(unseal(sealed, "segredo")).toBe("1//refresh-token");
    expect(unseal(sealed, "outro")).toBeNull();
    expect(unseal(`${sealed.slice(0, -2)}xx`, "segredo")).toBeNull();
    expect(unseal("lixo", "segredo")).toBeNull();
  });

  it("assina o state do OAuth", () => {
    const state = signState({ nonce: "abc", exp: 1 }, "segredo");
    expect(verifyState(state, "segredo")).toEqual({ nonce: "abc", exp: 1 });
    expect(verifyState(state, "outro")).toBeNull();
    expect(verifyState(`${state}x`, "segredo")).toBeNull();
  });

  it("lê cookies", () => {
    expect(parseCookies("a=1; painel_google=x%2Fy; b")).toEqual({ a: "1", painel_google: "x/y" });
    expect(parseCookies()).toEqual({});
  });
});

describe("eventos do Google", () => {
  it("converte eventos com horário para São Paulo", () => {
    const [event] = normalizeEvent(
      { id: "e1", summary: "Reunião", location: "Lab 2", start: { dateTime: "2026-10-12T12:00:00Z" }, end: { dateTime: "2026-10-12T13:30:00Z" } },
      "2026-10-11",
      "2026-10-18",
    );
    expect(event).toMatchObject({ id: "e1", title: "Reunião", day: "2026-10-12", allDay: false, start: "09:00", end: "10:30", place: "Lab 2" });
  });

  it("repete eventos de dia inteiro em cada dia, dentro da janela", () => {
    const items = normalizeEvent({ id: "v", summary: "Viagem", start: { date: "2026-10-10" }, end: { date: "2026-10-13" } }, "2026-10-11", "2026-10-18");
    expect(items.map((item) => item.day)).toEqual(["2026-10-11", "2026-10-12"]);
    expect(items.every((item) => item.allDay)).toBe(true);
  });

  it("ignora cancelados, recusados e fora da janela", () => {
    expect(normalizeEvent({ id: "c", status: "cancelled", start: { date: "2026-10-11" } }, "2026-10-11", "2026-10-11")).toEqual([]);
    expect(
      normalizeEvent(
        { id: "r", start: { dateTime: "2026-10-11T15:00:00Z" }, attendees: [{ self: true, responseStatus: "declined" }] },
        "2026-10-11",
        "2026-10-11",
      ),
    ).toEqual([]);
    expect(normalizeEvent({ id: "f", start: { dateTime: "2026-10-20T15:00:00Z" } }, "2026-10-11", "2026-10-18")).toEqual([]);
  });

  it("monta o corpo do novo compromisso", () => {
    expect(eventBody({ title: "Feriado", date: "2026-10-12" })).toMatchObject({ start: { date: "2026-10-12" }, end: { date: "2026-10-13" } });
    expect(eventBody({ title: "Aula", date: "2026-10-12", start: "09:30", end: "", location: "Sala 2" })).toMatchObject({
      summary: "Aula",
      location: "Sala 2",
      start: { dateTime: "2026-10-12T09:30:00", timeZone: "America/Sao_Paulo" },
      end: { dateTime: "2026-10-12T10:30:00" },
    });
    expect(eventBody({ title: "Plantão", date: "2026-10-12", start: "22:00", end: "02:00" }).end).toEqual({
      dateTime: "2026-10-13T02:00:00",
      timeZone: "America/Sao_Paulo",
    });
    expect(eventBody({ title: "Tarde", date: "2026-10-12", start: "23:30" }).end).toMatchObject({ dateTime: "2026-10-13T00:30:00" });
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
