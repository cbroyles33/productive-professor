// server.js - Hybrid Productive Professor (In-Memory + Features)
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

// In-memory storage (will reset on server restart, but works reliably)
const teachers = new Map();
const classes = new Map();
const students = new Map();
const conversations = new Map();

// Analytics data
let analytics = {
    totalTeachers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalConversations: 0,
    dailyStats: {},
    popularTopics: {},
    teacherActivity: {}
};

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

// Subject-specific prompts
const prompts = {
    english: [
        {
            title: "Thesis Statement Analysis",
            prompt: "Share your thesis statement or main argument, and I'll help you strengthen it by examining its clarity, specificity, and defendability."
        },
        {
            title: "Evidence Evaluation",
            prompt: "Present a piece of evidence you're using to support an argument, and I'll challenge you to examine its relevance, credibility, and strength."
        },
        {
            title: "Character Analysis",
            prompt: "Describe your interpretation of a literary character's motivations, and I'll push you to explore deeper psychological and contextual factors."
        },
        {
            title: "Counterargument Preparation",
            prompt: "State your position on a topic, and I'll help you anticipate and address the strongest opposing viewpoints."
        }
    ],
    history: [
        {
            title: "Historical Causation",
            prompt: "Explain what you think caused a historical event, and I'll challenge you to examine multiple factors and their interconnections."
        },
        {
            title: "Primary Source Analysis",
            prompt: "Share a historical document or quote you're analyzing, and I'll help you examine its context, bias, and significance."
        },
        {
            title: "Historical Comparison",
            prompt: "Compare two historical periods or events, and I'll push you to identify deeper patterns and differences."
        },
        {
            title: "Historical Perspective",
            prompt: "Explain a historical figure's decision, and I'll challenge you to consider multiple perspectives and constraints they faced."
        }
    ],
    science: [
        {
            title: "Hypothesis Development",
            prompt: "Present your hypothesis for a scientific question, and I'll help you refine it and consider alternative explanations."
        },
        {
            title: "Experimental Design",
            prompt: "Describe your experimental approach, and I'll challenge you to identify variables, controls, and potential limitations."
        },
        {
            title: "Data Interpretation",
            prompt: "Share your scientific data or results, and I'll push you to consider multiple interpretations and implications."
        },
        {
            title: "Scientific Reasoning",
            prompt: "Explain a scientific concept or process, and I'll help you examine the underlying principles and connections."
        }
    ],
    math: [
        {
            title: "Problem-Solving Strategy",
            prompt: "Explain your approach to solving a math problem, and I'll challenge you to consider alternative methods and verify your reasoning."
        },
        {
            title: "Proof Development",
            prompt: "Share your mathematical proof or reasoning, and I'll help you examine its logic and identify any gaps."
        },
        {
            title: "Mathematical Modeling",
            prompt: "Describe how you would model a real-world situation mathematically, and I'll push you to consider assumptions and limitations."
        },
        {
            title: "Concept Connections",
            prompt: "Explain how mathematical concepts relate to each other, and I'll help you explore deeper connections and applications."
        }
    ],
    general: [
        {
            title: "Critical Analysis",
            prompt: "Present any argument or position you're developing, and I'll help you strengthen it through rigorous questioning and analysis."
        },
        {
            title: "Problem Solving",
            prompt: "Describe a problem you're trying to solve, and I'll challenge you to examine it from multiple angles and develop stronger solutions."
        },
        {
            title: "Decision Making",
            prompt: "Explain a decision you need to make, and I'll help you weigh the factors and consider unexamined implications."
        },
        {
            title: "Creative Thinking",
            prompt: "Share an idea you're developing, and I'll push you to explore its potential, limitations, and innovative applications."
        }
    ]
};

// Generate unique codes
function generateCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Analytics helper
function updateAnalytics(action, data = {}) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = {
            newTeachers: 0,
            newClasses: 0,
            newStudents: 0,
            conversations: 0,
            activeTeachers: new Set(),
            activeStudents: new Set()
        };
    }
    
    const todayStats = analytics.dailyStats[today];
    
    switch (action) {
        case 'teacher_registered':
            analytics.totalTeachers++;
            todayStats.newTeachers++;
            break;
        case 'class_created':
            analytics.totalClasses++;
            todayStats.newClasses++;
            if (data.teacherId) todayStats.activeTeachers.add(data.teacherId);
            break;
        case 'student_joined':
            analytics.totalStudents++;
            todayStats.newStudents++;
            break;
        case 'conversation_started':
            analytics.totalConversations++;
            todayStats.conversations++;
            if (data.studentId) todayStats.activeStudents.add(data.studentId);
            if (data.topic) {
                analytics.popularTopics[data.topic] = (analytics.popularTopics[data.topic] || 0) + 1;
            }
            break;
        case 'teacher_activity':
            if (data.teacherId) {
                todayStats.activeTeachers.add(data.teacherId);
                analytics.teacherActivity[data.teacherId] = {
                    lastActive: new Date().toISOString(),
                    totalLogins: (analytics.teacherActivity[data.teacherId]?.totalLogins || 0) + 1
                };
            }
            break;
    }
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
            classes: [],
            lastLogin: new Date().toISOString(),
            totalLogins: 1
        };

        teachers.set(teacherId, teacher);
        updateAnalytics('teacher_registered', { teacherId });
        
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
                // Update login stats
                teacher.lastLogin = new Date().toISOString();
                teacher.totalLogins = (teacher.totalLogins || 0) + 1;
                teachers.set(teacher.id, teacher);
                updateAnalytics('teacher_activity', { teacherId: teacher.id });
                
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
app.post('/api/teacher/create-class', (req, res) => {
    try {
        const { teacherId, className, subject, description } = req.body;
        
        console.log('Create class request:', { teacherId, className });
        console.log('Teachers available:', Array.from(teachers.keys()));
        
        if (!teachers.has(teacherId)) {
            console.log('Teacher not found:', teacherId);
            return res.status(404).json({ error: 'Teacher not found' });
        }

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
            conversations: [],
            totalConversations: 0,
            totalMessages: 0
        };

        classes.set(classId, classData);
        
        // Add class to teacher's class list
        const teacher = teachers.get(teacherId);
        teacher.classes.push(classId);
        teachers.set(teacherId, teacher);
        
        updateAnalytics('class_created', { teacherId, classId });

        console.log('Class created successfully:', classId);
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
            return classData ? {
                ...classData,
                studentCount: classData.students.length,
                recentActivity: classData.totalConversations || 0
            } : null;
        }).filter(Boolean);

        res.json({ classes: teacherClasses });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Failed to get classes' });
    }
});

// Get teacher's students
app.get('/api/teacher/:teacherId/students', (req, res) => {
    try {
        const { teacherId } = req.params;
        
        if (!teachers.has(teacherId)) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const teacher = teachers.get(teacherId);
        const allStudents = [];
        
        for (const classId of teacher.classes) {
            const classData = classes.get(classId);
            if (classData) {
                for (const studentId of classData.students) {
                    const student = students.get(studentId);
                    if (student) {
                        allStudents.push({
                            ...student,
                            className: classData.name,
                            conversationCount: student.conversationCount || 0,
                            lastActivity: student.lastActivity || student.joinedAt
                        });
                    }
                }
            }
        }

        res.json({ students: allStudents });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Failed to get students' });
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
            conversationCount: 0,
            lastActivity: new Date().toISOString()
        };

        students.set(studentId, student);
        
        // Add student to class
        targetClass.students.push(studentId);
        classes.set(targetClass.id, targetClass);
        
        updateAnalytics('student_joined', { studentId, classId: targetClass.id });

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

// Get prompts for subject
app.get('/api/prompts/:subject', (req, res) => {
    try {
        const { subject } = req.params;
        const subjectPrompts = prompts[subject] || prompts['general'];
        res.json({ prompts: subjectPrompts });
    } catch (error) {
        console.error('Get prompts error:', error);
        res.status(500).json({ error: 'Failed to get prompts' });
    }
});

// Enhanced chat endpoint with detailed tracking
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

        // Update student and class activity
        if (studentId && students.has(studentId)) {
            const student = students.get(studentId);
            student.conversationCount = (student.conversationCount || 0) + 1;
            student.lastActivity = new Date().toISOString();
            students.set(studentId, student);

            // Update class stats
            if (student.classId && classes.has(student.classId)) {
                const classData = classes.get(student.classId);
                classData.totalConversations = (classData.totalConversations || 0) + 1;
                classData.totalMessages = (classData.totalMessages || 0) + 2;
                classes.set(student.classId, classData);
            }
        }
        
        updateAnalytics('conversation_started', { 
            studentId, 
            topic: promptTitle || 'General Discussion' 
        });
        
        res.json({ response: assistantMessage });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Admin dashboard endpoint
app.get('/api/admin/analytics', (req, res) => {
    try {
        // Calculate additional metrics
        const totalTeachers = teachers.size;
        const totalClasses = classes.size;
        const totalStudents = students.size;
        const totalConversations = conversations.size;
        
        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentTeachers = Array.from(teachers.values()).filter(t => 
            new Date(t.lastLogin) > sevenDaysAgo
        ).length;
        
        const recentStudents = Array.from(students.values()).filter(s => 
            new Date(s.lastActivity || s.joinedAt) > sevenDaysAgo
        ).length;
        
        // Top subjects
        const subjectStats = {};
        Array.from(classes.values()).forEach(cls => {
            subjectStats[cls.subject] = (subjectStats[cls.subject] || 0) + 1;
        });
        
        // Most active teachers
        const teacherActivityStats = Array.from(teachers.values()).map(teacher => ({
            name: teacher.name,
            email: teacher.email,
            school: teacher.school,
            classCount: teacher.classes.length,
            totalLogins: teacher.totalLogins || 1,
            lastLogin: teacher.lastLogin
        })).sort((a, b) => b.totalLogins - a.totalLogins);

        res.json({
            overview: {
                totalTeachers,
                totalClasses,
                totalStudents,
                totalConversations,
                recentTeachers,
                recentStudents
            },
            analytics: analytics,
            subjectStats,
            topTeachers: teacherActivityStats.slice(0, 10),
            popularTopics: analytics.popularTopics || {}
        });
    } catch (error) {
        console.error('Admin analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
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

// Serve different pages
app.get('/teacher', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

app.get('/student/:code?', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Productive Professor server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}/admin for business analytics`);
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
