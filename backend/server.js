import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/ai", async (req, res) => {
  try {
    const { userInput, option } = req.body;
    if (!userInput || !option) {
      return res.status(400).json({ error: "Missing input or option" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";

    if (option === "one-shot") {
      prompt = `
System: You are an AI assistant. Follow the RTFC framework (Role, Task, Format, Context).
Always return output in valid JSON ONLY with this schema:
{
  "task": string,
  "input": string,
  "output": string
}

User: Task: Summarize this text
User Input: "Artificial Intelligence is transforming industries worldwide."
Assistant Output: {
  "task": "Summarize text",
  "input": "Artificial Intelligence is transforming industries worldwide.",
  "output": "AI is changing industries globally."
}

System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "zero-shot") {
      prompt = `
System: You are an AI assistant. Follow RTFC and return only valid JSON with fields {task, input, output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "multi-shot") {
      prompt = `
System: You are an AI assistant. Follow RTFC and return only valid JSON.

Example 1:
{
  "task": "Summarize text",
  "input": "Artificial Intelligence is transforming industries worldwide.",
  "output": "AI is changing industries globally."
}

Example 2:
{
  "task": "Translate text to French",
  "input": "Hello, how are you?",
  "output": "Bonjour, comment ça va?"
}

Example 3:
{
  "task": "Convert to uppercase",
  "input": "innovation drives growth",
  "output": "INNOVATION DRIVES GROWTH"
}

System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "chain-of-thought") {
      prompt = `
System: You are an AI assistant. Think step by step internally but return ONLY the final structured JSON.
Schema: {task, input, output}
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "system-user") {
      prompt = `
System: You are an AI assistant. Strictly return JSON with {task, input, output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "dynamic") {
      let dynamicTask = "General Task";
      if (userInput.length > 200) {
        dynamicTask = "Summarize the following long text concisely";
      } else if (userInput.includes("?")) {
        dynamicTask = "Answer the following question clearly";
      } else if (userInput.match(/translate to/i)) {
        dynamicTask = "Translate the following text accordingly";
      }

      prompt = `
System: You are an AI assistant. Use dynamic prompting but always return valid JSON {task, input, output}.
User: Task: ${dynamicTask}
User Input: ${userInput}
Assistant Output:
`;
    } else {
      prompt = `
System: You are an AI assistant. Perform the task but always return JSON {task, input, output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    }

    const tokenInfo = await model.countTokens(prompt);
    console.log(`🔢 Tokens used for this request: ${tokenInfo.totalTokens}`);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        stopSequences: ["Assistant Output:"],
      },
    });

    let responseText = result.response.text();

    let structuredOutput;
    try {
      structuredOutput = JSON.parse(responseText);
    } catch (e) {
      structuredOutput = {
        task: option,
        input: userInput,
        output: responseText.trim(),
      };
    }

    res.json({ response: structuredOutput, tokens: tokenInfo.totalTokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
