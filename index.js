import axios from 'axios';//node library to make https requests
import dotenv from 'dotenv';//allows use to import all var from .env file to process.env object
dotenv.config();//loads all environment var from .env
import rules from './rules.js';
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from 'cookie-parser';
import authRoutes from './server/routes/auth.js';
import userRoutes from './server/routes/users.js';
const app = express();
import fs from "fs";
import mongoose from "mongoose";
// Read and sanitize MongoDB URI from environment (strip surrounding quotes/spaces)
const uri = process.env.uri;




app.use(bodyParser.json());


// Allow cross-origin requests during development and support cookies when needed
app.use(cors({ origin: true, credentials: true })); // reflect origin and allow credentials
app.use(express.json());
app.use(cookieParser());

// Serve static files (login page, other public assets) so the client is served from the
// same origin as the API. This prevents Google Identity 'authorization error blocked'
// caused by loading `login.html` via file:// or another origin not registered with Google.
app.use(express.static('public'));

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
const userSchema=new mongoose.Schema({
  empID:{type:String,required:true},
  id:{type:String,required:true},
    task:{type:String,required:true},
    startTime:{type:String,required:true},
    endTime:{type:String,required:true},
    status:{type:String,required:true},
  
})

const empIDSchema=new mongoose.Schema({
  empID:{type:String,unique:true,required:true},
  name:{type:String,required:true}
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

app.post("/addTask",async(req,res)=>{
    try{const body=req.body;
      const model=getModel();
    const result=await model.create({
      empID: body.empID,
      id:body.id,
        task:body.task,
        startTime:body.startTime,
        endTime:body.endTime,
        status:body.status
        
    })
    console.log("result:",result);
    return res.status(200).json({message:"Task added successfully",data:result});
    } catch(err){
        console.log("Error adding task:",err);
        return res.status(500).json({message:"Error adding task"});
    }
})



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
    const {empID, id, task, startTime, endTime, status } = req.body;
    const model=getModel();
    
    // Build update object with only provided fields
    const updateFields = {};
    updateFields.empID = empID;
    updateFields.task = task;
    updateFields.startTime = startTime;
    updateFields.endTime = endTime;
    updateFields.status = status;
    
    // update the document and return the updated document
    const updated = await model.findOneAndUpdate(
      { id },
      updateFields,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json({ message: "Task updated successfully", data: updated });
  } catch (err) {
    console.error("Error updating task:", err);
    return res.status(500).json({ message: "Internal Server Error", error: err.message });
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
app.use(authRoutes);
app.use(userRoutes);


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
