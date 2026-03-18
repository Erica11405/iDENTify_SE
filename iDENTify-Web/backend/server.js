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

// 3. Health Checks (Must go BEFORE routers)
app.get('/', (req, res) => {
    res.status(200).send('iDENTify API is successfully running!');
});

app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

// 4. API Router Wrapper
const apiRouter = express.Router();

// Mount all feature routes to the apiRouter
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
apiRouter.use("/auth", authRoutes); // This makes the path: /api/auth/login

// 5. Apply the API Router to the app under /api
// This prefix combines with the routes above
app.use("/api", apiRouter); 

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});