import axios from 'axios';//node library to make https requests
import dotenv from 'dotenv';//allows use to import all var from .env file to process.env object
dotenv.config();//loads all environment var from .env
import rules from './rules.js';
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import authRoutes, {requireAuth} from './server/routes/auth.js';

import userRoutes from './server/routes/users.js';
import invitationRoutes from './server/routes/invitations.js';
const app = express();
import fs from "fs";
import mongoose from "mongoose";
import draftRoutes from "./server/routes/draft.js";


// Read and sanitize MongoDB URI from environment (strip surrounding quotes/spaces)
const uri = process.env.uri;




app.use(bodyParser.json());
app.use(draftRoutes);

// Allow cross-origin requests during development and support cookies when needed
app.use(cors({ origin: true, credentials: true })); // reflect origin and allow credentials
app.use(express.json());
app.use(cookieParser());
app.use(authRoutes);
app.use('/login.html', express.static('public/login.html'));

app.use(requireAuth);
app.use(userRoutes);
app.use(invitationRoutes);
// Serve static files (login page, other public assets) so the client is served from the
// same origin as the API. This prevents Google Identity 'authorization error blocked'
// caused by loading `login.html` via file:// or another origin not registered with Google.


//mongoDB

//Connection

/**await mongoose.connect(uri)
.then(()=>{
    console.log("Connected to MongoDB");
})
.catch((err)=>{
    console.log("Error connecting to MongoDB:",err);
})**/


(async () => {
  try {
    if (!uri) {
      console.error('MONGODB URI is missing or empty. Check .env `uri` value.');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // start server only after DB connection
    const port = process.env.PORT || 5500;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1); // stop process to avoid buffered operations
  }
})();
//Schema
const userSchema = new mongoose.Schema({
  empID: { type: String, required: true },
  id: { type: String, required: true },
  task: { type: String, required: true },
  startTime: { type: String, required: true }, // now full datetime string
  endTime: { type: String, required: true },   // now full datetime string
  status: { type: String, required: true },
  proof: { type: String, required: false },
  durationHours: { type: Number, required: false }, // optional computed field
  submittedAt: { type: Date, default: Date.now } // when user marked task as done
});


const empIDSchema=new mongoose.Schema({
  empID:{type:String,unique:true,required:true},
  name:{type:String,required:true},
  trustScore: { type: Number, default: 80 }
})
const empIDModel=mongoose.model('empID',empIDSchema,'empID');



app.get("/getempID", async (req, res) => {
  try {
    const model = empIDModel;     // your Employee model
    const ids = await model.find({}).lean();

    return res.status(200).json({ employees: ids });  // return the actual IDs
  } catch (err) {
    console.error("Error fetching employee IDs:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
});



let currentCollection = 'system';
try {
  const saved = JSON.parse(fs.readFileSync("./currentCollection.json", "utf8"));
  if (saved.name) {
    currentCollection = saved.name;
    console.log(`Restored last used collection: ${currentCollection}`);
  }
} catch (err) {
  console.log("No saved collection found, using default 'users'");
}
//
function getModel() {
  if (mongoose.models[currentCollection]) {
    return mongoose.models[currentCollection];
  }
  return mongoose.model(currentCollection, userSchema, currentCollection);
}

app.post("/addTask", async (req, res) => {
  try {
    const body = req.body;
    // validate required fields
    if (!body.empID || !body.id || !body.task || !body.startTime || !body.endTime || !body.status) {
      return res.status(400).json({ message: "Missing required fields (empID,id,task,startTime,endTime,status)" });
    }

    // parse datetimes (frontend sends full datetime strings like "2025-12-10 10:00")
    const start = new Date(body.startTime);
    const end = new Date(body.endTime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid startTime or endTime. Use a full datetime string like 'YYYY-MM-DD HH:MM' or an ISO string." });
    }
    if (end <= start) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    const durationHours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100; // keep 2 decimals

    const model = getModel();
    const result = await model.create({
      empID: body.empID,
      id: body.id,
      task: body.task,
      startTime: body.startTime,
      endTime: body.endTime,
      status: body.status,
      proof: body.proof || "",
      durationHours
    });

    console.log("result:", result);
    return res.status(200).json({ message: "Task added successfully", data: result });
  } catch (err) {
    console.log("Error adding task:", err);
    return res.status(500).json({ message: "Error adding task", error: err.message });
  }
});




app.delete("/deleteTask", async (req, res) => {
    let body= req.body;
  const taskId = body.id; // get task id from request body
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }
  try {
    const model=getModel();
    await model.deleteOne({ id: taskId });
   
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// ...existing code...
app.put("/updateTask", async (req, res) => {
  try {
    const { empID, id, task, startTime, endTime, status, proof, submittedAt } = req.body;
    if (!id) return res.status(400).json({ message: "Task id is required" });

    const model = getModel();

    // 🔹 Fetch previous version FIRST (for trust transition check)
    const previous = await model.findOne({ id }).lean();
    if (!previous) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 🔹 Build update object
    const updateFields = {};
    if (empID !== undefined) updateFields.empID = empID;
    if (task !== undefined) updateFields.task = task;
    if (startTime !== undefined) updateFields.startTime = startTime;
    if (endTime !== undefined) updateFields.endTime = endTime;
    if (status !== undefined) updateFields.status = status;
    if (proof !== undefined) updateFields.proof = proof;
    if (submittedAt) updateFields.submittedAt = new Date(submittedAt);

    // 🔹 Recompute duration if time changed
    if (startTime !== undefined || endTime !== undefined) {
      const s = startTime ? new Date(startTime) : new Date(previous.startTime);
      const e = endTime ? new Date(endTime) : new Date(previous.endTime);

      if (isNaN(s) || isNaN(e) || e <= s) {
        return res.status(400).json({ message: "Invalid startTime or endTime" });
      }

      updateFields.durationHours =
        Math.round(((e - s) / (1000 * 60 * 60)) * 100) / 100;
    }

    // 🔹 Apply task update
    const updated = await model.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { new: true }
    );

    // ==========================================================
    // ✅ TRUST SCORE UPDATE — ONCE, SAFE, TRANSITION-BASED
    // ==========================================================
    if (
  submittedAt &&
  (status === "complete" || status === "completedLate") &&
  previous.status !== "complete" &&
  previous.status !== "completedLate"
) {
  const doneAt = new Date(submittedAt);
  const dueAt = new Date(previous.endTime);

  if (!isNaN(doneAt) && !isNaN(dueAt)) {
    const deltaMin = (doneAt - dueAt) / (1000 * 60);

    let change = 0;
    if (deltaMin <= -5) change = +2;
    else if (deltaMin <= 10) change = 0;
    else if (deltaMin <= 30) change = -1;
    else if (deltaMin <= 60) change = -3;
    else if (deltaMin <= 180) change = -6;
    else change = -10;

    const targetEmpID = empID || previous.empID;

    const empDoc = await empIDModel.findOne({ empID: targetEmpID }).lean();
    if (!empDoc) return;

    let newScore = (empDoc.trustScore ?? 80) + change;
    newScore = Math.max(10, Math.min(100, newScore));

    await empIDModel.updateOne(
      { empID: targetEmpID },
      { $set: { trustScore: newScore } }
    );

    console.log(`[TrustScore] ${targetEmpID}: ${empDoc.trustScore} → ${newScore}`);
  }
}

    // ==========================================================

    return res.status(200).json({
      message: "Task updated successfully",
      data: updated
    });

  } catch (err) {
    console.error("Error updating task:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
});



app.post("/endDay", async (req, res) => {
  try {
    const { title } = req.body; // frontend sends { title: "Day_25_10_2025" }

    if (!title) {
      return res.status(400).json({ message: "Title (collection name) required" });
    }

    // Switch to the new collection
    currentCollection = title;
    fs.writeFileSync("./currentCollection.json", JSON.stringify({ name: title }));

    console.log(`Switched and saved current collection: ${currentCollection}`);
    return res.status(200).json({ message: `New collection '${title}' created successfully` });
  } catch (err) {
    console.error("Error creating collection:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});
//
// ...existing code...

//mongoDB





const token = process.env.deepseek_key;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";//where script sends https requests to ai model
const model = "deepseek/deepseek-r1-0528-qwen3-8b:free";

async function main(api) {
    try {
        const response = await axios.post(endpoint, {
            messages: [
                { role: "user", content: api }//format of ai api
            ],
            model: model
        }, {
            headers: {//headers r details while messages r what we send
                'Authorization': `Bearer ${token}`,//to authorize request
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("The sample encountered an error:", error.response?.data || error.message);
    }
}
app.post("/evaluate-reason", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason required" });
    main(rules);
    const evaluation = await main(reason);
    res.json({ evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ evaluation: "Server error" });
  }
});
//displaying data
app.get("/getAllCollections", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const allCollectionsData = {};

    for (const collection of collections) {
      const name = collection.name;
      

      const docs = await db.collection(name).find({}).toArray(); // native
      allCollectionsData[name] = docs;
    }

    res.json({ collections: allCollectionsData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mount new auth/user routes (these use cookies for session)


// everything below requires login

import path from "path";

app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});




// Debug-only: list all invitations (enable by setting DEBUG_INBOX=true in env)
if (process.env.DEBUG_INBOX === 'true') {
  import('./server/models/invitation.js').then(mod => {
    const Invitation = mod.default;
    app.get('/debug/invitations', async (req, res) => {
      try {
        const all = await Invitation.find({}).lean();
        return res.json({ invitations: all });
      } catch (err) {
        console.error('debug invitations error', err);
        return res.status(500).json({ error: err.message });
      }
    });
  }).catch(err => console.error('Could not mount debug route', err));
}


// Get tasks from current collection only
app.get("/getCurrentTasks", async (req, res) => {
  try {
    const empID = req.query.empID;   // <---- get employee filter
    const model = getModel();
    console.log("Current collection:", currentCollection);
    let filter = {};
    if (empID) filter.empID = empID;  // <---- apply filter if provided

    const tasks = await model.find(filter).lean();
    
    return res.status(200).json({ tasks, collection: currentCollection });
  } catch (err) {
    console.error("Error fetching current tasks:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
});

//displaying data

//switching employee
app.get("/switchEmp", async (req, res) => {
  try {
    const employees = await empIDModel.find({}).lean();
    return res.status(200).json({ employees });
  } catch (err) {
    console.error("Error fetching employee IDs:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
});

