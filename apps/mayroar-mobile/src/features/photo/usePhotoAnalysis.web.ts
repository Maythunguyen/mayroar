import { useEffect, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { addEntry, type Database } from "../../data/database";
import type { Meal } from "../../domain/nutrition";
import { analysePhoto } from "./api";
import { readPhoto } from "./readPhoto.web";
import { toDiaryFood, type Draft } from "./model";

type Status = "idle" | "reading" | "analysing" | "saving" | "saved";

export function usePhotoAnalysis(db: Database, day: string, initialMeal: Meal) {
  const [meal, setMeal] = useState(initialMeal);
  const [photo, setPhoto] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const saved = useRef(false);
  const busy = status !== "idle";

  useEffect(() => () => active.current?.abort(), []);

  async function run(next: "reading" | "analysing" | "saving", task: (signal: AbortSignal) => Promise<void>) {
    if (active.current || saved.current) return false;
    const controller = new AbortController();
    active.current = controller;
    setStatus(next); setError("");
    try {
      await task(controller.signal);
      return !controller.signal.aborted;
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      return false;
    } finally {
      if (!controller.signal.aborted) setStatus(saved.current ? "saved" : "idle");
      active.current = null;
    }
  }

  function choose(file?: File) {
    if (!file) return;
    return run("reading", async signal => {
      setDraft(null); setPhoto("");
      const image = await readPhoto(file, signal);
      if (!signal.aborted) setPhoto(image);
    });
  }

  function updateNotes(value: string) {
    if (active.current || saved.current) return;
    setNotes(value); setDraft(null); setError("");
  }

  function analyse() {
    if (!photo) return;
    return run("analysing", async signal => {
      setDraft(null);
      const request = new AbortController();
      const cancel = () => request.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 65000);
      try {
        const result = await analysePhoto(photo, notes, request.signal);
        if (!signal.aborted) setDraft(result);
      } catch (e) {
        if (request.signal.aborted) throw new Error("Analysis timed out. Try again.");
        throw e;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
      }
    });
  }

  function save() {
    if (!draft) return Promise.resolve(false);
    return run("saving", async () => {
      const { food, grams } = toDiaryFood(draft, randomUUID());
      await addEntry(db, day, meal, food, grams);
      saved.current = true;
    });
  }

  return { meal, setMeal, photo, notes, draft, setDraft, status, busy, error,
    choose, updateNotes, analyse, save };
}
