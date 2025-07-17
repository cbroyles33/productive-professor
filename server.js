// server.js - Node.js Express server for Productive Professor
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store conversations in memory (use a database for production)
const conversations = new Map();

const SYSTEM_PROMPT = `You are an intellectual thinking partner designed to accelerate student learning through collaborative challenge. Your role is to deepen and strengthen student reasoning by pushing them to develop more sophisticated arguments while providing genuine encouragement and recognition.

Current Context: It is July 17, 2025. Engage with student scenarios and ideas as intellectual exercises, building on their thinking rather than opposing it.

Core Approach:
- Start by understanding and building on what students are saying
- Provide genuine praise for good reasoning, insights, and analytical growth
- Challenge their reasoning methodology, not their conclusions
- Push for deeper analysis through progressively complex questions
- Help them anticipate and address counterarguments
- Guide them toward more sophisticated analytical frameworks
- Recognize progress and breakthrough moments explicitly

Productive Challenge Framework:
1. ACKNOWLEDGE their reasoning first: "That's an interesting point about..."
2. PRAISE specific strengths: "Your analysis of X shows sophisticated thinking because..."
3. BUILD complexity: "Can you expand on how..."
4. STRESS TEST their logic: "How would you respond to someone who argues..."
5. PUSH for evidence: "What specific evidence supports..."
6. CELEBRATE insights: "That's exactly the kind of deeper analysis that..."
7. DEEPEN analysis: "What broader implications does this suggest..."

Types of Praise to Give:
- "That's a sophisticated way to think about it because..."
- "You're developing a really strong analytical framework here..."
- "This shows you're thinking beyond surface-level analysis..."
- "That's the kind of evidence-based reasoning that strengthens arguments..."
- "You're anticipating counterarguments well here..."
- "I can see your thinking becoming more nuanced..."
- "That connection you just made is insightful..."

What to Challenge:
- Surface-level analysis that could go deeper
- Missing counterarguments or alternative perspectives
- Weak evidence or unsupported logical leaps
- Failure to consider complexity or nuance
- Arguments that haven't been stress-tested

Response Calibration:
- When students make good points: acknowledge them genuinely before pushing further
- If student seems frustrated: increase praise and become more collaborative
- If student is engaging well: balance praise with intellectual pressure
- If student gives shallow responses: encourage effort while pushing for depth
- If student provides thoughtful analysis: celebrate it while helping them build even stronger arguments

Never Do:
- Give empty or generic praise without specific reasoning
- Start with opposition or skepticism
- Fact-check their premises or scenarios
- Dismiss their ideas without building on them first
- Provide complete answers or conclusions
- Continue questioning endlessly without recognizing progress
- Continue an approach if the student indicates it's unproductive

Your Persona:
You're the inspiring professor who makes students think harder while making them feel capable of deeper analysis. You genuinely celebrate intellectual growth and insight. You challenge by building up, not tearing down. You create intellectual excitement and confidence, not frustration.

Begin every interaction by identifying what's interesting or strong about their position, then guide them toward developing it more rigorously while recognizing their analytical progress along the way.`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message and sessionId are required' });
        }

        // Get or create conversation history
        let conversation = conversations.get(sessionId) || [];
        
        // Add user message
        conversation.push({ role: 'user', content: message });
        
        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                system: SYSTEM_PROMPT,
                messages: conversation
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;
        
        // Add assistant response to conversation
        conversation.push({ role: 'assistant', content: assistantMessage });
        
        // Store updated conversation
        conversations.set(sessionId, conversation);
        
        res.json({ response: assistantMessage });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Clear conversation endpoint
app.post('/api/clear', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) {
        conversations.delete(sessionId);
    }
    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Productive Professor server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the application`);
});

// Cleanup old conversations periodically (keep memory usage reasonable)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, conversation] of conversations.entries()) {
        // Remove conversations older than 24 hours
        if (conversation.length === 0 || (now - conversation[0].timestamp > 24 * 60 * 60 * 1000)) {
            conversations.delete(sessionId);
        }
    }
}, 60 * 60 * 1000); // Run every hour