// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// // Import Routes
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

// const app = express();

// app.use(cors()); 
// app.use(express.json({ limit: "50mb" })); // Standardized limit
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// // --- THE FIX: ROUTE WRAPPER ---
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

// // This ensures requests for /api/dentists AND /dentists both work
// app.use("/api", apiRouter);
// app.use("/", apiRouter);

// // Health Check for DigitalOcean
// app.get('/health', (req, res) => {
//     res.status(200).send('Server is healthy');
// });

// // Standard port for DigitalOcean App Platform
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on port ${PORT}`);
// });


// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// // Import Routes
// const patientsRoutes = require("./routes/patients");
// const annualRecordsRoutes = require("./routes/annual_records");
// const appointmentsRoutes = require("./routes/appointments"); // Verified path
// const queueRoutes = require("./routes/queue");
// const toothConditionsRoutes = require("./routes/tooth_conditions");
// const treatmentTimelineRoutes = require("./routes/treatment_timeline");
// const medicationsRoutes = require("./routes/medications");
// const dentistsRoutes = require("./routes/dentists");
// const treatmentsRoutes = require("./routes/treatments");
// const reportsRoutes = require("./routes/reports");

// const app = express();

// app.use(cors()); 
// app.use(express.json({ limit: "50mb" })); 
// app.use(express.urlencoded({ limit: "50mb", extended: true }));

// // Route Wrapper
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

// // Supports both /api/appointments and /appointments
// app.use("/api", apiRouter);
// app.use("/", apiRouter);

// app.get('/health', (req, res) => {
//     res.status(200).send('Server is healthy');
// });

// const PORT = process.env.PORT || 8080;
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on port ${PORT}`);
// });



const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 1. Import Routes from your routes folder
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

// 2. Middleware
app.use(cors()); 
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. Route Wrapper
// This creates a central hub for all your API endpoints
const apiRouter = express.Router();

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

// 4. Apply the Router
// This ensures that both /api/appointments and /appointments work correctly
app.use("/api", apiRouter);
app.use("/", apiRouter);

// 5. Health Check for DigitalOcean
// DigitalOcean uses this to make sure your app hasn't crashed
app.get('/health', (req, res) => {
    res.status(200).send('Server is healthy');
});

// 6. Start the Server
// DigitalOcean App Platform provides the PORT automatically via environment variables
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});