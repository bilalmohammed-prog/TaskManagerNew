import axios from 'axios';//node library to make https requests
import dotenv from 'dotenv';//allows use to import all var from .env file to process.env object
dotenv.config();//loads all environment var from .env
import rules from './rules.js';
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

import cors from "cors";
app.use(cors()); // allow all origins for testing
app.use(express.json());


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

    const evaluation = await main(reason) || "No evaluation returned";
    res.json({ evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ evaluation: "Server error" });
  }
});





app.listen(5500, () => console.log("Server running on port 5500"));