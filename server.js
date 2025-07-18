// server.js - Enhanced Productive Professor (Minimal Version)
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

// Simple in-memory storage
const conversations = new Map();
const teachers = new Map();
const classes = new Map();
const students = new Map();

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

// Generate unique codes
function generateCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Teacher registration
app.post('/api/teacher/register', (req, res) => {
    try {
        const { name, email, password, school } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if teacher already exists
        for (const teacher of teachers.values()) {
            if (teacher.email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
        }

        const teacherId = 'teacher_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const teacher = {
            id: teacherId,
            name,
            email,
            password, // In production, hash this!
            school: school || '',
            createdAt: new Date().toISOString(),
            classes: []
        };

        teachers.set(teacherId, teacher);
        
        res.json({ 
            success: true, 
            teacherId,
            teacher: {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email,
                school: teacher.school
            }
        });
    } catch (error) {
        console.error('Teacher registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Teacher login
app.post('/api/teacher/login', (req, res) => {
    try {
        const { email, password } = req.body;

        for (const teacher of teachers.values()) {
            if (teacher.email === email && teacher.password === password) {
                return res.json({
                    success: true,
                    teacher: {
                        id: teacher.id,
                        name: teacher.name,
                        email: teacher.email,
                        school: teacher.school
                    }
                });
            }
        }

        res.status(401).json({ error: 'Invalid email or password' });
    } catch (error) {
        console.error('Teacher login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Create class
app.post('/api/teacher/create-class', async (req, res) => {
    try {
        const { teacherId, className, subject, description } = req.body;
        
        console.log('Create class request:', { teacherId, className, subject, description });
        
        const teachers = await readDB(TEACHERS_DB);
        console.log('Teachers in database:', Object.keys(teachers));
        console.log('Looking for teacher:', teacherId);
        
        if (!teachers[teacherId]) {
            console.log('Teacher not found!');
            return res.status(404).json({ error: 'Teacher not found' });
        }
        
        // rest of the function...

        const classId = 'class_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const joinCode = generateCode();
        
        const classData = {
            id: classId,
            teacherId,
            name: className,
            subject: subject || 'general',
            description: description || '',
            joinCode,
            createdAt: new Date().toISOString(),
            students: [],
            conversations: []
        };

        classes.set(classId, classData);
        
        // Add class to teacher's class list
        const teacher = teachers.get(teacherId);
        teacher.classes.push(classId);

        res.json({ success: true, class: classData });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ error: 'Failed to create class' });
    }
});

// Get teacher's classes
app.get('/api/teacher/:teacherId/classes', (req, res) => {
    try {
        const { teacherId } = req.params;
        
        if (!teachers.has(teacherId)) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const teacher = teachers.get(teacherId);
        const teacherClasses = teacher.classes.map(classId => {
            const classData = classes.get(classId);
            return {
                ...classData,
                studentCount: classData ? classData.students.length : 0,
                recentActivity: classData ? classData.conversations.length : 0
            };
        });

        res.json({ classes: teacherClasses });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Failed to get classes' });
    }
});

// Student join class
app.post('/api/student/join', (req, res) => {
    try {
        const { joinCode, studentName } = req.body;

        if (!joinCode || !studentName) {
            return res.status(400).json({ error: 'Join code and student name are required' });
        }

        // Find class by join code
        let targetClass = null;
        for (const classData of classes.values()) {
            if (classData.joinCode === joinCode.toUpperCase()) {
                targetClass = classData;
                break;
            }
        }

        if (!targetClass) {
            return res.status(404).json({ error: 'Invalid join code' });
        }

        const studentId = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const student = {
            id: studentId,
            name: studentName,
            classId: targetClass.id,
            joinedAt: new Date().toISOString(),
            conversationCount: 0
        };

        students.set(studentId, student);
        targetClass.students.push(studentId);

        res.json({ 
            success: true, 
            studentId,
            class: {
                id: targetClass.id,
                name: targetClass.name,
                subject: targetClass.subject,
                description: targetClass.description
            }
        });
    } catch (error) {
        console.error('Student join error:', error);
        res.status(500).json({ error: 'Failed to join class' });
    }
});

// Enhanced chat endpoint with student tracking
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, studentId, promptTitle } = req.body;
        
        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message and sessionId are required' });
        }

        // Get or create conversation history
        let conversation = conversations.get(sessionId) || [];
        
        // Add user message
        conversation.push({ role: 'user', content: message });
        
        // Prepare system prompt
        let systemPrompt = SYSTEM_PROMPT;
        if (promptTitle) {
            systemPrompt += `\n\nCurrent Assignment Context: The student is working on "${promptTitle}". Frame your responses to help them specifically with this type of analytical thinking.`;
        }

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
                system: systemPrompt,
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

        // Track student activity
        if (studentId && students.has(studentId)) {
            const student = students.get(studentId);
            student.conversationCount++;
            student.lastActivity = new Date().toISOString();

            // Add conversation to class tracking
            const classData = classes.get(student.classId);
            if (classData) {
                classData.conversations.push({
                    sessionId,
                    studentId,
                    timestamp: new Date().toISOString(),
                    promptTitle: promptTitle || 'General Discussion',
                    messageCount: conversation.length
                });
            }
        }
        
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

// Serve the main chat interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Serve teacher dashboard
app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

// Serve student dashboard
app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.listen(PORT, () => {
    console.log(`Productive Professor server running on port ${PORT}`);
});

// Cleanup old conversations periodically
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, conversation] of conversations.entries()) {
        if (conversation.length === 0 || (now - conversation[0].timestamp > 24 * 60 * 60 * 1000)) {
            conversations.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);
