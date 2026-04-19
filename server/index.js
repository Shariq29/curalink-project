import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send("Server is running 🚀");
});

// Chat API route
app.post('/chat', (req, res) => {
  const { query } = req.body;

  console.log("Received query:", query);

  // Safety check
  if (!query) {
    return res.json({
      query: "No query received",
      results: [],
      summary: {
        overview: "No query was provided.",
        key_findings: [],
        trials: [],
        sources: []
      }
    });
  }

  // Dummy response (for demo)
  res.json({
    query,
    results: [
      { type: "paper", title: "Study on Diabetes Treatment (2024)" },
      { type: "trial", title: "Clinical Trial for Diabetes Drug", status: "Recruiting", location: ["USA"] }
    ],
    summary: {
      overview: `Here is a summary for "${query}". This is a demo medical research response.`,
      key_findings: [
        `${query} is actively researched in recent medical studies.`,
        `New therapies and treatments are being explored for ${query}.`
      ],
      trials: [
        "Trial A - Recruiting - USA",
        "Trial B - Completed - India"
      ],
      sources: [
        "PubMed Study 2024",
        "OpenAlex Research Paper 2023"
      ]
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});