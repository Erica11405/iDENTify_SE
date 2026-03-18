// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// // 1. Import Routes
// const patientsRoutes = require("./routes/patients");
// const annualRecordsRoutes = require("./routes/annual_records");
// const appointmentsRoutes = require("./routes/appointments");
// const queueRoutes = require("./routes/queue");
// const toothConditionsRoutes = require("./routes/tooth_conditions");
// const treatmentTimelineRoutes = require("./routes/treatment_timeline");
// const medicationsRoutes = require("./routes/medications");
// const dentistsRoutes = require("./routes/dentists");
// const treatmentsRoutes = require("./routes/treatments");
// const reportsRoutes = require("./routes/reports");
// const authRoutes = require("./routes/auth"); 

// const app = express();

// // 2. Middleware
// app.use(cors()); 
// app.use(express.json({ limit: "50mb" })); 
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// // ==========================================
// // 3. HEALTH CHECKS (Must go BEFORE routers)
// // ==========================================
// // This catches the root ping
// app.get('/', (req, res) => {
//     res.status(200).send('iDENTify API is successfully running!');
// });

// // This catches the standard health ping
// app.get('/health', (req, res) => {
//     res.status(200).send('Server is healthy');
// });

// // This catches it if DigitalOcean forces the /api routing rule
// app.get('/api/health', (req, res) => {
//     res.status(200).send('API is healthy');
// });

// // 4. Route Wrapper
// const apiRouter = express.Router();
// apiRouter.use("/patients", patientsRoutes);
// apiRouter.use("/annual-records", annualRecordsRoutes);
// apiRouter.use("/appointments", appointmentsRoutes);
// apiRouter.use("/queue", queueRoutes);
// apiRouter.use("/tooth-conditions", toothConditionsRoutes);
// apiRouter.use("/treatment-timeline", treatmentTimelineRoutes);
// apiRouter.use("/medications", medicationsRoutes);
// apiRouter.use("/dentists", dentistsRoutes);
// apiRouter.use("/treatments", treatmentsRoutes);
// apiRouter.use("/reports", reportsRoutes);
// apiRouter.use("/auth", authRoutes); 

// // 5. Apply the Router
// app.use("/api", apiRouter);
// app.use("/", apiRouter);

// // 6. Start the Server
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on port ${PORT}`);
// });


const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 1. Import Routes
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

// 2. Middleware
app.use(cors()); 
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. Health Checks (Required for DigitalOcean to pass deployment)
app.get('/', (req, res) => {
    res.status(200).send('iDENTify API is successfully running!');
});

app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

// 4. API Router Wrapper
const apiRouter = express.Router();

// These routes are prefixed by whatever we use in app.use()
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

// 5. THE CRITICAL FIX: Double-mounting the router
// This ensures that BOTH https://.../api/auth/login AND https://.../auth/login work.
// This solves 404s caused by URL prefix mismatches between frontend and backend.
app.use("/api", apiRouter); 
app.use("/", apiRouter); 

// 6. Start the Server
const PORT = process.env.PORT || 8080;
// We add '0.0.0.0' to ensure the app binds to all network interfaces on DigitalOcean
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});