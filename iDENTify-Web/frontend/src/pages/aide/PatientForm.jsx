import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/pages/aide/PatientForm.css";
import XrayViewer from "../../components/XrayViewer";
import MedicalAlertBanner from "../../components/MedicalAlertBanner";
import PaymentModal from "../../components/PaymentModal";
import useApi from "../../hooks/useApi";
import apiClient from "../../api/apiClient"; 
import useAppStore from "../../store/useAppStore";
import { dentalServices } from "../../data/services";

const DEFAULT_MEDICATION_FREQUENCIES = [
	"Daily",
	"Twice a day",
	"Three times a day",
	"Every 4 hours",
	"Every 6 hours",
	"Every 8 hours",
	"Every 12 hours",
	"As needed",
];

const SearchableInput = ({ options, value, onChange, placeholder, disabled, renderOption }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState(value || "");
	const wrapperRef = useRef(null);

	useEffect(() => {
		setSearch(value || "");
	}, [value]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (item) => {
		const val = typeof item === 'object' ? item.name : item;
		setSearch(val);
		onChange(val);
		setIsOpen(false);
	};

	const handleChange = (e) => {
		const val = e.target.value;
		setSearch(val);
		onChange(val);
		setIsOpen(true);
	};

	const filteredOptions = (options || []).filter(item => {
		const text = typeof item === 'object' ? item.name : item;
		return text.toLowerCase().includes(search.toLowerCase());
	});

	return (
		<div className="searchable-input-wrapper" ref={wrapperRef}>
			<input
				className="pill-input-input"
				value={search}
				onChange={handleChange}
				onFocus={() => setIsOpen(true)}
				placeholder={placeholder}
				disabled={disabled}
			/>
			{isOpen && filteredOptions.length > 0 && (
				<ul className="searchable-input-dropdown">
					{filteredOptions.map((item, index) => (
						<li key={index} onClick={() => handleSelect(item)}>
							{renderOption ? renderOption(item) : (typeof item === 'object' ? item.name : item)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

const Tooth5Surface = ({ toothNumber, segments, onSegmentClick }) => {
	const getColor = (status) => {
		switch (status) {
			case "issue": return "#e03131";
			case "planned": return "#1a4e9c";
			case "completed": return "#2f9e44";
			default: return "transparent";
		}
	};
	const handleClick = (e, part) => {
		e.stopPropagation();
		onSegmentClick(part);
	};
	return (
		<div className="tc-circle-unit">
			<div className="tc-circle-wrapper">
				<svg viewBox="0 0 100 100" className="tc-tooth-svg">
					<path d="M 0,0 L 100,0 L 50,50 Z" fill={getColor(segments?.top)} className="tooth-poly" onClick={(e) => handleClick(e, 'top')} />
					<path d="M 100,0 L 100,100 L 50,50 Z" fill={getColor(segments?.right)} className="tooth-poly" onClick={(e) => handleClick(e, 'right')} />
					<path d="M 100,100 L 0,100 L 50,50 Z" fill={getColor(segments?.bottom)} className="tooth-poly" onClick={(e) => handleClick(e, 'bottom')} />
					<path d="M 0,100 L 0,100 L 0,0 L 50,50 Z" fill={getColor(segments?.left)} className="tooth-poly" onClick={(e) => handleClick(e, 'left')} />
					<circle cx="50" cy="50" r="25" fill={getColor(segments?.center) || "white"} stroke="#000" strokeWidth="2" className="tooth-poly" onClick={(e) => handleClick(e, 'center')} />
				</svg>
			</div>
			<span className="tc-number">{toothNumber}</span>
		</div>
	);
};

function PatientForm({ userRole }) {
	const navigate = useNavigate();
	const { id } = useParams();
	const location = useLocation();
	const api = useApi();

    const isDentistReviewing = userRole === 'dentist';
    const user = useAppStore((state) => state.user);
	const queue = useAppStore((state) => state.queue || []);
	const allAppointments = useAppStore((state) => state.appointments || []);
	const dentists = useAppStore((state) => state.dentists || []);

	const [patient, setPatient] = useState(null);
	const [selectedDentistId, setSelectedDentistId] = useState("");

	const [yearsList, setYearsList] = useState([1]);
    
	const [selectedYear, setSelectedYear] = useState(() => {
		const saved = localStorage.getItem(`selectedYear_${id}`);
		return saved ? parseInt(saved, 10) : 1;
	});

	const handleYearChange = (year) => {
		setSelectedYear(year);
		localStorage.setItem(`selectedYear_${id}`, year);
	};

	const [, setIsYearDone] = useState(false); 

	const [boxMarks, setBoxMarks] = useState(Array(64).fill(""));
	const [toothSegments, setToothSegments] = useState({});
	const [toothStatuses, setToothStatuses] = useState({});
	const [timelineEntries, setTimelineEntries] = useState([]);
	const [medications, setMedications] = useState([]);
    const [clinicMedicationsList, setClinicMedicationsList] = useState([]); // Added state for dynamic meds
	const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "" });
	const [uploadedFiles, setUploadedFiles] = useState([]);

	const [selected, setSelected] = useState({ kind: null, index: null, boxKind: null, cellKey: null });
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const [activeStatus, setActiveStatus] = useState("planned");
	const [contextMenu, setContextMenu] = useState(null);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [selectedXray, setSelectedXray] = useState(null);
    const [isXrayViewerOpen, setIsXrayViewerOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [paymentContext, setPaymentContext] = useState(null);
	const [unpaidServiceMatches, setUnpaidServiceMatches] = useState([]);

	const [alertInput, setAlertInput] = useState("");
	const [tempUnit, setTempUnit] = useState("C");

	const [timelineForm, setTimelineForm] = useState({
		start_time: "",
	});
	const [selectedTimelineServices, setSelectedTimelineServices] = useState([]);
	const [currentTimelineService, setCurrentTimelineService] = useState("");
	const [medicationForm, setMedicationForm] = useState({ medicine: "", dosage: "", frequency: "", notes: "" });
	const medicationFrequencyOptions = Array.from(new Set([
		...DEFAULT_MEDICATION_FREQUENCIES,
		...(clinicMedicationsList || []).map((m) => m.default_frequency).filter(Boolean),
		medicationForm.frequency,
	].filter(Boolean)));

	const getDisplayAge = (p) => {
		if (!p) return "N/A";
		if (p.birthdate) {
			const today = new Date();
			const dob = new Date(p.birthdate);
			let age = today.getFullYear() - dob.getFullYear();
			const m = today.getMonth() - dob.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }
			return age;
		}
		if (p.vitals && p.vitals.age) return p.vitals.age;
		if (p.age !== undefined && p.age !== null) return p.age;
		return "N/A";
	};

	const handleAddYear = () => {
		const maxYear = Math.max(...yearsList);
		const newYear = maxYear + 1;
		setYearsList([...yearsList, newYear]);
		handleYearChange(newYear);
		toast.success(`Started Year ${newYear}`);
	};

	useEffect(() => {
		const loadGlobalData = async () => {
			if (!id) return;
			try {
				await api.loadDentists();

                // Fetch dynamic medications list
                try {
                    const meds = await apiClient.getClinicMedications();
                    setClinicMedicationsList(meds || []);
                } catch (e) {
                    console.error("Failed to load clinic medications list", e);
                }

				const patientData = await apiClient.getPatientById(id);
				
                let alerts = [];
                if (patientData.medical_alerts) {
                    alerts = typeof patientData.medical_alerts === 'string' 
                        ? patientData.medical_alerts.split(",") 
                        : patientData.medical_alerts;
                }

				setPatient({
					...patientData,
					medicalAlerts: alerts,
					displayAge: getDisplayAge(patientData)
				});

				const linkedAppt = location.state?.appointment;
				if (linkedAppt?.dentist_id) setSelectedDentistId(linkedAppt.dentist_id);
				else if (patientData.vitals?.dentist_id) setSelectedDentistId(patientData.vitals.dentist_id);

				const API_BASE = import.meta.env.DEV
					? "/api"
					: (import.meta.env.VITE_API_BASE || "/api");
                const yearsRes = await fetch(`${API_BASE}/annual-records/years/${id}`);
                if (yearsRes.ok) {
                    const yearsData = await yearsRes.json();
                    let loadedYears = [1];
                    
                    if (yearsData && yearsData.length > 0) {
                        loadedYears = yearsData.map(y => y.record_year);
                    }
                    
                    const savedYear = parseInt(localStorage.getItem(`selectedYear_${id}`), 10);
                    
                    if (savedYear && savedYear > Math.max(...loadedYears)) {
                        const extendedYears = [];
                        for (let i = 1; i <= savedYear; i++) extendedYears.push(i);
                        setYearsList(extendedYears);
                    } else {
                        setYearsList(loadedYears);
                        if (!savedYear || !loadedYears.includes(savedYear)) {
                            handleYearChange(Math.max(...loadedYears));
                        }
                    }
                }
			} catch (err) { console.error("Failed to load global data", err); }
		};
		loadGlobalData();
	}, [id, allAppointments]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const loadAnnualData = async () => {
			if (!id) return;
			setIsYearDone(false);
			setBoxMarks(Array(64).fill(""));
			setToothSegments({});
			setToothStatuses({});
			setTimelineEntries([]);
			setMedications([]);
			setVitals({ bp: "", pulse: "", temp: "" });
			setUploadedFiles([]);
			setTempUnit("C"); 

			try {
				const annualRecord = await apiClient.getAnnualRecord(id, selectedYear);
				if (annualRecord) {
					setVitals(annualRecord.vitals || { bp: "", pulse: "", temp: "" });
					setUploadedFiles(annualRecord.xrays || []);
					setIsYearDone(annualRecord.status === "Done");
					if (annualRecord.vitals?.temp && annualRecord.vitals.temp.includes("F")) { setTempUnit("F"); } else { setTempUnit("C"); }
				} else { setIsYearDone(false); setTempUnit("C"); }

				const conditions = await apiClient.getToothConditions(id, selectedYear);
				const newBoxMarks = Array(64).fill("");
				const newToothSegments = {};
				const newToothStatuses = {};

				(conditions || []).filter(c => c.record_year === selectedYear).forEach(c => {
					const [type, indexStr] = c.cell_key.split("-");
					const index = parseInt(indexStr, 10);
					if (!isNaN(index)) {
						if (type === "box") {
							newBoxMarks[index] = c.condition_code || "";
							newToothStatuses[c.cell_key] = c.status;
						}
						if (type === "circle") {
							if (c.segments) { newToothSegments[c.cell_key] = typeof c.segments === 'string' ? JSON.parse(c.segments) : c.segments; }
						}
					}
				});

				setBoxMarks(newBoxMarks);
				setToothSegments(newToothSegments);
				setToothStatuses(newToothStatuses);

				const timeline = await apiClient.getTreatmentTimeline(id, selectedYear);
				const timelineForYear = (timeline || []).filter((entry) => Number(entry?.record_year || selectedYear) === Number(selectedYear));
				setTimelineEntries(timelineForYear);

				const meds = await apiClient.getMedications(id, selectedYear);
				const medsForYear = (meds || []).filter((entry) => Number(entry?.record_year || selectedYear) === Number(selectedYear));
				setMedications(medsForYear);

				let dbAppointments = allAppointments;
				if (!dbAppointments || dbAppointments.length === 0) {
					try {
						const API_BASE = import.meta.env.DEV
							? "/api"
							: (import.meta.env.VITE_API_BASE || "/api");
						const res = await fetch(`${API_BASE}/appointments`);
						if (res.ok) dbAppointments = await res.json();
					} catch (e) { console.error("Failed to fetch appointments", e); }
				}

				let linkedAppointment = location.state?.appointment;
				if (!linkedAppointment && dbAppointments) {
					linkedAppointment = dbAppointments.find(a => 
						String(a.patient_id) === String(id) && 
						a.status?.toLowerCase() !== "done" && 
						a.status?.toLowerCase() !== "cancelled"
					);
				}
				if (!linkedAppointment && queue) {
					linkedAppointment = queue.find(q => 
						String(q.patient_id) === String(id) && 
						q.status?.toLowerCase() !== "done" && 
						q.status?.toLowerCase() !== "cancelled"
					);
				}

				const now = new Date();
				const cleanDate = now.toLocaleDateString();
				const cleanTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

				const shouldAutofillFromLinkedAppointment = Boolean(linkedAppointment);

				if (shouldAutofillFromLinkedAppointment) {
					let procData = 
						linkedAppointment.reason || 
						linkedAppointment.procedure || 
						linkedAppointment.procedures || 
						linkedAppointment.service || 
						linkedAppointment.services || 
						linkedAppointment.dental_service ||
						linkedAppointment.notes || 
						"";

					if ((!procData || (typeof procData === 'string' && procData.trim() === "")) && Array.isArray(queue)) {
						const activeQueueItem = queue.find((item) => (
							String(item.patient_id) === String(id)
							&& item.status?.toLowerCase() !== "done"
							&& item.status?.toLowerCase() !== "cancelled"
						));

						if (activeQueueItem) {
							procData =
								activeQueueItem.reason ||
								activeQueueItem.procedure ||
								activeQueueItem.procedures ||
								activeQueueItem.service ||
								activeQueueItem.services ||
								activeQueueItem.dental_service ||
								activeQueueItem.notes ||
								"";
						}
					}
					
					if (typeof procData === 'string' && procData.trim() !== "") {
						try {
							const parsed = JSON.parse(procData);
							if (Array.isArray(parsed)) {
								setSelectedTimelineServices(parsed);
							} else {
								setSelectedTimelineServices(procData.split(',').map(s => s.trim()).filter(Boolean));
							}
						} catch {
							const procedures = procData.split(',').map(s => s.trim()).filter(Boolean);
							setSelectedTimelineServices(procedures);
						}
					} else if (Array.isArray(procData) && procData.length > 0) {
						setSelectedTimelineServices(procData);
					} else {
						setSelectedTimelineServices([]);
					}
					
					let formattedStart = "";
					if (linkedAppointment.appointment_datetime) {
						const dateObj = new Date(linkedAppointment.appointment_datetime);
						formattedStart = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
					} else if (linkedAppointment.timeStart || linkedAppointment.time) {
						const timeStr = linkedAppointment.timeStart || linkedAppointment.time;
						formattedStart = `${cleanDate} ${timeStr}`;
					} else { 
						formattedStart = `${cleanDate} ${cleanTime}`; 
					}

					setTimelineForm(prev => ({ ...prev, start_time: formattedStart }));
				} else {
					setTimelineForm({ start_time: `${cleanDate} ${cleanTime}` });
					setSelectedTimelineServices([]);
				}

			} catch (err) { console.error("Failed to load annual data", err); }
		};
		loadAnnualData();
	}, [id, selectedYear, location.state, allAppointments, queue]);

	const maxYear = Math.max(...(yearsList.length > 0 ? yearsList : [1]));
	const isLatestYear = selectedYear === maxYear;
    
    const isHistoryView = location.state?.status === "Done";

	const isChartReadOnly = !isLatestYear || isHistoryView || isDentistReviewing; 
	const isVisitReadOnly = !isLatestYear || isHistoryView || isDentistReviewing; 

	const getRecommendations = () => {
		const issues = [];
		boxMarks.forEach((code, idx) => {
			if (!code) return;
			let treatments = [];
			let conditionName = "";
			if (code === 'D') { conditionName = "Decayed"; treatments = ["Dental Filling (Composite)", "Root Canal Therapy", "Tooth Extraction"]; } 
            else if (code === 'M') { conditionName = "Missing"; treatments = ["Dental Bridge", "Dental Implant", "Dentures (Complete/Partial)"]; } 
            else if (code === 'UN') { conditionName = "Unerupted"; treatments = ["Surgical Extraction", "X-ray / Radiograph"]; } 
            else if (code === 'P') { conditionName = "Pontic"; treatments = ["Check Pontic Integrity"]; } 
            else if (code === 'DX') { conditionName = "For Extraction"; treatments = ["Tooth Extraction", "Surgical Extraction"]; }

			if (treatments.length > 0) { issues.push({ tooth: `Tooth Area ${idx + 1}`, condition: conditionName, treatments: treatments }); }
		});
		Object.entries(toothSegments).forEach(([, segs]) => {
			const hasIssue = Object.values(segs).some(status => status === 'issue');
			if (hasIssue) { issues.push({ tooth: `Tooth (Marked on Chart)`, condition: "Visual Issue", treatments: ["General Consultation", "X-ray / Radiograph", "Dental Filling (Composite)"] }); }
		});
		return issues.slice(0, 5);
	};
	const recommendations = getRecommendations();

	const handleApplyRecommendation = (treatmentName) => {
		if (isVisitReadOnly) return; 
		if (!selectedTimelineServices.includes(treatmentName)) {
			setSelectedTimelineServices([...selectedTimelineServices, treatmentName]);
			toast.success(`Added ${treatmentName} to Plan`);
			const timelineSection = document.querySelector('.timeline-section');
			if (timelineSection) timelineSection.scrollIntoView({ behavior: 'smooth' });
		} else { toast.error("Service already in plan"); }
	};

	const toPositiveInt = (value) => {
		const parsed = Number.parseInt(String(value || ""), 10);
		if (!Number.isFinite(parsed) || parsed <= 0) return null;
		return parsed;
	};

	const parseServiceListFromText = (value) => {
		if (Array.isArray(value)) {
			return value.map((item) => String(item || "").trim()).filter(Boolean);
		}

		const text = String(value || "").trim();
		if (!text) return [];

		try {
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed)) {
				return parsed.map((item) => String(item || "").trim()).filter(Boolean);
			}
		} catch {
			// Ignore parse errors and fall back to comma split.
		}

		return text.split(",").map((item) => item.trim()).filter(Boolean);
	};

	const normalizeServiceLabel = (value) => String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	const servicesMatch = (left, right) => (
		left === right
		|| left.includes(right)
		|| right.includes(left)
	);

	const getRemainingServices = (incomingServices, existingServices) => {
		const existingLabels = Array.from(new Set(
			(existingServices || [])
				.map((item) => normalizeServiceLabel(item))
				.filter(Boolean)
		));

		const uniqueIncoming = [];
		const seenIncoming = new Set();
		(incomingServices || []).forEach((item) => {
			const raw = String(item || "").trim();
			const label = normalizeServiceLabel(raw);
			if (!raw || !label || seenIncoming.has(label)) return;
			seenIncoming.add(label);
			uniqueIncoming.push({ raw, label });
		});

		return uniqueIncoming
			.filter((incoming) => !existingLabels.some((existing) => servicesMatch(existing, incoming.label)))
			.map((incoming) => incoming.raw);
	};

	const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

	const resolveQueueItemForPayment = () => {
		const stateAppointment = location.state?.appointment;
		const queueIdFromState = toPositiveInt(location.state?.queueId);
		const queueIdFromAppointmentPayload = hasOwn(stateAppointment, "appointment_id")
			? toPositiveInt(stateAppointment?.id)
			: null;
		const preferredQueueId = queueIdFromState || queueIdFromAppointmentPayload;

		if (preferredQueueId) {
			const locationQueueItem = (queue || []).find((item) => toPositiveInt(item.id) === preferredQueueId);
			if (locationQueueItem) return locationQueueItem;
		}

		return (queue || []).find((item) => (
			String(item.patient_id) === String(id)
			&& item.status !== "Done"
			&& item.status !== "Cancelled"
		));
	};

	const resolveAppointmentForPayment = (queueItem) => {
		const stateAppointment = location.state?.appointment;
		const locationApptId = hasOwn(stateAppointment, "appointment_id")
			? toPositiveInt(stateAppointment?.appointment_id)
			: toPositiveInt(stateAppointment?.id);

		if (locationApptId) {
			const locationAppt = (allAppointments || []).find((item) => toPositiveInt(item.id) === locationApptId);
			if (locationAppt) return locationAppt;
		}

		if (stateAppointment) {
			return stateAppointment;
		}

		const queueAppointmentId = toPositiveInt(queueItem?.appointment_id);
		if (queueAppointmentId) {
			const byQueue = (allAppointments || []).find((item) => toPositiveInt(item.id) === queueAppointmentId);
			if (byQueue) return byQueue;
		}

		return (allAppointments || []).find((item) => (
			String(item.patient_id) === String(id)
			&& item.status !== "Done"
			&& item.status !== "Cancelled"
		));
	};

	const resolveServicesForPayment = (appointment, queueItem) => {
		const appointmentServices = parseServiceListFromText(
			appointment?.reason
			|| appointment?.procedure
			|| appointment?.service
			|| appointment?.services
			|| appointment?.dental_service
			|| location.state?.appointment?.reason
			|| location.state?.appointment?.procedure
			|| location.state?.appointment?.service
			|| location.state?.appointment?.services
			|| location.state?.appointment?.dental_service
			|| ""
		);
		if (appointmentServices.length > 0) return appointmentServices;

		const queueServices = parseServiceListFromText(
			queueItem?.notes
			|| queueItem?.reason
			|| queueItem?.procedure
			|| queueItem?.service
			|| queueItem?.services
			|| queueItem?.dental_service
			|| ""
		);
		if (queueServices.length > 0) return queueServices;

		if ((selectedTimelineServices || []).length > 0) {
			return selectedTimelineServices.map((item) => String(item || "").trim()).filter(Boolean);
		}

		const latestTimelineEntry = (timelineEntries || []).slice().reverse().find((entry) => entry?.procedure_text);
		return parseServiceListFromText(latestTimelineEntry?.procedure_text || "");
	};

	const resolveDentistInfoForPayment = (appointment, queueItem) => {
		const resolvedDentistId = toPositiveInt(
			selectedDentistId
			|| appointment?.dentist_id
			|| queueItem?.dentist_id
			|| location.state?.dentistId
		);

		const dentistMatch = (dentists || []).find((item) => toPositiveInt(item.id) === resolvedDentistId);

		const dentistName = dentistMatch?.name
			|| appointment?.dentist_name
			|| queueItem?.dentist_name
			|| location.state?.assignedDentistName
			|| "Unassigned";

		return { dentistId: resolvedDentistId, dentistName };
	};

	const resolveVisitDateTimeForPayment = (appointment) => {
		return appointment?.appointment_datetime
			|| timelineForm.start_time
			|| new Date().toLocaleString();
	};

	const buildPaymentContext = () => {
		const queueItem = resolveQueueItemForPayment();
		const appointment = resolveAppointmentForPayment(queueItem);
		const services = resolveServicesForPayment(appointment, queueItem);
		const { dentistId, dentistName } = resolveDentistInfoForPayment(appointment, queueItem);
		const appointmentId = hasOwn(appointment, "appointment_id")
			? toPositiveInt(appointment?.appointment_id)
			: toPositiveInt(appointment?.id);

		return {
			patient_id: toPositiveInt(patient?.id) || toPositiveInt(id),
			patient_name: patient?.full_name || "Unknown",
			dentist_id: dentistId,
			dentist_name: dentistName,
			appointment_id: appointmentId,
			queue_id: toPositiveInt(queueItem?.id),
			visit_datetime: resolveVisitDateTimeForPayment(appointment),
			services,
		};
	};

	const saveClinicalProgress = async () => {
		let finalAlerts = [...(patient.medicalAlerts || [])];
		if (patient.relationship) { finalAlerts.push(`Relation:${patient.relationship}`); }

		const patientPayload = {
			...patient,
			medicalAlerts: finalAlerts,
			contact_number: patient.contact_number,
			contact: patient.contact_number,
		};
		await apiClient.updatePatient(patient.id, patientPayload);

		const annualPayload = {
			patient_id: id,
			record_year: selectedYear,
			vitals: { ...vitals, dentist_id: selectedDentistId },
			xrays: uploadedFiles,
			status: "Active",
		};
		await apiClient.saveAnnualRecord(annualPayload);
	};

	const handleSaveAll = async () => {
		if (!patient) return;
		const context = buildPaymentContext();
		setPaymentContext(context);

		try {
			const patientId = toPositiveInt(context?.patient_id);
			const services = Array.isArray(context?.services)
				? context.services.map((item) => String(item || "").trim()).filter(Boolean)
				: [];

			if (patientId && services.length > 0) {
				const result = await apiClient.getUnpaidPaymentMatches({
					patient_id: patientId,
					services,
				});

				const matches = Array.isArray(result?.matches) ? result.matches : [];
				setUnpaidServiceMatches(matches);
			} else {
				setUnpaidServiceMatches([]);
			}
		} catch (error) {
			if (error?.status === 404) {
				console.warn("Skipping unpaid balance detection because /api/payments/unpaid-matches is unavailable on the current backend process.");
			} else {
				console.error("Failed to detect existing unpaid balances", error);
			}
			setUnpaidServiceMatches([]);
		}

		setIsPaymentModalOpen(true);
	};

	const handleClosePaymentModal = () => {
		if (isSaving) return;
		setIsPaymentModalOpen(false);
		setPaymentContext(null);
		setUnpaidServiceMatches([]);
	};

	const handleContinueExistingPayment = async (selectedMatch) => {
		if (!patient || !paymentContext || !selectedMatch?.id) return;
		const sessionQueueId = toPositiveInt(paymentContext?.queue_id);
		const incomingServices = Array.isArray(paymentContext?.services)
			? paymentContext.services.map((item) => String(item || "").trim()).filter(Boolean)
			: [];
		const remainingServicesFromMatch = Array.isArray(selectedMatch?.remaining_services)
			? selectedMatch.remaining_services.map((item) => String(item || "").trim()).filter(Boolean)
			: [];
		const existingRecordServices = parseServiceListFromText(selectedMatch?.services_text || "");
		const remainingServices = remainingServicesFromMatch.length > 0
			? remainingServicesFromMatch
			: getRemainingServices(incomingServices, existingRecordServices);
		const splitPaymentContext = remainingServices.length > 0
			? {
				sourcePaymentId: Number(selectedMatch.id),
				patient_id: toPositiveInt(paymentContext?.patient_id),
				patient_name: paymentContext?.patient_name || patient?.full_name || "Unknown",
				dentist_id: toPositiveInt(paymentContext?.dentist_id),
				dentist_name: paymentContext?.dentist_name || "Unassigned",
				appointment_id: toPositiveInt(paymentContext?.appointment_id),
				queue_id: sessionQueueId,
				visit_datetime: paymentContext?.visit_datetime || new Date().toLocaleString(),
				services: remainingServices,
			}
			: null;

		setIsSaving(true);
		try {
			await saveClinicalProgress();

			if (sessionQueueId) {
				await apiClient.updateQueueItem(sessionQueueId, { status: "Done" });
			}

			if (api.loadQueue) await api.loadQueue();
			if (api.loadAppointments) await api.loadAppointments();

			setIsPaymentModalOpen(false);
			setPaymentContext(null);
			setUnpaidServiceMatches([]);

			toast.success("Progress saved. Continue payment from the existing balance record.");
			navigate("/payments", {
				state: {
					focusPaymentId: Number(selectedMatch.id),
					sessionQueueId,
					splitPaymentContext,
				},
			});
		} catch (error) {
			console.error(error);
			toast.error(error?.message || "Failed to continue existing payment record.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleConfirmPayment = async (paymentPayload) => {
		if (!patient || !paymentContext) return;

		setIsSaving(true);
		try {
			await saveClinicalProgress();

			const savedPayment = await apiClient.createPaymentRecord({
				...paymentContext,
				...paymentPayload,
			});

			if (api.loadQueue) await api.loadQueue();
			if (api.loadAppointments) await api.loadAppointments();

			setIsPaymentModalOpen(false);
			setPaymentContext(null);
			setUnpaidServiceMatches([]);

			const balanceDue = Number(savedPayment?.balance_due || 0);
			const isDeposit = Boolean(savedPayment?.is_deposit);

			if (balanceDue > 0 && !isDeposit) {
				toast.success("Progress saved. Payment record added to billing.");
				navigate("/payments");
				return;
			}

			if (isDeposit && balanceDue > 0) {
				toast.success("Session completed with deposit. Remaining balance is tracked in payments.");
			} else {
				toast.success("Appointment progress and payment saved.");
			}
			navigate("/history");
		} catch (error) {
			console.error(error);

			if (error?.status === 404) {
				toast.error("Payments API is unavailable on the running backend. Restart/update backend server, then try again.");
				return;
			}

			if (error?.status === 409) {
				toast.success("A payment record already exists. Opening billing page.");
				setIsPaymentModalOpen(false);
				setPaymentContext(null);
				setUnpaidServiceMatches([]);
				navigate("/payments");
				return;
			}

			toast.error(error?.message || "Failed to save payment progress.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSegmentClick = async (cellKey, part) => {
		if (isChartReadOnly) return;
		const currentSegments = toothSegments[cellKey] || {};
		const newStatus = currentSegments[part] === activeStatus ? null : activeStatus;
		const updatedSegments = { ...currentSegments, [part]: newStatus };
		setToothSegments(prev => ({ ...prev, [cellKey]: updatedSegments }));
		try {
			await apiClient.upsertToothCondition({ patient_id: id, cell_key: cellKey, condition_code: null, status: "mixed", is_shaded: false, segments: updatedSegments, record_year: selectedYear });
		} catch (error) { console.error(error); }
	};

	const updateVitals = (field, value) => setVitals(prev => ({ ...prev, [field]: value }));
	const handleTempNumberChange = (val) => { updateVitals("temp", val ? `${val} °${tempUnit}` : ""); };

	const handleUnitToggle = (newUnit) => {
		const currentValStr = vitals.temp || "";
		const match = currentValStr.match(/[\d.]+/);
		if (!match) { setTempUnit(newUnit); return; }
		let val = parseFloat(match[0]);
		if (isNaN(val)) { setTempUnit(newUnit); return; }
		if (tempUnit === "C" && newUnit === "F") { val = (val * 9 / 5) + 32; }
		else if (tempUnit === "F" && newUnit === "C") { val = (val - 32) * 5 / 9; }
		val = Math.round(val * 10) / 10;
		setTempUnit(newUnit);
		updateVitals("temp", `${val} °${newUnit}`);
	};

	const getTempNumericValue = () => {
		const match = (vitals.temp || "").toString().match(/[\d.]+/);
		return match ? match[0] : "";
	};

	const handleUpload = async (event) => {
		if (isVisitReadOnly) return;
		const files = Array.from(event.target.files || []);
		const newFiles = [];
		for (const file of files) {
			try {
				const reader = new FileReader();
				const base64 = await new Promise((resolve) => {
					reader.readAsDataURL(file);
					reader.onload = () => resolve(reader.result);
				});
				newFiles.push({ name: file.name, url: base64 });
			} catch (e) { console.error(e); }
		}
		setUploadedFiles((prev) => [...prev, ...newFiles]);
	};

	const handleAddAlert = () => {
        if (isVisitReadOnly) return;
		if (!alertInput.trim()) return;
		const currentAlerts = patient.medicalAlerts || [];
		if (currentAlerts.includes(alertInput.trim())) return;
		const updatedAlerts = [...currentAlerts, alertInput.trim()];
		setPatient(prev => ({ ...prev, medicalAlerts: updatedAlerts }));
		setAlertInput("");
	};

	const handleRemoveAlert = (alertToRemove) => {
        if (isVisitReadOnly) return;
		const updatedAlerts = patient.medicalAlerts.filter(a => a !== alertToRemove);
		setPatient(prev => ({ ...prev, medicalAlerts: updatedAlerts }));
	};

	const updateTimelineForm = (field, value) => setTimelineForm((prev) => ({ ...prev, [field]: value }));

	const handleAddTimelineService = () => {
		if (!currentTimelineService) return;
		if (selectedTimelineServices.includes(currentTimelineService)) return;
		setSelectedTimelineServices([...selectedTimelineServices, currentTimelineService]);
		setCurrentTimelineService("");
	};

	const handleRemoveTimelineService = (svc) => { setSelectedTimelineServices(selectedTimelineServices.filter(s => s !== svc)); };

	const addTimelineEntry = async () => {
		if (selectedTimelineServices.length === 0) { toast.error("Please add at least one procedure."); return; }
		let providerName = user?.name || "Dental Aide";
		const procedureString = selectedTimelineServices.join(", ");
		const payload = { patient_id: id, procedure_text: procedureString, provider: providerName, start_time: timelineForm.start_time || new Date().toLocaleString(), notes: "", record_year: selectedYear };

		try {
			const newEntry = await apiClient.addTreatmentTimelineEntry(payload);
			setTimelineEntries(prev => [...(prev || []), newEntry]);
			setSelectedTimelineServices([]);
		} catch (error) { console.error(error); toast.error("Failed to add entry"); }
	};

    // Modified to auto-fill dosage
	const updateMedicationForm = (field, value) => {
        setMedicationForm((prev) => {
            const updated = { ...prev, [field]: value };
            
            if (field === "medicine") {
                const selectedMed = clinicMedicationsList.find(m => m.name === value);
				if (selectedMed) {
					if (selectedMed.default_dosage) {
						updated.dosage = selectedMed.default_dosage;
					}
					if (selectedMed.default_frequency) {
						updated.frequency = selectedMed.default_frequency;
					}
                }
            }
            return updated;
        });
    };

	const addMedication = async () => {
		if (!medicationForm.medicine) return;
		try {
			const newMed = await apiClient.addMedication({ patient_id: id, ...medicationForm, record_year: selectedYear });
			setMedications(prev => [...(prev || []), newMed]);
			setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" });
		} catch (error) { console.error(error); }
	};
	const deleteMedication = async (medId) => {
		if (isVisitReadOnly) return;
		try { await apiClient.deleteMedication(medId); setMedications(prev => (prev || []).filter(m => m.id !== medId)); } catch (error) { console.error(error); }
	};

	const handleBoxClick = (idx) => {
		if (isChartReadOnly) return;
		const row = Math.floor(idx / 16);
		let boxKind = "condition";
		if (row === 0 || row === 3) boxKind = "treatment";
		setSelected({ kind: "box", index: idx, boxKind, cellKey: `box-${idx}` });
		setIsPanelOpen(true);
	};

	const closePanel = () => { setIsPanelOpen(false); setSelected({ kind: null, index: null, boxKind: null, cellKey: null }); };
	const handleContextMenu = (e, cellKey, boxKind) => { 
        e.preventDefault(); 
        if (isChartReadOnly) return; 
        const idx = parseInt(cellKey.split('-')[1], 10);
        setSelected({ kind: "box", index: idx, boxKind, cellKey });
        setContextMenu({ x: e.pageX, y: e.pageY, cellKey, boxKind }); 
        setIsContextMenuOpen(true); 
    };
	const closeContextMenu = () => { setIsContextMenuOpen(false); setContextMenu(null); };
	const openXrayViewer = (file) => { setSelectedXray(file); setIsXrayViewerOpen(true); };
	const closeXrayViewer = () => { setSelectedXray(null); setIsXrayViewerOpen(false); };

	const applyCode = (code, directSelection = null) => {
        const targetSelection = directSelection || selected;
		if (targetSelection.kind === "box" && targetSelection.index != null) {
			const newBoxMarks = boxMarks.map((v, i) => (i === targetSelection.index ? code : v));
			setBoxMarks(newBoxMarks);
			apiClient.upsertToothCondition({ patient_id: id, cell_key: targetSelection.cellKey, condition_code: code, status: activeStatus, is_shaded: false, record_year: selectedYear });
			const newStatus = { ...toothStatuses, [targetSelection.cellKey]: activeStatus };
			setToothStatuses(newStatus);
		}
		closePanel();
	};

	const renderBoxRow = (rowIndex) => {
		const start = rowIndex * 16;
		return (
			<div className="tc-box-row">
				{Array.from({ length: 16 }).map((_, i) => {
					const idx = start + i;
					const mark = boxMarks[idx];
					const isSelected = selected.kind === "box" && selected.index === idx;
					const cellKey = `box-${idx}`;
					const statusClass = toothStatuses[cellKey] ? ` tc-status-${toothStatuses[cellKey]}` : "";
					return (
						<button key={idx} className={`tc-box-cell${mark ? " tc-has-mark" : ""}${isSelected ? " tc-selected" : ""}${statusClass}`} onClick={() => handleBoxClick(idx)} onContextMenu={(e) => handleContextMenu(e, cellKey, rowIndex === 0 || rowIndex === 3 ? "treatment" : "condition")} onDoubleClick={() => { if (!isChartReadOnly) { const directSel = { kind: "box", index: idx, boxKind: "condition", cellKey }; applyCode("D", directSel); } }} disabled={isChartReadOnly}>{mark}</button>
					);
				})}
			</div>
		);
	};

	const renderCircleGroup = (rows, startIndex) => {
		let runningIndex = startIndex;
		return rows.map((rowNumbers, rowIdx) => {
			const isDeciduous = rowNumbers.length === 10;
			const rowClass = isDeciduous ? "tc-circle-row tc-deciduous-row" : "tc-circle-row";
			return (
				<div className={rowClass} key={rowIdx}>
					{rowNumbers.map((num) => {
						const idx = runningIndex;
						runningIndex += 1;
						const cellKey = `circle-${idx}`;
						const segments = toothSegments[cellKey] || {};
						return <Tooth5Surface key={num} toothNumber={num} segments={segments} onSegmentClick={(part) => handleSegmentClick(cellKey, part)} />;
					})}
				</div>
			)
		});
	};

	const treatmentOptions = [{ code: "FV", label: "Fluoride Varnish" }, { code: "FG", label: "Fluoride Gel" }, { code: "PFS", label: "Pit and Fissure Sealant" }, { code: "PF", label: "Permanent Filling" }, { code: "TF", label: "Temporary Filling" }, { code: "X", label: "Extraction" }, { code: "O", label: "Others" }, { code: "", label: "Clear" }];
	const conditionOptions = [{ code: "S", label: "Sealed" }, { code: "UN", label: "Unerupted" }, { code: "D", label: "Decayed" }, { code: "F", label: "Filled" }, { code: "M", label: "Missing" }, { code: "JC", label: "Jacket Crown" }, { code: "P", label: "Pontic" }, { code: "DX", label: "For Extraction" }, { code: "", label: "Clear" }];
	const upperConditionRows = [["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"], ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"]];
	const lowerConditionRows = [["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"], ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"]];
	const panelTitle = selected.boxKind === "treatment" ? "Treatment" : selected.boxKind === "condition" ? "Condition" : "Legend";
	const panelOptions = selected.boxKind === "treatment" ? treatmentOptions : selected.boxKind === "condition" ? conditionOptions : [];

	if (!patient) return <div>Loading...</div>;

	return (
		<div className="patient-form-layout">
			<div className="content-card patient-form-card" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
				<MedicalAlertBanner alerts={patient.medicalAlerts || []} />
				<div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<button onClick={() => navigate(-1)} style={{ padding: '5px 10px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>&larr; Back</button>
						<h2 className="patients-header">Patient Chart: {patient.full_name}</h2>
					</div>
				</div>

                {isDentistReviewing && !isHistoryView && (
                    <div className="review-banner" style={{ backgroundColor: "#e0f7fa", color: "#006064", padding: "15px", borderRadius: "8px", marginBottom: "20px", borderLeft: "5px solid #00bcd4" }}>
                        <strong style={{ display: "block", fontSize: "1.1em", marginBottom: "5px" }}>Dentist Review Mode</strong>
                        <span>Please double-check the patient data, charting, and timeline entered by the Dental Aide to ensure accuracy before beginning treatment.</span>
                    </div>
                )}
                
                {isHistoryView && (
                    <div className="review-banner" style={{ backgroundColor: "#f0fdf4", color: "#166534", padding: "15px", borderRadius: "8px", marginBottom: "20px", borderLeft: "5px solid #22c55e" }}>
                        <strong style={{ display: "block", fontSize: "1.1em", marginBottom: "5px" }}>Historical Record</strong>
                        <span>This appointment has been completed. The chart is currently in read-only mode for viewing purposes.</span>
                    </div>
                )}

				<div className="sections-container">
					<section className="patient-info-card">
						<h3 className="section-title">Patient Info</h3>
						<div className="patient-info-fields">
							<p><strong>Name:</strong> {patient.full_name}</p>
							<p><strong>Age:</strong> {patient.displayAge}</p>
							<p><strong>Sex:</strong> {patient.gender}</p>
							<p><strong>#Number:</strong> {patient.contact_number}</p>
							{patient.relationship && <p><strong>Relationship:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{patient.relationship}</span></p>}
						</div>
					</section>

					<section className="dentist-details-card">
						<div className="dentist-row">
							<div>
								<h3 className="section-title">Prepared By</h3>
                                <input className="pill-input-input" value={user?.name || "Dental Aide"} readOnly style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'not-allowed', width: '250px', fontWeight: '500' }} />
							</div>
							<div className="vital-signs">
								<h3 className="section-title">Vital Signs (Year {selectedYear})</h3>
								<div className="vital-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
									<div className="vital-field" style={{ flex: '1 1 120px' }}>
										<label>BP</label>
										<input className="pill-input-input" placeholder="120/80" value={vitals.bp || ""} onChange={(e) => updateVitals("bp", e.target.value)} disabled={isVisitReadOnly} />
									</div>
									<div className="vital-field" style={{ flex: '1 1 120px' }}>
										<label>Pulse</label>
										<input className="pill-input-input" placeholder="72" value={vitals.pulse || ""} onChange={(e) => updateVitals("pulse", e.target.value)} disabled={isVisitReadOnly} />
									</div>
									<div className="vital-field" style={{ flex: '1 1 140px' }}>
										<label>Temp</label>
										<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
											<input type="number" step="0.1" className="pill-input-input" placeholder="36.5" value={getTempNumericValue()} onChange={(e) => handleTempNumberChange(e.target.value)} disabled={isVisitReadOnly} style={{ flex: 1 }} />
											<select className="pill-input-input" style={{ width: '60px', textAlign: 'center' }} value={tempUnit} onChange={(e) => handleUnitToggle(e.target.value)} disabled={isVisitReadOnly}>
												<option value="C">°C</option>
												<option value="F">°F</option>
											</select>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>

				<section style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
					<h3 className="section-title">Medical Alerts & Allergies (Global)</h3>
					{!isVisitReadOnly && (
                        <div className="medical-alert-input-group">
                            <input className="pill-input-input" placeholder="Type allergy (e.g. Asthma, Penicillin)" value={alertInput} onChange={(e) => setAlertInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddAlert()} />
                            <button className="small-btn" style={{ background: '#ef4444', minWidth: '60px' }} onClick={handleAddAlert}>+ Add</button>
                        </div>
                    )}
					<div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px', marginTop: isVisitReadOnly ? '10px' : '0' }}>
						{(patient.medicalAlerts && patient.medicalAlerts.length > 0) ? (
							patient.medicalAlerts.map((alert, i) => (
								<span key={i} className="alert-chip">{alert}{!isVisitReadOnly && <button onClick={() => handleRemoveAlert(alert)}>×</button>}</span>
							))
						) : ( <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No active alerts.</span> )}
					</div>
				</section>

				{recommendations.length > 0 && (
					<div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderLeft: '4px solid #f97316', borderRadius: '4px' }}>
						<h4 style={{ margin: '0 0 10px 0', color: '#c2410c' }}>Automated Recommendations (Year {selectedYear})</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							{recommendations.map((rec, i) => (
								<div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px', background: '#fff', borderRadius: '6px', border: '1px solid #fed7aa' }}>
									<div><strong style={{ color: '#9a3412' }}>{rec.tooth}</strong>: {rec.condition}<div style={{ fontSize: '0.9rem', color: '#431407', marginTop: '4px' }}>Suggest: {rec.treatments.join(", ")}</div></div>
									<div style={{ display: 'flex', gap: '5px' }}>{rec.treatments.map((tx, idx) => ( <button key={idx} className="small-btn" style={{ fontSize: '0.75rem', padding: '4px 8px', background: isVisitReadOnly ? '#fdba74' : '#f97316', cursor: isVisitReadOnly ? 'not-allowed' : 'pointer' }} onClick={() => handleApplyRecommendation(tx)} disabled={isVisitReadOnly}>+ {tx}</button> ))}</div>
								</div>
							))}
						</div>
					</div>
				)}

				<section className="oral-section">
					<h3 className="section-title">Oral Health Condition</h3>
					<div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
						{yearsList.map(year => ( <button key={year} onClick={() => handleYearChange(year)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', backgroundColor: selectedYear === year ? '#2563eb' : '#e2e8f0', color: selectedYear === year ? 'white' : '#475569', boxShadow: selectedYear === year ? '0 2px 4px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.2s' }}>Year {year}</button> ))}
						{!isHistoryView && <button onClick={handleAddYear} style={{ padding: '8px 12px', borderRadius: '20px', border: '2px dashed #cbd5e1', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', backgroundColor: 'transparent', color: '#64748b', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add Next Year">+</button>}
					</div>
					<div className="status-palette">
						{["issue", "planned", "completed"].map((status) => ( <button key={status} className={`status-pill${activeStatus === status ? " active" : ""}`} onClick={() => !isChartReadOnly && setActiveStatus(status)} disabled={isChartReadOnly}><span className={`status-dot ${status}`}></span>{status === "issue" ? "Issue (red)" : status === "planned" ? "Planned (blue)" : "Completed (green)"}</button> ))}
					</div>
					<div className="tooth-chart-container">
						<div className="tooth-inner-panel">
							<div className="tc-group"><div className="tc-row-header">Top Layer (Treatment / Condition)</div>{renderBoxRow(0)}{renderBoxRow(1)}</div>
							<div className="tc-group"><div className="tc-row-header"></div>{renderCircleGroup(upperConditionRows, 0)}{renderCircleGroup(lowerConditionRows, 26)}</div>
							<div className="tc-group"><div className="tc-row-header">Bottom Layer (Condition / Treatment)</div>{renderBoxRow(2)}{renderBoxRow(3)}</div>
						</div>
					</div>
				</section>

				<section className="timeline-section" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '2rem' }}>
					<h3 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>
						Treatment Timeline (Year {selectedYear})
					</h3>

					{!isVisitReadOnly && (
						<div className="timeline-form-compact" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', alignItems: 'end', marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
							<div className="form-group">
								<label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '5px' }}>Date & Time</label>
								<input className="pill-input-input" placeholder="Start Date & Time" value={timelineForm.start_time} onChange={(e) => updateTimelineForm("start_time", e.target.value)} style={{ width: '100%' }} />
							</div>

                            <div className="form-group">
								<label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '5px' }}>Select Procedure</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableInput
                                            options={dentalServices || []}
                                            value={currentTimelineService}
                                            onChange={(val) => setCurrentTimelineService(val)}
                                            placeholder="Search Procedure..."
                                            renderOption={(item) => (
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>{item.name}</span>
                                                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.price}</span>
                                                </div>
                                            )}
                                        />
                                    </div>
                                    <button onClick={handleAddTimelineService} className="small-btn" style={{ width: "auto", padding: '0 15px', height: "38px", background: '#2563eb' }}>+ Add</button>
                                </div>
							</div>

                            <div className="form-group">
                                <button className="small-btn" onClick={addTimelineEntry} style={{ background: '#10b981', height: '38px', padding: '0 20px', fontWeight: 'bold' }}>Save Entry</button>
                            </div>

                            {selectedTimelineServices.length > 0 && (
                                <div style={{ gridColumn: '1 / -1', display: "flex", flexWrap: "wrap", gap: "6px", marginTop: '5px' }}>
                                    {selectedTimelineServices.map((svc) => (
                                        <span key={svc} style={{ background: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", border: '1px solid #dbeafe', display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: '500' }}>
                                            {svc}
                                            <button onClick={() => handleRemoveTimelineService(svc)} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: '900', color: "#2563eb" }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
						</div>
					)}

					<div className="timeline-list-compact" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
						{(timelineEntries || []).length === 0 ? <div className="muted-text">No timeline entries.</div> : (timelineEntries || []).map((entry) => (
							<div key={entry.id} className="timeline-item-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#fff', border: '1px solid #edf2f7', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
								<div style={{ display: 'flex', flex: 1, gap: '25px', alignItems: 'center' }}>
                                    <div style={{ minWidth: '140px' }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date/Time</div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{entry.start_time}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Procedures</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '3px' }}>
                                            {entry.procedure_text.split(", ").map((proc, index) => {
                                                return <span key={index} style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{proc}{index < entry.procedure_text.split(", ").length - 1 ? "," : ""}</span>;
                                            })}
                                        </div>
                                    </div>
                                    <div style={{ minWidth: '120px' }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Provider</div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>{entry.provider || "Dental Aide"}</div>
                                    </div>
                                </div>
								<div style={{ display: 'flex', gap: '15px', alignItems: 'center' }} />
							</div>
						))}
					</div>
				</section>

				<section className="medication-section">
					<h3 className="section-title">Medication (Year {selectedYear})</h3>
					{!isVisitReadOnly && (
						<div className="medication-form">
							<div style={{ position: 'relative' }}>
								<SearchableInput 
                                    options={clinicMedicationsList || []} 
                                    value={medicationForm.medicine} 
                                    onChange={(val) => updateMedicationForm("medicine", val)} 
                                    placeholder="Medicine (e.g. Amoxicillin)" 
                                />
							</div>
							<input className="pill-input-input" placeholder="Dosage (e.g., 500mg)" value={medicationForm.dosage} onChange={(e) => updateMedicationForm("dosage", e.target.value)} />
							<select className="pill-input-input" value={medicationForm.frequency} onChange={(e) => updateMedicationForm("frequency", e.target.value)}>
								<option value="" disabled>Select Frequency</option>
								{medicationFrequencyOptions.map((option) => (
									<option key={option} value={option}>{option}</option>
								))}
							</select>
							<input className="pill-input-input" placeholder="Notes" value={medicationForm.notes} onChange={(e) => updateMedicationForm("notes", e.target.value)} />
							<div className="medication-actions"><button className="small-btn" onClick={addMedication}>Add</button></div>
						</div>
					)}
					<div className="medication-list">
						{(medications || []).length === 0 ? <div className="muted-text">No medications listed.</div> : (medications || []).map((m) => (
							<div key={m.id} className="medication-entry"><strong>{m.medicine}</strong> — {m.dosage || ""} — {m.frequency || ""}<div className="muted-text">{m.notes}</div>{!isVisitReadOnly && <div className="medication-entry-actions"><button className="small-btn danger" onClick={() => deleteMedication(m.id)}>Delete</button></div>}</div>
						))}
					</div>
				</section>

				<section className="upload-section">
					<h3 className="section-title">Patient Gallery (Year {selectedYear})</h3>
					{!isVisitReadOnly && <input type="file" multiple accept="image/*" onChange={handleUpload} />}
					<div className="thumbnail-grid">
						{(uploadedFiles || []).length === 0 ? <div className="muted-text">No files uploaded yet.</div> : (uploadedFiles || []).map((file, index) => (
							<div key={index} className="thumbnail-item"><button onClick={() => openXrayViewer(file)}><img src={file.url} alt={file.name} /></button></div>
						))}
					</div>
					
					<div className="patient-notes-container" style={{ marginTop: '20px' }}>
						<h3 className="section-title">Visit Notes (Year {selectedYear})</h3>
						<textarea
							className="pill-input-input"
							placeholder="Add any additional notes for this year's visits..."
							value={vitals.notes || ""}
							onChange={(e) => updateVitals("notes", e.target.value)}
							disabled={isVisitReadOnly}
							style={{ width: '100%', minHeight: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
						/>
					</div>
				</section>

                <div className="form-actions-bottom" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
                    {!isVisitReadOnly ? (
                        <button className="done-btn" onClick={handleSaveAll} disabled={isSaving}>
                            {isSaving ? "Saving..." : (isDentistReviewing ? "Verify & Save Progress" : "Save Appointment Progress")}
                        </button>
                    ) : ( 
                        <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ✓ {isHistoryView ? "Completed Appointment Record (Read-Only)" : `Year ${selectedYear} is Historical (Read-Only)`}
                        </div> 
                    )}
                </div>

				<div className={`side-panel-backdrop${isPanelOpen ? " side-panel-open" : ""}`} onClick={closePanel}>
					<div className="side-panel" onClick={(e) => e.stopPropagation()}>
						<h3 className="section-title">{panelTitle}</h3>
						<div className="side-panel-content">
							{(panelOptions || []).length === 0 ? <p>Select a box to see options.</p> : <div className="options-grid">{(panelOptions || []).map((option) => (<button key={option.code} className="option-pill" onClick={() => applyCode(option.code)}><strong>{option.code || "Clear"}</strong><span>{option.label}</span></button>))}</div>}
						</div>
					</div>
				</div>
			</div>

			{isContextMenuOpen && contextMenu && (
				<div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={closeContextMenu}>
					<div className="options-grid">{((contextMenu.boxKind === "treatment" ? treatmentOptions : conditionOptions) || []).map((option) => (<button key={option.code} className="option-pill" onClick={() => applyCode(option.code)}><strong>{option.code || "Clear"}</strong><span>{option.label}</span></button>))}</div>
				</div>
			)}
			{isXrayViewerOpen && <XrayViewer file={selectedXray} onClose={closeXrayViewer} />}
			<PaymentModal
				isOpen={isPaymentModalOpen}
				onClose={handleClosePaymentModal}
				onSubmit={handleConfirmPayment}
				onContinueExisting={handleContinueExistingPayment}
				isSubmitting={isSaving}
				summary={paymentContext || {}}
				unpaidMatches={unpaidServiceMatches}
				initialValues={{
					total_due: "",
					is_deposit: false,
					payment_method: "cash",
					amount_paid_now: "",
					already_paid: 0,
				}}
				mode="create"
			/>
		</div>
	);
}

export default PatientForm;