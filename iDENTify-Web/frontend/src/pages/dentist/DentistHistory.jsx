import React, { useEffect, useMemo } from "react";
import useApi from "../../hooks/useApi";
import useAppStore from "../../store/useAppStore";
import History from "../aide/History";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveDentistId(user, dentists) {
  if (!user) return "__no-dentist-match__";
  if (user.dentist_id) return Number(user.dentist_id);

  const matched = (dentists || []).find((dentist) => {
    if (String(dentist.user_id || "") === String(user.id || "")) return true;
    if (normalizeEmail(dentist.email) && normalizeEmail(dentist.email) === normalizeEmail(user.email)) return true;
    if (dentist.name && user.name && String(dentist.name).trim() === String(user.name).trim()) return true;
    return false;
  });

  if (matched?.id) return Number(matched.id);
  return "__no-dentist-match__";
}

function DentistHistory() {
  const api = useApi();
  const user = useAppStore((state) => state.user);
  const dentists = useAppStore((state) => state.dentists || []);

  useEffect(() => {
    api.loadDentists().catch((error) => {
      console.error("Failed to load dentists for dentist history", error);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dentistId = useMemo(() => resolveDentistId(user, dentists), [user, dentists]);

  return <History pageTitle="My Patient History" forcedDentistId={dentistId} />;
}

export default DentistHistory;
