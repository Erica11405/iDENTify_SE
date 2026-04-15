import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/components/WeeklyBarChart.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function WeeklyBarChart({ chartData = null }) {
  const labels = chartData?.labels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const singleSeries = Boolean(chartData?.singleSeries);
  const showLegend = Boolean(chartData?.showLegend);

  const defaultCheckups = [5, 8, 3, 7, 6, 2, 4];
  const defaultAppointments = [3, 4, 2, 5, 4, 1, 2];
  const primaryLabel = chartData?.appointmentsLabel || "Appointments";
  const secondaryLabel = chartData?.checkupsLabel || "Check-ups";
  const xTickFontSize = Number.isFinite(chartData?.xTickFontSize) ? chartData.xTickFontSize : 14;
  const yTickFontSize = Number.isFinite(chartData?.yTickFontSize) ? chartData.yTickFontSize : 14;
  const xTickMaxRotation = Number.isFinite(chartData?.xTickMaxRotation) ? chartData.xTickMaxRotation : 0;
  const xTickMinRotation = Number.isFinite(chartData?.xTickMinRotation) ? chartData.xTickMinRotation : 0;

  const datasets = singleSeries
    ? [
        {
          label: primaryLabel,
          data: chartData?.appointments || defaultAppointments,
          backgroundColor: "rgba(26, 58, 82, 0.75)",
          borderColor: "rgba(26, 58, 82, 0.95)",
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        },
      ]
    : [
        {
          label: secondaryLabel,
          data: chartData?.checkups || defaultCheckups,
          backgroundColor: "rgba(95, 142, 167, 0.85)",
          borderColor: "rgba(95, 142, 167, 1)",
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: primaryLabel,
          data: chartData?.appointments || defaultAppointments,
          backgroundColor: "rgba(26, 58, 82, 0.7)",
          borderColor: "rgba(26, 58, 82, 0.9)",
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        },
      ];

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: xTickMaxRotation,
          minRotation: xTickMinRotation,
          autoSkip: true,
          font: {
            family: "'Inter', sans-serif",
            size: xTickFontSize,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          precision: 0,
          font: {
            family: "'Inter', sans-serif",
            size: yTickFontSize,
          },
        },
      },
    },
  };

  return (
    <div className="weekly-chart-container">
      <Bar data={data} options={options} />
    </div>
  );
}

export default WeeklyBarChart;
