import { useEffect, useRef, useState } from "react";
import { emptyWorkspace, type Workspace } from "../domain/model";
import { IndexedDBRepository } from "./repository";

export function useWorkspace() {
  const [repository] = useState(() => new IndexedDBRepository());
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const current = useRef(workspace);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const failure = useRef("");
  const retryWithBackup = useRef(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef(0);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    repository
      .load()
      .then((value) => {
        if (active) {
          current.current = value;
          setWorkspace(value);
          setReady(true);
        }
      })
      .catch((error) => {
        if (active) setLoadError(String(error.message ?? error));
      });
    return () => {
      active = false;
      repository.close();
    };
  }, [repository]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pending.current || failure.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function persist(value: Workspace, backup: boolean) {
    pending.current += 1;
    setSaving(true);
    queue.current = queue.current
      .then(async () => {
        if (failure.current) return;
        try {
          await repository.save(value, backup);
          if (backup) retryWithBackup.current = false;
        } catch (error) {
          if (backup) retryWithBackup.current = true;
          failure.current =
            error instanceof Error ? error.message : "Could not save.";
          setSaveError(failure.current);
        }
      })
      .finally(() => {
        pending.current -= 1;
        if (!pending.current) setSaving(false);
      });
  }
  function commit(change: (value: Workspace) => Workspace, backup = false) {
    if (!ready) return;
    const next = change(current.current);
    current.current = next;
    setWorkspace(next);
    persist(next, backup);
  }
  function retry() {
    failure.current = "";
    setSaveError("");
    persist(current.current, retryWithBackup.current);
  }
  return {
    workspace,
    ready,
    loadError,
    saveError,
    saving,
    commit,
    retry,
    repository,
  };
}
