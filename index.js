import axios from 'axios';//node library to make https requests
import dotenv from 'dotenv';//allows use to import all var from .env file to process.env object
dotenv.config();//loads all environment var from .env
import rules from './rules.js';
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
const app = express();


const uri = "mongodb://127.0.0.1:27017";



app.use(bodyParser.json());


app.use(cors()); // allow all origins for testing
app.use(express.json());

//mongoDB
import mongoose from "mongoose";
//Connection

mongoose.connect("mongodb://127.0.0.1:27017/taskManagerDB")
.then(()=>{
    console.log("Connected to MongoDB");
})
.catch((err)=>{
    console.log("Error connecting to MongoDB:",err);
})

//Schema
const userSchema=new mongoose.Schema({
  id:{type:String,required:true},
    task:{type:String,required:true},
    startTime:{type:String,required:true},
    endTime:{type:String,required:true},
    status:{type:String,required:true},
  
})

const User = new mongoose.model("users",userSchema);

let currentCollection = 'users';
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
    const { id, task, startTime, endTime, status } = req.body;
    const model=getModel();
    // update the document and return the updated document
    const updated = await model.findOneAndUpdate(
      { id },
      { task, startTime, endTime, status },
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

    // Dynamically create a new model with the collection name as 'title'
    const DynamicModel = mongoose.model(title, userSchema, title);

    // Optional: insert a dummy doc to make sure the collection is created
    await DynamicModel.create({
      id: Date.now().toString(),
      task: "Daily summary placeholder",
      startTime: "00:00",
      endTime: "23:59",
      status: "complete",
    });
currentCollection = title;
    return res.status(200).json({ message: `New collection '${title}' created successfully` });
  } catch (err) {
    console.error("Error creating collection:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

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


app.listen(5500, () => console.log("Server running on port 5500"));