const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Force Node.js to run in Philippine Standard Time
process.env.TZ = "Asia/Manila";

// 1. Import ALL Routes cleanly at the top
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
const authRoutes = require("./routes/auth"); 
const adminUsersRoutes = require("./routes/admin_users");
const servicesRoutes = require("./routes/services"); 
const clinicMedicationsRoutes = require("./routes/clinic_medications"); 
const dentistTypesRoutes = require("./routes/dentist_types");
const paymentsRoutes = require("./routes/payments");
const clinicsRoutes = require("./routes/clinics");
const superadminRequestsRoutes = require("./routes/superadmin_requests");
const patientReportsRoutes = require("./routes/patient_reports");
const notificationsRoutes = require("./routes/notifications");

const app = express();

const configuredOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...configuredOrigins];

if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:5173");
}

// 2. CORS - Allow Production and Local Vite URLs
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some(ao => origin.startsWith(ao)) || 
                         origin.endsWith(".ondigitalocean.app");
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-role", "x-user-id", "x-user-dentist-id"]
}));

app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. DigitalOcean Health Checks
app.get('/', (req, res) => res.status(200).send('API is Live'));
app.get('/health', (req, res) => res.status(200).send('Healthy'));

// 4. Router setup - Unified under apiRouter
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes); 
apiRouter.use("/patients", patientsRoutes);
apiRouter.use("/services", servicesRoutes);
apiRouter.use("/clinic-medications", clinicMedicationsRoutes);
apiRouter.use("/dentist-types", dentistTypesRoutes);
apiRouter.use("/annual-records", annualRecordsRoutes);
apiRouter.use("/appointments", appointmentsRoutes);
apiRouter.use("/queue", queueRoutes);
apiRouter.use("/tooth-conditions", toothConditionsRoutes);
apiRouter.use("/treatment-timeline", treatmentTimelineRoutes);
apiRouter.use("/medications", medicationsRoutes);
apiRouter.use("/dentists", dentistsRoutes);
apiRouter.use("/treatments", treatmentsRoutes);
apiRouter.use("/reports", reportsRoutes);
apiRouter.use("/admin/users", adminUsersRoutes);
apiRouter.use("/payments", paymentsRoutes);
apiRouter.use("/clinics", clinicsRoutes);
apiRouter.use("/superadmin-requests", superadminRequestsRoutes);
apiRouter.use("/patient-reports", patientReportsRoutes);
apiRouter.use("/notifications", notificationsRoutes);

// Apply the unified router to the app
app.use("/api", apiRouter); 
app.use("/", apiRouter); 

// 5. Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});