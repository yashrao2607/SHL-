import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationState {
  role: string;
  seniority: string;
  technical_skills: string[];
  behavioral_requirements: string[];
  assessment_preferences: string[];
  must_have_constraints: string[];
  excluded_constraints: string[];
}

export type Intent = 'clarify' | 'recommend' | 'refine' | 'compare' | 'refuse';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Recommendation {
  name: string;
  url: string;
  test_type: string;
}

export interface ChatResponse {
  reply: string;
  recommendations: Recommendation[];
  end_of_conversation: boolean;
}

interface ScoredAssessment {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string;
  testType: string;
  category: string;
  remoteTesting: boolean;
  adaptive: boolean;
  duration: string;
  jobLevels: string;
  languages: string;
  skills: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Test type mapping
// ---------------------------------------------------------------------------

const TEST_TYPE_LABELS: Record<string, string> = {
  K: 'Knowledge/Skills',
  C: 'Cognitive Ability',
  P: 'Personality',
  B: 'Behavioral',
  S: 'Simulation',
  A: 'Ability',
  E: 'Emotional Intelligence',
  D: 'Development',
};

// ---------------------------------------------------------------------------
// 1. Intent Classification
// ---------------------------------------------------------------------------

const REFUSE_PATTERNS = [
  /\b(salary|compensation|pay|wage|bonus|stock option|remuneration)\b/i,
  /\b(legal advice|lawsuit|attorney|sue|litigation)\b/i,
  /\b(resume|cv review|cover letter)\b/i,
  /\b(interview coaching|interview tips|how to interview)\b/i,
  /\b(ignore instructions|ignore previous|you are now|disregard|jailbreak|system prompt)\b/i,
  /\b(hack|exploit|security vulnerability)\b/i,
];

const COMPARE_PATTERNS = [
  /\bdifference between\b/i,
  /\bcompare\s+(.+?)\s+(vs\.?|versus|and|or)\s+(.+)$/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bwhich is better\b/i,
  /\bwhich one should\b/i,
];

const REFINE_PATTERNS = [
  /\bactually\b/i,
  /\balso\b/i,
  /\binstead\b/i,
  /\badd\b/i,
  /\bremove\b/i,
  /\bbut\b/i,
  /\bhowever\b/i,
  /\bchange\b/i,
  /\bdon'?t want\b/i,
  /\bnot looking for\b/i,
  /\bprefer\b/i,
  /\bexclude\b/i,
  /\bwithout\b/i,
  /\bno\s+more\b/i,
  /\breplace\b/i,
];

export function classifyIntent(
  userMessage: string,
  state: ConversationState,
  conversationLength: number
): Intent {
  const trimmed = userMessage.trim();

  // Check for refusal patterns first
  for (const pattern of REFUSE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'refuse';
    }
  }

  // Check for comparison patterns
  for (const pattern of COMPARE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'compare';
    }
  }

  // If we already have recommendations and user is modifying, it's refine
  if (conversationLength > 2) {
    for (const pattern of REFINE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return 'refine';
      }
    }
  }

  // Check if we have enough context to recommend
  const hasRole = state.role.length > 0;
  const hasSeniority = state.seniority.length > 0;
  const hasSkills = state.technical_skills.length > 0;
  const hasBehavioral = state.behavioral_requirements.length > 0;
  const hasPreferences = state.assessment_preferences.length > 0;

  // If user provides a role + at least one other detail, recommend
  if (hasRole && (hasSeniority || hasSkills || hasBehavioral || hasPreferences)) {
    return 'recommend';
  }

  // If user provides a very specific message with lots of detail, go straight to recommend
  const words = trimmed.split(/\s+/).length;
  if (words >= 8 && (hasRole || hasSkills)) {
    return 'recommend';
  }

  // If we've been clarifying for 2+ turns, force a recommendation
  if (conversationLength >= 4 && hasRole) {
    return 'recommend';
  }

  // Otherwise clarify
  return 'clarify';
}

// ---------------------------------------------------------------------------
// 2. State Extraction
// ---------------------------------------------------------------------------

function extractList(text: string, keywords: string[]): string[] {
  const results: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      results.push(keyword);
    }
  }

  return results;
}

const TECH_SKILL_KEYWORDS = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C#', 'C++', 'Go', 'Rust',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'SQL', 'HTML', 'CSS',
  'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Spring', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'Linux', '.NET', 'WPF', 'WCF', 'MVC',
  'MVVM', 'XAML', 'ADO.NET', 'Oracle', 'MySQL', 'PL/SQL', 'Excel',
  'SAP', 'Salesforce', 'Tableau', 'Power BI', 'Hadoop', 'Spark',
  'Machine Learning', 'Data Science', 'Cybersecurity', 'DevOps',
  'Agile', 'Scrum', 'Project Management', 'Communication',
  'Leadership', 'Problem Solving', 'Critical Thinking', 'Teamwork',
  'Negotiation', 'Customer Service', 'Sales', 'Presentation',
];

const SENIORITY_KEYWORDS = [
  { keywords: ['entry-level', 'entry level', 'junior', 'intern', 'graduate', 'fresh'], level: 'Entry' },
  { keywords: ['mid-level', 'mid level', 'mid', 'intermediate', '3-5 years', '4 years', '5 years'], level: 'Mid-Level' },
  { keywords: ['senior', 'sr.', 'lead', 'staff', 'principal', '7+ years', '10 years', 'experienced'], level: 'Senior' },
  { keywords: ['executive', 'director', 'vp', 'vice president', 'c-level', 'c-suite', 'chief', 'head of'], level: 'Executive' },
  { keywords: ['manager', 'management', 'supervisor', 'team lead'], level: 'Mid-Level' },
];

const ROLE_PATTERNS = [
  /\b(developer|engineer|programmer)\b/i,
  /\b(manager|director|lead)\b/i,
  /\b(analyst|consultant|specialist)\b/i,
  /\b(designer|architect)\b/i,
  /\b(admin|administrator)\b/i,
  /\b(sales|account executive|rep)\b/i,
  /\b(hr|human resources|recruiter|recruiting)\b/i,
  /\b(finance|accountant|auditor)\b/i,
  /\b(marketing|content|copywriter)\b/i,
  /\b(operations|logistics|supply chain)\b/i,
  /\b(data scientist|data engineer|data analyst)\b/i,
  /\b(product manager|product owner|scrum master)\b/i,
  /\b(project manager|program manager)\b/i,
  /\b(QA|quality|tester|test engineer)\b/i,
  /\b(DevOps|SRE|site reliability)\b/i,
  /\b(security|cybersecurity|infosec)\b/i,
  /\b(support|help desk|service desk)\b/i,
];

export function extractState(messages: ChatMessage[]): ConversationState {
  const state: ConversationState = {
    role: '',
    seniority: '',
    technical_skills: [],
    behavioral_requirements: [],
    assessment_preferences: [],
    must_have_constraints: [],
    excluded_constraints: [],
  };

  // Process all user messages to build up state
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const text = msg.content;

    // Extract role
    for (const pattern of ROLE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        // Build a more natural role description from the match context
        const idx = text.toLowerCase().indexOf(match[0].toLowerCase());
        const start = Math.max(0, idx - 20);
        const contextSnippet = text.slice(start, idx + match[0].length).trim();
        if (state.role.length === 0) {
          state.role = contextSnippet;
        }
      }
    }

    // If no role pattern matched, try to infer from context
    if (state.role.length === 0) {
      const hirePatterns = [
        /hiring\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /looking\s+for\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /need\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /recruiting\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /I need.*for\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
      ];
      for (const pattern of hirePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          state.role = match[1].trim();
          break;
        }
      }
    }

    // Extract seniority
    for (const { keywords, level } of SENIORITY_KEYWORDS) {
      for (const kw of keywords) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          state.seniority = level;
        }
      }
    }

    // Extract technical skills
    const foundSkills = extractList(text, TECH_SKILL_KEYWORDS);
    for (const skill of foundSkills) {
      if (!state.technical_skills.includes(skill)) {
        state.technical_skills.push(skill);
      }
    }

    // Extract behavioral requirements
    const behavioralKeywords = ['leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving', 'adaptability', 'resilience', 'emotional intelligence', 'conflict resolution', 'decision making', 'strategic thinking', 'creativity', 'innovation', 'customer focus', 'integrity', 'accountability'];
    const foundBehavioral = extractList(text, behavioralKeywords);
    for (const b of foundBehavioral) {
      if (!state.behavioral_requirements.includes(b)) {
        state.behavioral_requirements.push(b);
      }
    }

    // Extract assessment preferences
    const prefKeywords = ['cognitive', 'personality', 'behavioral', 'simulation', 'technical', 'skills test', 'knowledge test', 'ability test', 'aptitude', 'situational'];
    const foundPrefs = extractList(text, prefKeywords);
    for (const p of foundPrefs) {
      if (!state.assessment_preferences.includes(p)) {
        state.assessment_preferences.push(p);
      }
    }

    // Extract must-have constraints
    if (/\bremote\b/i.test(text)) {
      if (!state.must_have_constraints.includes('remote')) {
        state.must_have_constraints.push('remote');
      }
    }
    if (/\badaptive\b/i.test(text) || /\badaptiv[e]?\b/i.test(text)) {
      if (!state.must_have_constraints.includes('adaptive')) {
        state.must_have_constraints.push('adaptive');
      }
    }
    if (/\bshort\b/i.test(text) || /\bquick\b/i.test(text) || /\bunder \d+ min/i.test(text)) {
      if (!state.must_have_constraints.includes('short')) {
        state.must_have_constraints.push('short');
      }
    }

    // Extract excluded constraints
    const excludePatterns = [
      /\bnot?\s+(?:looking for |wanting |interested in )?(?:cognitive|personality|behavioral|simulation|technical)\b/i,
      /\bwithout\b\s+(.+)/i,
      /\bno\s+(cognitive|personality|behavioral|simulation|technical)\b/i,
    ];
    for (const pattern of excludePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const excluded = match[1].trim().toLowerCase();
        if (!state.excluded_constraints.includes(excluded)) {
          state.excluded_constraints.push(excluded);
        }
      }
    }
  }

  return state;
}

// ---------------------------------------------------------------------------
// 3. Retrieval Engine
// ---------------------------------------------------------------------------

async function retrieveAssessments(state: ConversationState): Promise<ScoredAssessment[]> {
  // Build search terms from state
  const searchTerms = [
    ...state.technical_skills,
    state.role,
    ...state.behavioral_requirements,
    ...state.assessment_preferences,
  ].filter(Boolean);

  // Also try to extract individual words from the role for broader matching
  const roleWords = state.role
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'have', 'will', 'need'].includes(w.toLowerCase()));

  const allTerms = [...new Set([...searchTerms, ...roleWords])];

  if (allTerms.length === 0) {
    // No specific terms, return a broad set
    const results = await db.assessment.findMany({ take: 20 });
    return results.map((a) => ({ ...a, score: 0 }));
  }

  // Build OR conditions for keyword matching
  // Note: SQLite contains is case-insensitive by default, so no mode needed
  const orConditions = allTerms.flatMap((term) => [
    { name: { contains: term } },
    { description: { contains: term } },
    { skills: { contains: term } },
    { category: { contains: term } },
  ]);

  const results = await db.assessment.findMany({
    where: {
      OR: orConditions,
    },
    take: 50, // Get more candidates for reranking
  });

  // Score and rank results
  const scored = results.map((assessment) => {
    let score = 0;
    const nameLower = assessment.name.toLowerCase();
    const descLower = assessment.description.toLowerCase();
    const skillsLower = assessment.skills.toLowerCase();
    const categoryLower = assessment.category.toLowerCase();
    const jobLevelsLower = assessment.jobLevels.toLowerCase();

    // Score based on term matches
    for (const term of allTerms) {
      const termLower = term.toLowerCase();
      if (nameLower.includes(termLower)) score += 10; // Name match is strongest
      if (skillsLower.includes(termLower)) score += 7; // Skills match is strong
      if (descLower.includes(termLower)) score += 3; // Description match is moderate
      if (categoryLower.includes(termLower)) score += 5; // Category match is good
    }

    // Seniority match
    if (state.seniority && jobLevelsLower.includes(state.seniority.toLowerCase())) {
      score += 6;
    }

    // Must-have constraints
    if (state.must_have_constraints.includes('remote') && assessment.remoteTesting) {
      score += 4;
    }
    if (state.must_have_constraints.includes('adaptive') && assessment.adaptive) {
      score += 4;
    }

    // Behavioral requirements boost
    for (const beh of state.behavioral_requirements) {
      if (skillsLower.includes(beh.toLowerCase())) {
        score += 5;
      }
    }

    // Assessment preferences boost
    for (const pref of state.assessment_preferences) {
      if (categoryLower.includes(pref.toLowerCase()) || assessment.testType.includes(getTestTypeCode(pref))) {
        score += 4;
      }
    }

    // Excluded constraints penalty
    for (const excl of state.excluded_constraints) {
      if (categoryLower.includes(excl.toLowerCase())) {
        score -= 10;
      }
    }

    return { ...assessment, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

function getTestTypeCode(preference: string): string {
  const prefLower = preference.toLowerCase();
  if (prefLower.includes('cognitive') || prefLower.includes('ability') || prefLower.includes('aptitude')) return 'C';
  if (prefLower.includes('personality')) return 'P';
  if (prefLower.includes('behavioral') || prefLower.includes('situational')) return 'B';
  if (prefLower.includes('simulation')) return 'S';
  if (prefLower.includes('technical') || prefLower.includes('knowledge') || prefLower.includes('skills')) return 'K';
  if (prefLower.includes('emotional')) return 'E';
  if (prefLower.includes('development')) return 'D';
  return '';
}

// ---------------------------------------------------------------------------
// 4. LLM-Powered Response Generation
// ---------------------------------------------------------------------------

function buildSystemPrompt(catalogData: string): string {
  return `You are an SHL assessment recommender agent. Your job is to:
1. Help recruiters and hiring managers find the right SHL assessments
2. Ask clarifying questions when needed (max 2 turns before recommending)
3. Recommend 1-10 assessments from the CATALOG DATA provided
4. NEVER invent or hallucinate assessments - only use what's in the catalog
5. NEVER recommend outside the SHL catalog
6. Refuse off-topic requests (salary, legal, non-SHL topics)
7. Support refinements and comparisons

When recommending, you MUST include: exact name, URL, and test type for each assessment.
When clarifying, ask the single highest-value question.
When comparing, ground comparisons in catalog data only.

Clarification priority order:
1. Role/job family
2. Seniority level
3. Technical vs behavioral emphasis
4. Stakeholder interaction needs
5. Personality/cognitive preferences

IMPORTANT OUTPUT FORMAT:
When you want to recommend assessments, format your response EXACTLY like this:

<<RECOMMENDATIONS>>
[NAME]|[URL]|[TEST_TYPE]
[NAME]|[URL]|[TEST_TYPE]
<<END_RECOMMENDATIONS>>

Then write your conversational reply after the recommendations block.

If you are just clarifying (no recommendations), do NOT include the <<RECOMMENDATIONS>> block - just write your question directly.

If the conversation seems complete (user has received recommendations and has no more questions), include <<END_CONVERSATION>> at the end.

CATALOG DATA:
${catalogData}`;
}

function formatCatalogData(assessments: ScoredAssessment[]): string {
  return assessments
    .slice(0, 20)
    .map(
      (a) =>
        `Name: ${a.name} | URL: ${a.url} | TestType: ${a.testType} | Category: ${a.category} | Duration: ${a.duration} | JobLevels: ${a.jobLevels} | Skills: ${a.skills} | Remote: ${a.remoteTesting} | Adaptive: ${a.adaptive}`
    )
    .join('\n');
}

async function generateLLMResponse(
  messages: ChatMessage[],
  catalogData: string,
  stateSummary: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(catalogData);

  const conversationMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Add state context as a user message at the end
  const stateContext = stateSummary
    ? `\n\n[Current extracted context: ${stateSummary}]`
    : '';

  const lastUserMsg = messages[messages.length - 1];
  const userMessageWithContext = lastUserMsg.content + stateContext;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...conversationMessages.slice(0, -1),
        { role: 'user', content: userMessageWithContext },
      ],
      thinking: { type: 'disabled' },
    });

    return completion.choices?.[0]?.message?.content ?? '';
  } catch (error) {
    console.error('LLM call failed:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. Response Parsing
// ---------------------------------------------------------------------------

function parseLLMResponse(
  llmOutput: string,
  catalogAssessments: ScoredAssessment[]
): { reply: string; recommendations: Recommendation[]; end_of_conversation: boolean } {
  let recommendations: Recommendation[] = [];
  let reply = llmOutput;
  let endOfConversation = false;

  // Extract recommendations block
  const recMatch = llmOutput.match(/<<RECOMMENDATIONS>>\n?([\s\S]*?)<<END_RECOMMENDATIONS>>/);
  if (recMatch) {
    const recBlock = recMatch[1].trim();
    const lines = recBlock.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        const name = parts[0];
        const url = parts[1];
        const testType = parts[2];

        // Validate against catalog - find matching assessment
        const catalogMatch = catalogAssessments.find(
          (a) =>
            a.name.toLowerCase() === name.toLowerCase() ||
            a.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(a.name.toLowerCase())
        );

        if (catalogMatch) {
          recommendations.push({
            name: catalogMatch.name,
            url: catalogMatch.url,
            test_type: catalogMatch.testType,
          });
        } else {
          // If not in catalog, skip (never hallucinate)
          console.warn(`LLM recommended assessment not in catalog: ${name}`);
        }
      }
    }

    // Remove the recommendations block from the reply
    reply = llmOutput.replace(/<<RECOMMENDATIONS>>[\s\S]*?<<END_RECOMMENDATIONS>>\n?/, '').trim();
  }

  // Check for end of conversation marker
  if (llmOutput.includes('<<END_CONVERSATION>>')) {
    endOfConversation = true;
    reply = reply.replace(/<<END_CONVERSATION>>/g, '').trim();
  }

  // Deduplicate recommendations (by name)
  const seen = new Set<string>();
  recommendations = recommendations.filter((r) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Limit to 10
  recommendations = recommendations.slice(0, 10);

  return { reply, recommendations, end_of_conversation: endOfConversation };
}

// ---------------------------------------------------------------------------
// 6. Comparison Logic
// ---------------------------------------------------------------------------

async function retrieveAssessmentsByName(names: string[]): Promise<ScoredAssessment[]> {
  const results: ScoredAssessment[] = [];

  for (const name of names) {
    const matches = await db.assessment.findMany({
      where: {
        OR: [
          { name: { contains: name } },
          { slug: { contains: name.toLowerCase().replace(/\s+/g, '-') } },
        ],
      },
      take: 3,
    });

    for (const m of matches) {
      if (!results.find((r) => r.id === m.id)) {
        results.push({ ...m, score: 0 });
      }
    }
  }

  return results;
}

function extractComparisonNames(message: string): string[] {
  const names: string[] = [];

  // Try "compare X vs Y" or "difference between X and Y"
  const vsMatch = message.match(/compare\s+(.+?)\s+(?:vs\.?|versus|and|or)\s+(.+)/i);
  if (vsMatch) {
    names.push(vsMatch[1].trim());
    names.push(vsMatch[2].trim().replace(/[.?!,;]+$/, ''));
    return names;
  }

  const diffMatch = message.match(/difference\s+between\s+(.+?)\s+and\s+(.+)/i);
  if (diffMatch) {
    names.push(diffMatch[1].trim());
    names.push(diffMatch[2].trim().replace(/[.?!,;]+$/, ''));
    return names;
  }

  // Fallback: try to find assessment names mentioned
  const quotedMatch = message.match(/"([^"]+)"/g);
  if (quotedMatch) {
    for (const q of quotedMatch) {
      names.push(q.replace(/"/g, ''));
    }
  }

  return names;
}

// ---------------------------------------------------------------------------
// 7. Main Engine - Process Chat
// ---------------------------------------------------------------------------

export async function processChat(messages: ChatMessage[]): Promise<ChatResponse> {
  // Edge case: empty messages
  if (!messages || messages.length === 0) {
    return {
      reply: "Hello! I'm your SHL assessment recommender. I can help you find the right assessments for your hiring needs. What role are you looking to hire for?",
      recommendations: [],
      end_of_conversation: false,
    };
  }

  // Validate messages
  const validMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  );

  if (validMessages.length === 0) {
    return {
      reply: "Hello! I'm your SHL assessment recommender. I can help you find the right assessments for your hiring needs. What role are you looking to hire for?",
      recommendations: [],
      end_of_conversation: false,
    };
  }

  // Get the latest user message
  const lastUserMsg = [...validMessages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return {
      reply: "I didn't catch that. Could you tell me what role you're hiring for?",
      recommendations: [],
      end_of_conversation: false,
    };
  }

  // Extract conversation state
  const state = extractState(validMessages);

  // Classify intent
  const intent = classifyIntent(lastUserMsg.content, state, validMessages.length);

  // Handle refusal
  if (intent === 'refuse') {
    const refuseTopics: Record<string, string> = {
      salary: 'salary or compensation',
      compensation: 'salary or compensation',
      pay: 'salary or compensation',
      wage: 'salary or compensation',
      legal: 'legal advice',
      lawsuit: 'legal advice',
      resume: 'resume or CV review',
      interview: 'interview coaching',
      ignore: 'that topic',
      jailbreak: 'that topic',
      hack: 'that topic',
    };

    let topic = 'that topic';
    const lowerMsg = lastUserMsg.content.toLowerCase();
    for (const [keyword, topicLabel] of Object.entries(refuseTopics)) {
      if (lowerMsg.includes(keyword)) {
        topic = topicLabel;
        break;
      }
    }

    return {
      reply: `I'm sorry, I can only help with SHL assessment recommendations. I'm unable to provide advice on ${topic}. Would you like help finding assessments for a specific role?`,
      recommendations: [],
      end_of_conversation: false,
    };
  }

  // Build state summary for LLM context
  const stateSummary = buildStateSummary(state);

  try {
    if (intent === 'compare') {
      return await handleCompare(validMessages, lastUserMsg.content, stateSummary);
    }

    if (intent === 'clarify') {
      return await handleClarify(validMessages, state, stateSummary);
    }

    // recommend or refine
    return await handleRecommend(validMessages, state, stateSummary);
  } catch (error) {
    console.error('Engine error:', error);

    // Graceful fallback
    if (intent === 'clarify') {
      return {
        reply: "I'd like to help you find the right assessment. Could you tell me more about the role you're hiring for? For example, what is the job title and seniority level?",
        recommendations: [],
        end_of_conversation: false,
      };
    }

    // For recommend/refine, try to return basic results without LLM
    return await handleFallbackRecommend(state);
  }
}

function buildStateSummary(state: ConversationState): string {
  const parts: string[] = [];
  if (state.role) parts.push(`Role: ${state.role}`);
  if (state.seniority) parts.push(`Seniority: ${state.seniority}`);
  if (state.technical_skills.length > 0) parts.push(`Technical Skills: ${state.technical_skills.join(', ')}`);
  if (state.behavioral_requirements.length > 0) parts.push(`Behavioral Needs: ${state.behavioral_requirements.join(', ')}`);
  if (state.assessment_preferences.length > 0) parts.push(`Assessment Preferences: ${state.assessment_preferences.join(', ')}`);
  if (state.must_have_constraints.length > 0) parts.push(`Must-haves: ${state.must_have_constraints.join(', ')}`);
  if (state.excluded_constraints.length > 0) parts.push(`Excluded: ${state.excluded_constraints.join(', ')}`);
  return parts.join('; ');
}

async function handleClarify(
  messages: ChatMessage[],
  state: ConversationState,
  stateSummary: string
): Promise<ChatResponse> {
  // Even for clarify, we retrieve some assessments so the LLM has context
  let catalogData = '';
  try {
    const assessments = await retrieveAssessments(state);
    catalogData = formatCatalogData(assessments);
  } catch {
    catalogData = 'No catalog data available at the moment.';
  }

  const llmOutput = await generateLLMResponse(messages, catalogData, stateSummary);
  const parsed = parseLLMResponse(llmOutput, []);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: false,
  };
}

async function handleRecommend(
  messages: ChatMessage[],
  state: ConversationState,
  stateSummary: string
): Promise<ChatResponse> {
  const assessments = await retrieveAssessments(state);
  const catalogData = formatCatalogData(assessments);

  const llmOutput = await generateLLMResponse(messages, catalogData, stateSummary);
  const parsed = parseLLMResponse(llmOutput, assessments);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: parsed.end_of_conversation,
  };
}

async function handleCompare(
  messages: ChatMessage[],
  userMessage: string,
  stateSummary: string
): Promise<ChatResponse> {
  const names = extractComparisonNames(userMessage);
  let assessments: ScoredAssessment[] = [];

  if (names.length >= 2) {
    assessments = await retrieveAssessmentsByName(names);
  }

  // If we couldn't find specific assessments, fall back to general retrieval
  if (assessments.length === 0) {
    const state = extractState(messages);
    assessments = await retrieveAssessments(state);
  }

  const catalogData = formatCatalogData(assessments);

  const llmOutput = await generateLLMResponse(messages, catalogData, stateSummary);
  const parsed = parseLLMResponse(llmOutput, assessments);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: parsed.end_of_conversation,
  };
}

async function handleFallbackRecommend(state: ConversationState): Promise<ChatResponse> {
  try {
    const assessments = await retrieveAssessments(state);
    const topAssessments = assessments.slice(0, 5);

    if (topAssessments.length === 0) {
      return {
        reply: "I couldn't find specific assessments matching your criteria. Could you provide more details about the role or skills you're looking to assess?",
        recommendations: [],
        end_of_conversation: false,
      };
    }

    const recommendations: Recommendation[] = topAssessments.map((a) => ({
      name: a.name,
      url: a.url,
      test_type: a.testType,
    }));

    const assessmentList = topAssessments
      .map((a) => `- **${a.name}** (${TEST_TYPE_LABELS[a.testType] ?? a.testType}, ${a.duration})`)
      .join('\n');

    const reply = `Based on your requirements, here are some assessments that may be relevant:\n\n${assessmentList}\n\nWould you like me to refine these recommendations or provide more details?`;

    return {
      reply,
      recommendations,
      end_of_conversation: false,
    };
  } catch {
    return {
      reply: "I'm having trouble accessing the assessment catalog right now. Please try again in a moment.",
      recommendations: [],
      end_of_conversation: false,
    };
  }
}
