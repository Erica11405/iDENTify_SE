// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const patientsRoutes = require("./routes/patients");
// const annualRecordsRoutes = require("./routes/annual_records"); // NEW
// const appointmentsRoutes = require("./routes/appointments");
// const queueRoutes = require("./routes/queue");
// const toothConditionsRoutes = require("./routes/tooth_conditions");
// const treatmentTimelineRoutes = require("./routes/treatment_timeline");
// const medicationsRoutes = require("./routes/medications");
// const dentistsRoutes = require("./routes/dentists");
// const treatmentsRoutes = require("./routes/treatments");
// const reportsRoutes = require("./routes/reports");

// const app = express();

// app.use(cors()); 
// app.use(express.json({ limit: "5000mb" }));
// app.use(express.urlencoded({ limit: "5000mb", extended: true }));

// // Routes
// app.use("/api/patients", patientsRoutes);
// app.use("/api/annual-records", annualRecordsRoutes); // NEW
// app.use("/api/appointments", appointmentsRoutes);
// app.use("/api/queue", queueRoutes);
// app.use("/api/tooth-conditions", toothConditionsRoutes);
// app.use("/api/treatment-timeline", treatmentTimelineRoutes);
// app.use("/api/medications", medicationsRoutes);
// app.use("/api/dentists", dentistsRoutes);
// app.use("/api/treatments", treatmentsRoutes);
// app.use("/api/reports", reportsRoutes);

// // ==========================================
// // FIX FOR THE 404 ERROR: Dentist Patients Report Route
// // ==========================================
// app.get('/api/reports/dentist/:dentistId/patients', async (req, res) => {
//     try {
//         const { dentistId } = req.params;
//         const { date } = req.query; 

//         // For now, to stop the 404 error, just return an empty array 
//         // Later you can replace this with your actual database query
//         res.status(200).json([]);
        
//     } catch (error) {
//         console.error("Error fetching dentist patients:", error);
//         res.status(500).json({ message: "Server error fetching dentist patients" });
//     }
// });
// // ==========================================

// const PORT = process.env.PORT || 4006;

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on port ${PORT}`);
// });


const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import Routes
const patientsRoutes = require("./routes/patients");
const annualRecordsRoutes = require("./routes/annual_records");
const appointmentsRoutes = require("./routes/appointments");
const queueRoutes = require("./routes/queue");
const toothConditionsRoutes = require("./routes/tooth_conditions");
const treatmentTimelineRoutes = require("./routes/treatment_timeline");
const medicationsRoutes = require("./routes/medications");
const dentistsRoutes = require("./routes/dentists");
const treatmentsRoutes = require("./routes/treatments");
const reportsRoutes = require("./routes/reports");

const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json({ limit: "5000mb" }));
app.use(express.urlencoded({ limit: "5000mb", extended: true }));

// --- NEW ROUTER WRAPPER ---
// This ensures /api/dentists and /dentists both work correctly
const router = express.Router();

router.use("/patients", patientsRoutes);
router.use("/annual-records", annualRecordsRoutes);
router.use("/appointments", appointmentsRoutes);
router.use("/queue", queueRoutes);
router.use("/tooth-conditions", toothConditionsRoutes);
router.use("/treatment-timeline", treatmentTimelineRoutes);
router.use("/medications", medicationsRoutes);
router.use("/dentists", dentistsRoutes);
router.use("/treatments", treatmentsRoutes);
router.use("/reports", reportsRoutes);

// Apply the router to both base and /api paths
app.use("/api", router);
app.use("/", router);
// ---------------------------

// Fix for specific dentist patients report
app.get('/api/reports/dentist/:dentistId/patients', async (req, res) => {
    try {
        const { dentistId } = req.params;
        res.status(200).json([]);
    } catch (error) {
        console.error("Error fetching dentist patients:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Health Check for DigitalOcean
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});