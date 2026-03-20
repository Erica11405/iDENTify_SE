const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 1. Import Routes - FIXED: changed from "./works/appointments" to "./routes/appointments"
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

const app = express();

// 2. CORS - Ensure this matches your DigitalOcean Frontend URL AND Local testing URL
app.use(cors({
    origin: [
        "https://identify-app-hth8t.ondigitalocean.app", // Production URL
        "http://localhost:5173" // Local Vite URL for testing
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. DigitalOcean Health Checks
app.get('/', (req, res) => res.status(200).send('API is Live'));
app.get('/health', (req, res) => res.status(200).send('Healthy'));

// 4. Router setup
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes); 
apiRouter.use("/patients", patientsRoutes);
apiRouter.use("/annual-records", annualRecordsRoutes);
apiRouter.use("/appointments", appointmentsRoutes);
apiRouter.use("/queue", queueRoutes);
apiRouter.use("/tooth-conditions", toothConditionsRoutes);
apiRouter.use("/treatment-timeline", treatmentTimelineRoutes);
apiRouter.use("/medications", medicationsRoutes);
apiRouter.use("/dentists", dentistsRoutes);
apiRouter.use("/treatments", treatmentsRoutes);
apiRouter.use("/reports", reportsRoutes);

app.use("/api", apiRouter); 
app.use("/", apiRouter); 

// 5. Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});