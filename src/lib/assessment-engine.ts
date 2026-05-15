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
  duration_preference: string;       // e.g. "quick", "under 30", "short", "comprehensive"
  language_preference: string;       // e.g. "English", "Spanish"
}

export type Intent = 'clarify' | 'recommend' | 'refine' | 'compare' | 'refuse' | 'greeting';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Recommendation {
  name: string;
  url: string;
  test_type: string;
  duration?: string;
  remote_testing?: boolean;
  adaptive?: boolean;
  category?: string;
}

/** Frontend-compatible context (subset of ConversationState) */
export interface FrontendContext {
  role: string;
  seniority: string;
  technical_skills: string[];
  behavioral_requirements: string[];
  assessment_preferences: string[];
  must_have_constraints: string[];
  excluded_constraints: string[];
}

export interface ChatResponse {
  reply: string;
  recommendations: Recommendation[];
  end_of_conversation: boolean;
  extracted_context?: ConversationState;  // Full extracted state (with duration/language prefs)
  context?: FrontendContext;              // Frontend-compatible context (for sidebar)
}

/** Convert full ConversationState to frontend-compatible context */
function toFrontendContext(state: ConversationState): FrontendContext {
  return {
    role: state.role,
    seniority: state.seniority,
    technical_skills: state.technical_skills,
    behavioral_requirements: state.behavioral_requirements,
    assessment_preferences: state.assessment_preferences,
    must_have_constraints: state.must_have_constraints,
    excluded_constraints: state.excluded_constraints,
  };
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
  createdAt: Date;
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
// 1. Fuzzy Matching Helpers
// ---------------------------------------------------------------------------

/** Normalise a string for comparison: lowercase, strip punctuation, collapse whitespace */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Returns true if `input` fuzzily matches `target` (threshold 0–1, higher = stricter) */
function fuzzyMatch(input: string, target: string, threshold = 0.65): boolean {
  const a = normalise(input);
  const b = normalise(target);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  return 1 - dist / maxLen >= threshold;
}

// ---------------------------------------------------------------------------
// 2. Fuzzy Skill Aliases
// ---------------------------------------------------------------------------

/** Map of aliases → canonical skill name */
const SKILL_ALIASES: Record<string, string> = {
  // JavaScript family
  js: 'JavaScript',
  javascript: 'JavaScript',
  ecmascript: 'JavaScript',
  es6: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  // Python family
  py: 'Python',
  python: 'Python',
  python3: 'Python',
  // Java family
  java: 'Java',
  jvm: 'Java',
  // C family
  'c#': 'C#',
  'csharp': 'C#',
  'c++': 'C++',
  cpp: 'C++',
  // Go
  golang: 'Go',
  go: 'Go',
  // Ruby
  rb: 'Ruby',
  ruby: 'Ruby',
  // Other languages
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  rust: 'Rust',
  r: 'R',
  // Web frameworks
  reactjs: 'React',
  react: 'React',
  angularjs: 'Angular',
  angular: 'Angular',
  vuejs: 'Vue',
  vue: 'Vue',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  node: 'Node.js',
  // Back-end frameworks
  django: 'Django',
  spring: 'Spring',
  flask: 'Django', // close enough – maps to Python web
  // Cloud / infra
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Azure', // cloud provider bucket
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  // Data
  sql: 'SQL',
  mysql: 'MySQL',
  postgres: 'SQL',
  postgresql: 'SQL',
  oracle: 'Oracle',
  mongodb: 'SQL',
  // Microsoft
  '.net': '.NET',
  dotnet: '.NET',
  // Data & BI
  'power bi': 'Power BI',
  'powerbi': 'Power BI',
  tableau: 'Tableau',
  // Enterprise
  sap: 'SAP',
  salesforce: 'Salesforce',
  // Big data
  hadoop: 'Hadoop',
  spark: 'Spark',
  // ML
  ml: 'Machine Learning',
  'machine learning': 'Machine Learning',
  ai: 'Machine Learning',
  'data science': 'Data Science',
  'data scientist': 'Data Science',
  // Security
  cybersecurity: 'Cybersecurity',
  'cyber security': 'Cybersecurity',
  infosec: 'Cybersecurity',
  security: 'Cybersecurity',
  // Soft skills
  pm: 'Project Management',
  'project management': 'Project Management',
  'product management': 'Project Management',
  devops: 'DevOps',
  agile: 'Agile',
  scrum: 'Scrum',
  excel: 'Excel',
};

/** Resolve a token to its canonical skill name, with fuzzy fallback */
function resolveSkill(token: string): string | null {
  const lower = token.toLowerCase().replace(/[^a-z0-9.\-#]/g, '');
  // Direct alias lookup
  if (SKILL_ALIASES[lower]) return SKILL_ALIASES[lower];
  // Fuzzy match against alias keys
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (fuzzyMatch(lower, alias, 0.75)) return canonical;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Enhanced State Extraction
// ---------------------------------------------------------------------------

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
  { keywords: ['entry-level', 'entry level', 'junior', 'intern', 'graduate', 'fresh', 'new grad', '0-2 years', '1 year', '2 years', 'beginner', 'trainee', 'apprentice'], level: 'Entry' },
  { keywords: ['mid-level', 'mid level', 'mid', 'intermediate', '3-5 years', '4 years', '5 years', '3 years', 'experienced'], level: 'Mid-Level' },
  { keywords: ['senior', 'sr.', 'sr', 'lead', 'staff', 'principal', '7+ years', '10 years', '8 years', 'expert'], level: 'Senior' },
  { keywords: ['executive', 'director', 'vp', 'vice president', 'c-level', 'c-suite', 'chief', 'head of', 'ceo', 'cto', 'cfo', 'coo'], level: 'Executive' },
  { keywords: ['manager', 'management', 'supervisor', 'team lead', 'team leader'], level: 'Mid-Level' },
];

const ROLE_PATTERNS = [
  /\b(full[- ]?stack)\s+(developer|engineer|programmer)\b/i,
  /\b(front[- ]?end|back[- ]?end|backend|frontend)\s+(developer|engineer|programmer)\b/i,
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
  /\b(software|web|mobile|cloud|platform)\s+(developer|engineer)\b/i,
];

/** Compound role labels that should be treated as a unit */
const COMPOUND_ROLES: [RegExp, string][] = [
  [/\bfull[- ]?stack\s+(developer|engineer|programmer)\b/i, 'full-stack $1'],
  [/\bfront[- ]?end\s+(developer|engineer|programmer)\b/i, 'front-end $1'],
  [/\bback[- ]?end\s+(developer|engineer|programmer)\b/i, 'back-end $1'],
  [/\bdata\s+scientist\b/i, 'data scientist'],
  [/\bdata\s+engineer\b/i, 'data engineer'],
  [/\bdata\s+analyst\b/i, 'data analyst'],
  [/\bproduct\s+manager\b/i, 'product manager'],
  [/\bproject\s+manager\b/i, 'project manager'],
  [/\bdevops\s+engineer\b/i, 'DevOps engineer'],
  [/\bsite\s+reliability\s+engineer\b/i, 'SRE'],
  [/\bsoftware\s+engineer\b/i, 'software engineer'],
  [/\bweb\s+developer\b/i, 'web developer'],
  [/\bmobile\s+developer\b/i, 'mobile developer'],
  [/\bcloud\s+engineer\b/i, 'cloud engineer'],
  [/\bqa\s+engineer\b/i, 'QA engineer'],
  [/\btest\s+engineer\b/i, 'test engineer'],
  [/\bsecurity\s+engineer\b/i, 'security engineer'],
  [/\bsystems?\s+analyst\b/i, 'systems analyst'],
  [/\bbusiness\s+analyst\b/i, 'business analyst'],
  [/\bux\s+(designer|researcher)\b/i, 'UX $1'],
  [/\bui\s+designer\b/i, 'UI designer'],
];

const DURATION_PATTERNS = [
  { pattern: /\bquick\s+assessment\b/i, value: 'quick' },
  { pattern: /\bunder\s+(\d+)\s*min/i, value: 'under-$1' },
  { pattern: /\bless\s+than\s+(\d+)\s*min/i, value: 'under-$1' },
  { pattern: /\bshort\s+(assessment|test)?\b/i, value: 'short' },
  { pattern: /\bbrief\b/i, value: 'short' },
  { pattern: /\bfast\b/i, value: 'quick' },
  { pattern: /\bunder\s+(\d+)\s*minutes?\b/i, value: 'under-$1' },
  { pattern: /\bwithin\s+(\d+)\s*min/i, value: 'under-$1' },
  { pattern: /\bcomprehensive\b/i, value: 'comprehensive' },
  { pattern: /\blong(?:er)?\s+assessment\b/i, value: 'comprehensive' },
  { pattern: /\bin[- ]depth\b/i, value: 'comprehensive' },
  { pattern: /\bthorough\b/i, value: 'comprehensive' },
];

const LANGUAGE_PATTERNS = [
  { pattern: /\b(english|en)\b/i, value: 'English' },
  { pattern: /\b(spanish|español|es)\b/i, value: 'Spanish' },
  { pattern: /\b(french|français|fr)\b/i, value: 'French' },
  { pattern: /\b(german|deutsch|de)\b/i, value: 'German' },
  { pattern: /\b(portuguese|português|pt)\b/i, value: 'Portuguese' },
  { pattern: /\b(mandarin|chinese|zh)\b/i, value: 'Mandarin' },
  { pattern: /\b(japanese|ja)\b/i, value: 'Japanese' },
  { pattern: /\b(arabic|ar)\b/i, value: 'Arabic' },
  { pattern: /\bhindi\b/i, value: 'Hindi' },
];

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

/** Fuzzy skill extraction: tries alias resolution then falls back to keyword contains */
function extractSkillsFuzzy(text: string): string[] {
  const results: Set<string> = new Set();
  // Tokenise on whitespace / punctuation
  const tokens = text.split(/[\s,;|\/\\()\[\]{}]+/).filter(Boolean);

  for (const token of tokens) {
    const resolved = resolveSkill(token);
    if (resolved) results.add(resolved);
  }

  // Also try bigrams and trigrams for multi-word skills
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase().replace(/[^a-z0-9.\-# ]/g, '').trim();
    const resolved = resolveSkill(bigram);
    if (resolved) results.add(resolved);
  }
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase().replace(/[^a-z0-9.\-# ]/g, '').trim();
    const resolved = resolveSkill(trigram);
    if (resolved) results.add(resolved);
  }

  // Fall back to keyword contains
  const lowerText = text.toLowerCase();
  for (const keyword of TECH_SKILL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      results.add(keyword);
    }
  }

  return Array.from(results);
}

export function extractState(messages: ChatMessage[]): ConversationState {
  const state: ConversationState = {
    role: '',
    seniority: '',
    technical_skills: [],
    behavioral_requirements: [],
    assessment_preferences: [],
    must_have_constraints: [],
    excluded_constraints: [],
    duration_preference: '',
    language_preference: '',
  };

  // Process all user messages to build up state
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const text = msg.content;

    // ---- Extract compound roles first (higher priority) ----
    let compoundRoleFound = false;
    for (const [regex, template] of COMPOUND_ROLES) {
      const match = text.match(regex);
      if (match) {
        state.role = template.replace('$1', match[1] || '').trim();
        compoundRoleFound = true;
        break;
      }
    }

    // ---- Extract role (if no compound role matched) ----
    if (!compoundRoleFound) {
      for (const pattern of ROLE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          const idx = text.toLowerCase().indexOf(match[0].toLowerCase());
          const start = Math.max(0, idx - 20);
          const contextSnippet = text.slice(start, idx + match[0].length).trim();
          if (state.role.length === 0) {
            state.role = contextSnippet;
          }
          break;
        }
      }
    }

    // If no role pattern matched, try to infer from hiring context
    if (state.role.length === 0) {
      const hirePatterns = [
        /hiring\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /looking\s+for\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /need\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /recruiting\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /I need.*for\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /assess(?:ing|)\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
        /evaluat(?:e|ing|ion)\s+(?:a\s+)?(.+?)(?:\.|,|$)/i,
      ];
      for (const pattern of hirePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          state.role = match[1].trim();
          break;
        }
      }
    }

    // ---- Extract seniority ----
    for (const { keywords, level } of SENIORITY_KEYWORDS) {
      for (const kw of keywords) {
        if (text.toLowerCase().includes(kw.toLowerCase())) {
          state.seniority = level;
        }
      }
    }

    // ---- Extract technical skills (fuzzy) ----
    const foundSkills = extractSkillsFuzzy(text);
    for (const skill of foundSkills) {
      if (!state.technical_skills.includes(skill)) {
        state.technical_skills.push(skill);
      }
    }

    // ---- Extract behavioral requirements ----
    const behavioralKeywords = [
      'leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving',
      'adaptability', 'resilience', 'emotional intelligence', 'conflict resolution',
      'decision making', 'strategic thinking', 'creativity', 'innovation',
      'customer focus', 'integrity', 'accountability', 'persuasion', 'influence',
      'delegation', 'mentoring', 'coaching', 'empathy', 'negotiation',
    ];
    const foundBehavioral = extractList(text, behavioralKeywords);
    for (const b of foundBehavioral) {
      if (!state.behavioral_requirements.includes(b)) {
        state.behavioral_requirements.push(b);
      }
    }

    // ---- Extract assessment preferences ----
    const prefKeywords = [
      'cognitive', 'personality', 'behavioral', 'simulation', 'technical',
      'skills test', 'knowledge test', 'ability test', 'aptitude', 'situational',
      'coding', 'coding test', 'numerical', 'verbal', 'inductive', 'deductive',
    ];
    const foundPrefs = extractList(text, prefKeywords);
    for (const p of foundPrefs) {
      if (!state.assessment_preferences.includes(p)) {
        state.assessment_preferences.push(p);
      }
    }

    // ---- Extract must-have constraints ----
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

    // ---- Extract duration preference ----
    for (const { pattern, value } of DURATION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        state.duration_preference = value.replace('$1', match[1] || '');
        break;
      }
    }

    // ---- Extract language preference ----
    for (const { pattern, value } of LANGUAGE_PATTERNS) {
      if (pattern.test(text)) {
        state.language_preference = value;
        break;
      }
    }

    // ---- Extract excluded constraints (improved) ----
    const excludePatterns = [
      /\bnot?\s+(?:looking for |wanting |interested in )?(cognitive|personality|behavioral|simulation|technical|coding|numerical|verbal)\b/i,
      /\bwithout\b\s+(.+)/i,
      /\bno\s+(cognitive|personality|behavioral|simulation|technical|coding|numerical|verbal)\b/i,
      /\bdon'?t\s+(?:want|need|like|prefer)\s+(.+?)(?:\.|,|$)/i,
      /\bnot\s+(?:interested|looking|wanting)\s+in\s+(.+?)(?:\.|,|$)/i,
      /\brather\s+not\s+(?:have|use|see)\s+(.+?)(?:\.|,|$)/i,
      /\bexclude\s+(.+?)(?:\.|,|$)/i,
      /\bavoid\s+(.+?)(?:\.|,|$)/i,
      /\bskip\s+(.+?)(?:\.|,|$)/i,
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
// 4. Enhanced Intent Classification
// ---------------------------------------------------------------------------

const REFUSE_PATTERNS = [
  /\b(salary|compensation|pay|wage|bonus|stock option|remuneration)\b/i,
  /\b(legal advice|lawsuit|attorney|sue|litigation)\b/i,
  /\b(resume|cv review|cover letter)\b/i,
  /\b(interview coaching|interview tips|how to interview)\b/i,
  /\b(ignore instructions|ignore previous|you are now|disregard|jailbreak|system prompt)\b/i,
  /\b(hack|exploit|security vulnerability)\b/i,
  /\b(medical|health|diagnosis|prescription|doctor|hospital)\b/i,
  /\b(politic|election|candidate|democrat|republican|vote)\b/i,
  /\b(harmful|dangerous|weapon|kill|violent|suicide)\b/i,
  /\b(drug|illegal|cocaine|meth|heroin)\b/i,
  /\b(gambling|betting|casino)\b/i,
  /\b(hate|discriminat|racist|sexist|bigot)\b/i,
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|greetings|good\s+(morning|afternoon|evening)|yo|sup|what'?s\s+up)\b/i,
  /^(hola|bonjour|ciao|namaste)\b/i,
];

const COMPARE_PATTERNS = [
  /\bdifference between\b/i,
  /\bcompare\s+(.+?)\s+(vs\.?|versus|and|or)\s+(.+)$/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bwhich is better\b/i,
  /\bwhich one should\b/i,
  /\bwhich one\b/i,
  /\bpros and cons\b/i,
  /\bpros\s+and\s+cons\b/i,
  /\bbetter\s+(for|than)\b/i,
  /\bcompare\b/i,
  /\bcomparison\b/i,
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
  /\bcould you also\b/i,
  /\bI'd also like\b/i,
  /\bmore\s+(specific|focused|targeted)\b/i,
  /\bnarrow\s+down\b/i,
  /\bshow\s+me\s+(other|different|more)\b/i,
  /\banything\s+else\b/i,
  /\bother\s+options\b/i,
  /\bwhat\s+else\b/i,
];

/** Maximum consecutive clarification turns before forcing a recommendation */
const MAX_CLARIFY_TURNS = 3;

export function classifyIntent(
  userMessage: string,
  state: ConversationState,
  conversationLength: number
): Intent {
  const trimmed = userMessage.trim();

  // ---- Check for greeting (only at the start of conversation) ----
  if (conversationLength <= 2) {
    for (const pattern of GREETING_PATTERNS) {
      if (pattern.test(trimmed)) {
        return 'greeting';
      }
    }
  }

  // ---- Check for refusal patterns first ----
  for (const pattern of REFUSE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'refuse';
    }
  }

  // ---- Check for comparison patterns ----
  for (const pattern of COMPARE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'compare';
    }
  }

  // ---- If we already have recommendations and user is modifying, it's refine ----
  if (conversationLength > 2) {
    for (const pattern of REFINE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return 'refine';
      }
    }
  }

  // ---- Check if we have enough context to recommend ----
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

  // If we have enough skills/context, recommend even without explicit role
  if (hasSkills && hasBehavioral) {
    return 'recommend';
  }

  // ---- Conversation turn counting: avoid infinite clarification loops ----
  // Count user turns
  if (conversationLength >= MAX_CLARIFY_TURNS * 2 && hasRole) {
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
// 5. Enhanced Retrieval Engine (BM25-like scoring with TF-IDF weighting)
// ---------------------------------------------------------------------------

/** Simple stemmer – strips common suffixes for better matching */
function stem(word: string): string {
  const w = word.toLowerCase();
  // Order matters: longest suffix first
  const suffixes = ['ization', 'ational', 'fulness', 'ousness', 'iveness', 'tional', 'encies', 'ances', 'ments', 'ating', 'ation', 'ement', 'ness', 'ment', 'able', 'ible', 'ting', 'ence', 'ance', 'ious', 'eous', 'ical', 'ized', 'ised', 'izer', 'iser', 'ally', 'ful', 'ity', 'ing', 'ous', 'ive', 'ion', 'ism', 'ist', 'ity', 'ed', 'er', 'ly', 'al', 'ty'];
  for (const suf of suffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      return w.slice(0, -suf.length);
    }
  }
  return w;
}

/** Tokenise + stem a text field for BM25 scoring */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(stem);
}

/** Compute term frequency for a list of tokens */
function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

/** BM25-like score for a single document against query terms */
function bm25Score(
  docTokens: string[],
  queryTerms: string[],
  avgDocLen: number,
  docCount: number,
  dfMap: Map<string, number>,
  k1 = 1.5,
  b = 0.75,
): number {
  const docLen = docTokens.length;
  const tf = termFreq(docTokens);
  let score = 0;

  for (const qt of queryTerms) {
    const f = tf.get(qt) ?? 0;
    if (f === 0) continue;
    const df = dfMap.get(qt) ?? 1;
    const idf = Math.log((docCount - df + 0.5) / (df + 0.5) + 1);
    const tfNorm = (f * (k1 + 1)) / (f + k1 * (1 - b + b * (docLen / avgDocLen)));
    score += idf * tfNorm;
  }

  return score;
}

/** Multi-field boosting weights */
const FIELD_WEIGHTS = {
  name: 5.0,
  skills: 3.5,
  category: 2.5,
  description: 1.5,
  jobLevels: 2.0,
  testType: 2.0,
};

/** Parse duration string to minutes (best effort) */
function parseDurationToMinutes(dur: string): number {
  if (!dur) return 0;
  const m = dur.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Check if an assessment matches metadata constraints */
function matchesMetadataFilters(assessment: ScoredAssessment, state: ConversationState): boolean {
  // Remote constraint
  if (state.must_have_constraints.includes('remote') && !assessment.remoteTesting) {
    return false;
  }
  // Adaptive constraint
  if (state.must_have_constraints.includes('adaptive') && !assessment.adaptive) {
    return false;
  }
  // Duration constraint
  if (state.duration_preference) {
    const mins = parseDurationToMinutes(assessment.duration);
    if (state.duration_preference === 'quick' || state.duration_preference === 'short') {
      if (mins > 30 && mins > 0) return false;
    } else if (state.duration_preference.startsWith('under-')) {
      const maxMin = parseInt(state.duration_preference.replace('under-', ''), 10);
      if (!isNaN(maxMin) && mins > maxMin && mins > 0) return false;
    }
    // 'comprehensive' – no filtering
  }
  // Language preference
  if (state.language_preference) {
    const langs = assessment.languages.toLowerCase();
    if (langs && !langs.includes(state.language_preference.toLowerCase())) {
      // Don't hard-filter on language, just demote later
    }
  }
  return true;
}

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
    .filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'have', 'will', 'need', 'also', 'just', 'very', 'much', 'some', 'into'].includes(w.toLowerCase()));

  const allTerms = [...new Set([...searchTerms, ...roleWords])];

  // ---- Step 1: Broad DB retrieval with OR conditions ----
  let dbResults: ScoredAssessment[];

  if (allTerms.length === 0) {
    // No specific terms, return a broad set
    const results = await db.assessment.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    dbResults = results.map((a) => ({ ...a, score: 0 }));
  } else {
    // Build OR conditions for keyword matching
    const orConditions = allTerms.flatMap((term) => [
      { name: { contains: term } },
      { description: { contains: term } },
      { skills: { contains: term } },
      { category: { contains: term } },
      { jobLevels: { contains: term } },
    ]);

    dbResults = await db.assessment.findMany({
      where: { OR: orConditions },
      take: 80, // Get more candidates for reranking
    }).then((r) => r.map((a) => ({ ...a, score: 0 })));

    // If results are sparse, broaden progressively
    if (dbResults.length < 5) {
      // Try with just the role
      if (state.role) {
        const broader = await db.assessment.findMany({
          where: {
            OR: [
              { name: { contains: state.role } },
              { description: { contains: state.role } },
              { skills: { contains: state.role } },
            ],
          },
          take: 30,
        });
        for (const b of broader) {
          if (!dbResults.find((r) => r.id === b.id)) {
            dbResults.push({ ...b, score: 0 });
          }
        }
      }

      // If still sparse, try category-based search
      if (dbResults.length < 5 && state.assessment_preferences.length > 0) {
        for (const pref of state.assessment_preferences) {
          const catResults = await db.assessment.findMany({
            where: { category: { contains: pref } },
            take: 20,
          });
          for (const c of catResults) {
            if (!dbResults.find((r) => r.id === c.id)) {
              dbResults.push({ ...c, score: 0 });
            }
          }
        }
      }

      // If still sparse, add related assessments as fallback
      if (dbResults.length < 5) {
        const fallback = await db.assessment.findMany({ take: 20, orderBy: { createdAt: 'desc' } });
        for (const f of fallback) {
          if (!dbResults.find((r) => r.id === f.id)) {
            dbResults.push({ ...f, score: 0 });
          }
        }
      }
    }
  }

  // ---- Step 2: Apply metadata filtering (pre-scoring) ----
  // Separate into filtered-in and filtered-out (we'll demote filtered-out rather than drop)
  const [matching, filteredOut] = dbResults.reduce(
    ([m, f], a) => matchesMetadataFilters(a, state) ? [[...m, a], f] : [m, [...f, a]],
    [[], []] as [ScoredAssessment[], ScoredAssessment[]],
  );

  const candidates = [...matching, ...filteredOut];

  // ---- Step 3: BM25-like scoring with multi-field boosting ----

  // Tokenize all candidate fields for BM25
  interface DocFields {
    name: string[];
    skills: string[];
    category: string[];
    description: string[];
    jobLevels: string[];
    testType: string[];
    allTokens: string[];
  }

  const docFieldTokens: Map<string, DocFields> = new Map();
  const allDocLengths: number[] = [];
  const dfMap: Map<string, number> = new Map();

  for (const a of candidates) {
    const nameTokens = tokenize(a.name);
    const skillsTokens = tokenize(a.skills);
    const categoryTokens = tokenize(a.category);
    const descTokens = tokenize(a.description);
    const jobLevelTokens = tokenize(a.jobLevels);
    const testTypeTokens = tokenize(a.testType);
    const allTokens = [...nameTokens, ...skillsTokens, ...categoryTokens, ...descTokens, ...jobLevelTokens, ...testTypeTokens];

    docFieldTokens.set(a.id, { name: nameTokens, skills: skillsTokens, category: categoryTokens, description: descTokens, jobLevels: jobLevelTokens, testType: testTypeTokens, allTokens });
    allDocLengths.push(allTokens.length);

    // Update document frequency
    const uniqueTerms = new Set(allTokens);
    for (const t of uniqueTerms) {
      dfMap.set(t, (dfMap.get(t) ?? 0) + 1);
    }
  }

  const avgDocLen = allDocLengths.length > 0 ? allDocLengths.reduce((a, b) => a + b, 0) / allDocLengths.length : 50;
  const docCount = candidates.length;

  // Tokenize query terms
  const queryStems = allTerms.flatMap((t) => tokenize(t));

  // ---- Step 4: Score each candidate ----
  const scored = candidates.map((assessment) => {
    const fields = docFieldTokens.get(assessment.id);
    if (!fields) return { ...assessment, score: 0 };

    // BM25 score per field with boosting
    let score = 0;
    score += bm25Score(fields.name, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.name;
    score += bm25Score(fields.skills, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.skills;
    score += bm25Score(fields.category, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.category;
    score += bm25Score(fields.description, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.description;
    score += bm25Score(fields.jobLevels, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.jobLevels;
    score += bm25Score(fields.testType, queryStems, avgDocLen, docCount, dfMap) * FIELD_WEIGHTS.testType;

    // ---- Additional bonus signals ----

    // Seniority match
    if (state.seniority && assessment.jobLevels.toLowerCase().includes(state.seniority.toLowerCase())) {
      score += 6;
    }

    // Must-have constraints bonus
    if (state.must_have_constraints.includes('remote') && assessment.remoteTesting) {
      score += 4;
    }
    if (state.must_have_constraints.includes('adaptive') && assessment.adaptive) {
      score += 4;
    }

    // Behavioral requirements boost
    for (const beh of state.behavioral_requirements) {
      if (assessment.skills.toLowerCase().includes(beh.toLowerCase())) {
        score += 5;
      }
    }

    // Assessment preferences boost
    for (const pref of state.assessment_preferences) {
      if (assessment.category.toLowerCase().includes(pref.toLowerCase()) || assessment.testType.includes(getTestTypeCode(pref))) {
        score += 4;
      }
    }

    // Language preference boost
    if (state.language_preference && assessment.languages.toLowerCase().includes(state.language_preference.toLowerCase())) {
      score += 3;
    }

    // Duration preference boost
    if (state.duration_preference) {
      const mins = parseDurationToMinutes(assessment.duration);
      if (state.duration_preference === 'quick' || state.duration_preference === 'short') {
        if (mins > 0 && mins <= 25) score += 3;
      } else if (state.duration_preference.startsWith('under-')) {
        const maxMin = parseInt(state.duration_preference.replace('under-', ''), 10);
        if (!isNaN(maxMin) && mins > 0 && mins <= maxMin) score += 3;
      }
    }

    // Excluded constraints penalty
    for (const excl of state.excluded_constraints) {
      if (assessment.category.toLowerCase().includes(excl.toLowerCase())) {
        score -= 10;
      }
      if (assessment.testType.includes(getTestTypeCode(excl))) {
        score -= 8;
      }
    }

    // Metadata filter demotion (penalise items that didn't pass metadata filters)
    if (!matchesMetadataFilters(assessment, state)) {
      score -= 15;
    }

    // Recency / freshness boosting (newer assessments get a small bonus)
    const ageDays = (Date.now() - assessment.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2 - ageDays * 0.01); // Up to +2 for very recent

    // Partial word matching bonus (substring matching on name/skills)
    for (const term of allTerms) {
      const termLower = term.toLowerCase();
      const termStem = stem(termLower);
      // Check if stemmed term appears in any field's stemmed tokens
      if (fields.name.some((t) => t.includes(termStem) || termStem.includes(t))) score += 2;
      if (fields.skills.some((t) => t.includes(termStem) || termStem.includes(t))) score += 1.5;
    }

    return { ...assessment, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // ---- Step 5: Diversity injection ----
  // Ensure recommendations cover different test types when possible
  const diverseResults = injectDiversity(scored);

  return diverseResults;
}

/** Inject diversity: ensure top results cover different test types */
function injectDiversity(scored: ScoredAssessment[]): ScoredAssessment[] {
  if (scored.length <= 5) return scored;

  const result: ScoredAssessment[] = [];
  const seenTypes = new Set<string>();

  // First pass: take top results but ensure diversity
  for (const a of scored) {
    if (result.length >= 15) break;
    if (!seenTypes.has(a.testType) || result.length < 5) {
      result.push(a);
      seenTypes.add(a.testType);
    }
  }

  // Second pass: fill remaining slots with best remaining
  for (const a of scored) {
    if (result.length >= 20) break;
    if (!result.find((r) => r.id === a.id)) {
      result.push(a);
    }
  }

  return result;
}

function getTestTypeCode(preference: string): string {
  const prefLower = preference.toLowerCase();
  if (prefLower.includes('cognitive') || prefLower.includes('ability') || prefLower.includes('aptitude') || prefLower.includes('numerical') || prefLower.includes('verbal') || prefLower.includes('inductive') || prefLower.includes('deductive')) return 'C';
  if (prefLower.includes('personality')) return 'P';
  if (prefLower.includes('behavioral') || prefLower.includes('situational')) return 'B';
  if (prefLower.includes('simulation')) return 'S';
  if (prefLower.includes('technical') || prefLower.includes('knowledge') || prefLower.includes('skills') || prefLower.includes('coding')) return 'K';
  if (prefLower.includes('emotional')) return 'E';
  if (prefLower.includes('development')) return 'D';
  return '';
}

// ---------------------------------------------------------------------------
// 6. Enhanced LLM Prompt Engineering
// ---------------------------------------------------------------------------

function buildSystemPrompt(intent: Intent, catalogData: string, stateSummary: string): string {
  // Base persona rules (shared across all intents)
  const baseRules = `You are a professional SHL assessment recommender agent. Your personality: concise, helpful, and evidence-based.

CORE RULES:
1. You MUST only recommend assessments from the CATALOG DATA below. NEVER invent or hallucinate assessments.
2. If no catalog data matches, say so honestly rather than making up assessments.
3. Support refinements, comparisons, and clarifications.
4. Maximum 2 clarification turns before recommending something.
5. Be concise — aim for 2-4 sentences plus any recommendation list.
6. When recommending, always explain briefly WHY each assessment fits.
7. Never provide advice on salary, legal matters, medical topics, politics, or harmful content.

CURRENT EXTRACTED CONTEXT: ${stateSummary || 'None yet'}`;

  // Intent-specific instructions
  const intentInstructions: Record<Intent, string> = {
    greeting: `GREETING INTENT:
The user is greeting you. Respond warmly and briefly, then offer to help find SHL assessments.
Example: "Hello! 👋 I'm your SHL assessment advisor. I can help you find the right assessments for any role. What position are you hiring for?"`,

    clarify: `CLARIFY INTENT:
You need more information to recommend assessments. Ask the SINGLE most important missing question.

Priority order for clarification:
1. Role/job family (most important)
2. Seniority level
3. Technical vs behavioral emphasis
4. Specific skills to assess
5. Duration or format preferences

Example: "What specific role are you hiring for? For example, a Java developer, a sales manager, or a data analyst?"

DO NOT include a <<RECOMMENDATIONS>> block. Just ask your clarifying question directly.`,

    recommend: `RECOMMEND INTENT:
You have enough context to recommend assessments. Provide 1-10 assessments from the catalog.

Think step-by-step:
1. What role and skills does the user need assessed?
2. Which catalog assessments best match those needs?
3. Are there different test types (cognitive, behavioral, technical) that together provide a well-rounded evaluation?

Then output your recommendations in the EXACT format below.

OUTPUT FORMAT (MANDATORY):
<<RECOMMENDATIONS>>
AssessmentName|URL|TestType
AssessmentName|URL|TestType
<<END_RECOMMENDATIONS>>

Then write your conversational reply (2-4 sentences explaining the picks).

Example:
<<RECOMMENDATIONS>>
Java 8 (New) | https://www.shl.com/solutions/products/product-catalog/java-8-new/ | K
OPQ32 | https://www.shl.com/solutions/products/product-catalog/opq32/ | P
<<END_RECOMMENDATIONS>>
Based on your need for a senior Java developer, I'd recommend the Java 8 knowledge test for technical skills, paired with the OPQ32 personality assessment to understand work style and team fit.`,

    refine: `REFINE INTENT:
The user wants to modify their previous recommendations. Adjust based on their new input while keeping relevant previous context.

Think step-by-step:
1. What did they want to add, remove, or change?
2. Which new catalog assessments better match the refined criteria?
3. Which previous recommendations still apply?

OUTPUT FORMAT (MANDATORY):
<<RECOMMENDATIONS>>
AssessmentName|URL|TestType
<<END_RECOMMENDATIONS>>

Then explain what changed and why.

Example:
<<RECOMMENDATIONS>>
Python (New) | https://www.shl.com/solutions/products/product-catalog/python-new/ | K
Verify Numerical Reasoning | https://www.shl.com/solutions/products/product-catalog/verify-numerical-reasoning/ | C
<<END_RECOMMENDATIONS>>
I've swapped the Java test for Python to match your updated requirement, and added a numerical reasoning test as requested.`,

    compare: `COMPARE INTENT:
The user wants to compare assessments. Provide a structured comparison.

OUTPUT FORMAT:
First, output the assessments being compared:
<<RECOMMENDATIONS>>
AssessmentName|URL|TestType
AssessmentName|URL|TestType
<<END_RECOMMENDATIONS>>

Then write a comparison using this markdown table format:

| Attribute | Assessment A | Assessment B |
|-----------|-------------|-------------|
| Test Type | ... | ... |
| Duration | ... | ... |
| Remote | ... | ... |
| Adaptive | ... | ... |
| Category | ... | ... |
| Key Skills Assessed | ... | ... |

After the table, provide a brief recommendation on which to choose based on the user's context.

Example:
<<RECOMMENDATIONS>>
Verify Numerical Reasoning | https://www.shl.com/solutions/products/product-catalog/verify-numerical-reasoning/ | C
Verify Verbal Reasoning | https://www.shl.com/solutions/products/product-catalog/verify-verbal-reasoning/ | C
<<END_RECOMMENDATIONS>>

| Attribute | Verify Numerical | Verify Verbal |
|-----------|-----------------|---------------|
| Test Type | Cognitive | Cognitive |
| Duration | 17 min | 17 min |
| Remote | Yes | Yes |
...`,

    refuse: `REFUSE INTENT:
The user asked about something outside your scope (salary, legal, medical, etc.).
Politely decline and redirect to SHL assessments.

Example: "I appreciate the question, but I'm specifically designed to help with SHL assessment recommendations. I can't advise on salary negotiations, but I can help you find assessments to evaluate candidates' skills and fit. Would you like assessment suggestions for a specific role?"`,
  };

  return `${baseRules}

${intentInstructions[intent]}

CATALOG DATA:
${catalogData}`;
}

function formatCatalogData(assessments: ScoredAssessment[]): string {
  return assessments
    .slice(0, 20)
    .map(
      (a) =>
        `Name: ${a.name} | URL: ${a.url} | TestType: ${a.testType} | Category: ${a.category} | Duration: ${a.duration} | JobLevels: ${a.jobLevels} | Skills: ${a.skills} | Remote: ${a.remoteTesting} | Adaptive: ${a.adaptive} | Languages: ${a.languages}`
    )
    .join('\n');
}

/** Format assessments for comparison (structured table format) */
function formatComparisonData(assessments: ScoredAssessment[]): string {
  if (assessments.length === 0) return 'No assessments found for comparison.';

  const header = '| Attribute | ' + assessments.map((a) => a.name).join(' | ') + ' |';
  const separator = '|-----------|' + assessments.map(() => '-------------').join('|') + '|';

  const rows = [
    `| Test Type | ${assessments.map((a) => TEST_TYPE_LABELS[a.testType] ?? a.testType).join(' | ')} |`,
    `| Duration | ${assessments.map((a) => a.duration).join(' | ')} |`,
    `| Remote | ${assessments.map((a) => a.remoteTesting ? 'Yes' : 'No').join(' | ')} |`,
    `| Adaptive | ${assessments.map((a) => a.adaptive ? 'Yes' : 'No').join(' | ')} |`,
    `| Category | ${assessments.map((a) => a.category).join(' | ')} |`,
    `| Key Skills | ${assessments.map((a) => a.skills.split(',').slice(0, 5).join(', ')).join(' | ')} |`,
    `| Job Levels | ${assessments.map((a) => a.jobLevels).join(' | ')} |`,
    `| URL | ${assessments.map((a) => a.url).join(' | ')} |`,
  ];

  return [header, separator, ...rows].join('\n');
}

async function generateLLMResponse(
  messages: ChatMessage[],
  catalogData: string,
  stateSummary: string,
  intent: Intent,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(intent, catalogData, stateSummary);

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
// 7. Response Parsing
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
            duration: catalogMatch.duration || undefined,
            remote_testing: catalogMatch.remoteTesting || undefined,
            adaptive: catalogMatch.adaptive || undefined,
            category: catalogMatch.category || undefined,
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
// 8. Enhanced Comparison Logic
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

  // "which one is better X or Y"
  const whichMatch = message.match(/which\s+(?:one\s+)?(?:is\s+)?better\s+(.+?)\s+or\s+(.+)/i);
  if (whichMatch) {
    names.push(whichMatch[1].trim());
    names.push(whichMatch[2].trim().replace(/[.?!,;]+$/, ''));
    return names;
  }

  // "pros and cons of X and Y"
  const prosMatch = message.match(/pros\s+and\s+cons\s+(?:of\s+)?(.+?)\s+(?:and|vs\.?|versus)\s+(.+)/i);
  if (prosMatch) {
    names.push(prosMatch[1].trim());
    names.push(prosMatch[2].trim().replace(/[.?!,;]+$/, ''));
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
// 9. Main Engine - Process Chat
// ---------------------------------------------------------------------------

export async function processChat(messages: ChatMessage[]): Promise<ChatResponse> {
  // Edge case: empty messages
  if (!messages || messages.length === 0) {
    return {
      reply: "Hello! I'm your SHL assessment recommender. I can help you find the right assessments for your hiring needs. What role are you looking to hire for?",
      recommendations: [],
      end_of_conversation: false,
      extracted_context: {
        role: '', seniority: '', technical_skills: [], behavioral_requirements: [],
        assessment_preferences: [], must_have_constraints: [], excluded_constraints: [],
        duration_preference: '', language_preference: '',
      },
      context: { role: '', seniority: '', technical_skills: [], behavioral_requirements: [], assessment_preferences: [], must_have_constraints: [], excluded_constraints: [] },
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
      extracted_context: {
        role: '', seniority: '', technical_skills: [], behavioral_requirements: [],
        assessment_preferences: [], must_have_constraints: [], excluded_constraints: [],
        duration_preference: '', language_preference: '',
      },
      context: { role: '', seniority: '', technical_skills: [], behavioral_requirements: [], assessment_preferences: [], must_have_constraints: [], excluded_constraints: [] },
    };
  }

  // Get the latest user message
  const lastUserMsg = [...validMessages].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return {
      reply: "I didn't catch that. Could you tell me what role you're hiring for?",
      recommendations: [],
      end_of_conversation: false,
      extracted_context: {
        role: '', seniority: '', technical_skills: [], behavioral_requirements: [],
        assessment_preferences: [], must_have_constraints: [], excluded_constraints: [],
        duration_preference: '', language_preference: '',
      },
      context: { role: '', seniority: '', technical_skills: [], behavioral_requirements: [], assessment_preferences: [], must_have_constraints: [], excluded_constraints: [] },
    };
  }

  // Extract conversation state
  const state = extractState(validMessages);

  // Classify intent
  const intent = classifyIntent(lastUserMsg.content, state, validMessages.length);

  // ---- Handle greeting ----
  if (intent === 'greeting') {
    return {
      reply: "Hello! 👋 I'm your SHL assessment advisor. I can help you find the right assessments for any role or skill set. What position are you hiring for?",
      recommendations: [],
      end_of_conversation: false,
      extracted_context: state,
      context: toFrontendContext(state),
    };
  }

  // ---- Handle refusal ----
  if (intent === 'refuse') {
    const refuseTopics: Record<string, string> = {
      salary: 'salary or compensation',
      compensation: 'salary or compensation',
      pay: 'salary or compensation',
      wage: 'salary or compensation',
      bonus: 'salary or compensation',
      legal: 'legal advice',
      lawsuit: 'legal advice',
      attorney: 'legal advice',
      resume: 'resume or CV review',
      cv: 'resume or CV review',
      interview: 'interview coaching',
      ignore: 'that topic',
      jailbreak: 'that topic',
      hack: 'that topic',
      medical: 'medical advice',
      health: 'medical advice',
      doctor: 'medical advice',
      politic: 'political matters',
      election: 'political matters',
      harmful: 'harmful or dangerous content',
      dangerous: 'harmful or dangerous content',
      drug: 'illegal substances',
      gambling: 'gambling',
      hate: 'discriminatory content',
      discriminat: 'discriminatory content',
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
      reply: `I appreciate the question, but I'm specifically designed to help with SHL assessment recommendations. I can't advise on ${topic}, but I can help you find assessments to evaluate candidates' skills and fit. Would you like assessment suggestions for a specific role?`,
      recommendations: [],
      end_of_conversation: false,
      extracted_context: state,
      context: toFrontendContext(state),
    };
  }

  // Build state summary for LLM context
  const stateSummary = buildStateSummary(state);

  try {
    if (intent === 'compare') {
      return await handleCompare(validMessages, lastUserMsg.content, stateSummary, state);
    }

    if (intent === 'clarify') {
      return await handleClarify(validMessages, state, stateSummary);
    }

    // recommend or refine
    return await handleRecommend(validMessages, state, stateSummary, intent);
  } catch (error) {
    console.error('Engine error:', error);

    // Graceful fallback
    if (intent === 'clarify') {
      return {
        reply: "I'd like to help you find the right assessment. Could you tell me more about the role you're hiring for? For example, what is the job title and seniority level?",
        recommendations: [],
        end_of_conversation: false,
        extracted_context: state,
      context: toFrontendContext(state),
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
  if (state.technical_skills.length > 0) parts.push(`Skills: ${state.technical_skills.join(', ')}`);
  if (state.behavioral_requirements.length > 0) parts.push(`Behavioral: ${state.behavioral_requirements.join(', ')}`);
  if (state.assessment_preferences.length > 0) parts.push(`Pref: ${state.assessment_preferences.join(', ')}`);
  if (state.must_have_constraints.length > 0) parts.push(`Must: ${state.must_have_constraints.join(', ')}`);
  if (state.excluded_constraints.length > 0) parts.push(`Exclude: ${state.excluded_constraints.join(', ')}`);
  if (state.duration_preference) parts.push(`Duration: ${state.duration_preference}`);
  if (state.language_preference) parts.push(`Lang: ${state.language_preference}`);
  return parts.join('; ');
}

async function handleClarify(
  messages: ChatMessage[],
  state: ConversationState,
  stateSummary: string
): Promise<ChatResponse> {
  // Even for clarify, we retrieve some assessments so the LLM has context
  let catalogData = '';
  let assessments: ScoredAssessment[] = [];
  try {
    assessments = await retrieveAssessments(state);
    catalogData = formatCatalogData(assessments);
  } catch {
    catalogData = 'No catalog data available at the moment.';
  }

  const llmOutput = await generateLLMResponse(messages, catalogData, stateSummary, 'clarify');
  const parsed = parseLLMResponse(llmOutput, assessments);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: false,
    extracted_context: state,
    context: toFrontendContext(state),
  };
}

async function handleRecommend(
  messages: ChatMessage[],
  state: ConversationState,
  stateSummary: string,
  intent: Intent = 'recommend'
): Promise<ChatResponse> {
  const assessments = await retrieveAssessments(state);
  const catalogData = formatCatalogData(assessments);

  const llmOutput = await generateLLMResponse(messages, catalogData, stateSummary, intent);
  const parsed = parseLLMResponse(llmOutput, assessments);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: parsed.end_of_conversation,
    extracted_context: state,
    context: toFrontendContext(state),
  };
}

async function handleCompare(
  messages: ChatMessage[],
  userMessage: string,
  stateSummary: string,
  state: ConversationState
): Promise<ChatResponse> {
  const names = extractComparisonNames(userMessage);
  let assessments: ScoredAssessment[] = [];

  if (names.length >= 2) {
    assessments = await retrieveAssessmentsByName(names);
  }

  // If we couldn't find specific assessments, fall back to general retrieval
  if (assessments.length === 0) {
    assessments = await retrieveAssessments(state);
  }

  // Use structured comparison format instead of regular catalog format
  const comparisonData = formatComparisonData(assessments);
  const catalogData = formatCatalogData(assessments);

  // Combine: give the LLM both the comparison table and the catalog data
  const combinedData = `COMPARISON TABLE:\n${comparisonData}\n\nDETAILED CATALOG DATA:\n${catalogData}`;

  const llmOutput = await generateLLMResponse(messages, combinedData, stateSummary, 'compare');
  const parsed = parseLLMResponse(llmOutput, assessments);

  return {
    reply: parsed.reply,
    recommendations: parsed.recommendations,
    end_of_conversation: parsed.end_of_conversation,
    extracted_context: state,
    context: toFrontendContext(state),
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
        extracted_context: state,
        context: toFrontendContext(state),
      };
    }

    const recommendations: Recommendation[] = topAssessments.map((a) => ({
      name: a.name,
      url: a.url,
      test_type: a.testType,
      duration: a.duration || undefined,
      remote_testing: a.remoteTesting || undefined,
      adaptive: a.adaptive || undefined,
      category: a.category || undefined,
    }));

    const assessmentList = topAssessments
      .map((a) => `- **${a.name}** (${TEST_TYPE_LABELS[a.testType] ?? a.testType}, ${a.duration})`)
      .join('\n');

    const reply = `Based on your requirements, here are some assessments that may be relevant:\n\n${assessmentList}\n\nWould you like me to refine these recommendations or provide more details?`;

    return {
      reply,
      recommendations,
      end_of_conversation: false,
      extracted_context: state,
      context: toFrontendContext(state),
    };
  } catch {
    return {
      reply: "I'm having trouble accessing the assessment catalog right now. Please try again in a moment.",
      recommendations: [],
      end_of_conversation: false,
      extracted_context: state,
      context: toFrontendContext(state),
    };
  }
}
