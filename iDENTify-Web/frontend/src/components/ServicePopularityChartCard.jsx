import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../api/apiClient";
import WeeklyBarChart from "./WeeklyBarChart";

function toDateParam(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDefaultRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 29);

  return {
    startDate: toDateParam(start),
    endDate: toDateParam(end),
  };
}

function formatRangeLabel(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} to ${endDate}`;
  }

  return `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
}

function truncateServiceLabel(label, maxLength = 24) {
  const normalized = String(label || "").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function ServicePopularityChartCard({
  title = "Most Booked Services",
  dentistId = null,
  maxServices = 8,
}) {
  const [range, setRange] = useState(() => getDefaultRange());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [services, setServices] = useState([]);
  const [totals, setTotals] = useState({ appointments: 0, walkIns: 0, overall: 0 });

  useEffect(() => {
    let cancelled = false;

    const loadServicePopularity = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiClient.getServicePopularityReport({
          startDate: range.startDate,
          endDate: range.endDate,
          dentistId,
        });

        if (cancelled) return;

        setServices(response?.services || []);
        setTotals(response?.totals || { appointments: 0, walkIns: 0, overall: 0 });
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError?.message || "Failed to load service popularity data.");
        setServices([]);
        setTotals({ appointments: 0, walkIns: 0, overall: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadServicePopularity();

    return () => {
      cancelled = true;
    };
  }, [range.startDate, range.endDate, dentistId]);

  const topServices = useMemo(() => {
    return (services || []).slice(0, maxServices);
  }, [services, maxServices]);

  const chartData = useMemo(() => {
    return {
      labels: topServices.map((row) => truncateServiceLabel(row.service, 28)),
      checkups: topServices.map((row) => Number(row.walkInCount || 0)),
      checkupsLabel: "Walk-Ins",
      appointments: topServices.map((row) => Number(row.appointmentCount || 0)),
      appointmentsLabel: "Appointments",
      singleSeries: false,
      showLegend: true,
      xTickFontSize: 12,
      yTickFontSize: 12,
      xTickMaxRotation: 20,
      xTickMinRotation: 0,
    };
  }, [topServices]);

  const handleStartDateChange = (value) => {
    setRange((prev) => {
      const startDate = value || prev.startDate;
      const endDate = prev.endDate < startDate ? startDate : prev.endDate;
      return { startDate, endDate };
    });
  };

  const handleEndDateChange = (value) => {
    setRange((prev) => {
      const endDate = value || prev.endDate;
      const startDate = prev.startDate > endDate ? endDate : prev.startDate;
      return { startDate, endDate };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
            Completed appointments and walk-ins by service
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "#475569" }}>
            Start date
            <input
              type="date"
              value={range.startDate}
              max={range.endDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem", color: "#475569" }}>
            End date
            <input
              type="date"
              value={range.endDate}
              min={range.startDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
          Range: {formatRangeLabel(range.startDate, range.endDate)}
        </p>
        <p style={{ margin: 0, color: "#0f172a", fontSize: "0.85rem", fontWeight: 600 }}>
          Appointments: {totals.appointments || 0} | Walk-Ins: {totals.walkIns || 0}
        </p>
      </div>

      {loading ? <p style={{ margin: 0 }}>Loading service popularity...</p> : null}
      {!loading && error ? <p style={{ margin: 0, color: "#dc2626" }}>{error}</p> : null}

      {!loading && !error && topServices.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b" }}>
          No completed service records found for the selected range.
        </p>
      ) : null}

      {!loading && !error && topServices.length > 0 ? (
        <div style={{ minHeight: "320px" }}>
          <WeeklyBarChart chartData={chartData} />
        </div>
      ) : null}
    </div>
  );
}

export default ServicePopularityChartCard;
