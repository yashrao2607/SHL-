# SHL Assessment Recommender

> An AI-powered conversational system that recommends SHL assessments to recruiters and hiring managers. Built with Next.js 16, TypeScript, Prisma, and LLM integration — featuring BM25-based retrieval, fuzzy skill matching, intent classification, and strict grounding enforcement to ensure zero-hallucination recommendations.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
  - [POST /api/chat](#post-apichat)
  - [GET /api/health](#get-apihealth)
  - [GET /api/assessments/search](#get-apiassessmentssearch)
- [Core Engine Deep Dive](#core-engine-deep-dive)
  - [1. Conversational State Extraction](#1-conversational-state-extraction)
  - [2. Intent Classification](#2-intent-classification)
  - [3. BM25 Retrieval Engine](#3-bm25-retrieval-engine)
  - [4. LLM Response Generation](#4-llm-response-generation)
  - [5. Recommendation Parsing & Validation](#5-recommendation-parsing--validation)
  - [6. Guardrails & Safety](#6-guardrails--safety)
- [Assessment Catalog](#assessment-catalog)
- [Frontend Components](#frontend-components)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The **SHL Assessment Recommender** is a conversational AI application designed to help recruiters and hiring managers find the right SHL assessments for their hiring needs. Instead of browsing through hundreds of assessments manually, users can describe the role they're hiring for in natural language, and the system will intelligently recommend the most relevant assessments from the SHL catalog.

### What Problem Does It Solve?

- **Discovery**: SHL's catalog contains 150+ assessments across cognitive, personality, behavioral, technical, and simulation categories. Finding the right ones manually is time-consuming.
- **Matching**: Recruiters often don't know which assessment types are best for specific roles. The system maps role requirements to appropriate assessment types.
- **Comparison**: Users can compare assessments side-by-side to make informed decisions.
- **Refinement**: Conversational refinement allows users to narrow down recommendations iteratively.

### Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Zero Hallucination** | Only recommend assessments that exist in the catalog — enforced at parsing level |
| **Schema Compliance** | 100% response schema validation — every API response conforms to the spec |
| **Catalog-Only Grounding** | LLM responses are validated against retrieved catalog data before delivery |
| **Prompt Injection Defense** | Pattern-based detection of jailbreaks, role overrides, and catalog bypasses |
| **Recall@10 Optimization** | BM25 + metadata filtering + diversity injection for comprehensive coverage |

---

## Key Features

### Conversational Intelligence
- **Intent Classification**: Automatically detects 6 intent types — `clarify`, `recommend`, `refine`, `compare`, `refuse`, `greeting`
- **State Extraction**: Extracts role, seniority, skills, behavioral requirements, and preferences from conversation history
- **Fuzzy Skill Matching**: Recognizes 50+ skill aliases (e.g., "js" → "JavaScript", "k8s" → "Kubernetes", "golang" → "Go")
- **Compound Role Detection**: Recognizes multi-word roles like "full-stack developer", "data scientist", "DevOps engineer"

### Retrieval Engine
- **BM25 Scoring**: Multi-field BM25 scoring with field-specific boost weights
- **Metadata Filtering**: Hard filters for remote testing, adaptive support, and duration constraints
- **Diversity Injection**: Ensures recommendations span different test types for well-rounded evaluation
- **Progressive Broadening**: Automatically widens search when initial results are sparse

### User Experience
- **Real-time Chat Interface**: Animated message bubbles with typing indicators
- **Recommendation Cards**: Rich cards with test type badges, duration, remote/adaptive indicators
- **Context Sidebar**: Live display of extracted conversation context (role, skills, constraints)
- **Dark Mode**: Full light/dark theme support with smooth transitions
- **Feedback System**: Thumbs up/down on each response for continuous improvement
- **Conversation Persistence**: Chat history saved to localStorage and restored on reload
- **Mobile Responsive**: Fully responsive design optimized for all screen sizes

### Safety & Guardrails
- **Prompt Injection Detection**: Regex-based patterns for jailbreaks, role overrides, and system prompt extraction
- **Off-Topic Refusal**: Detects and politely refuses requests about salary, legal, medical, political, and harmful topics
- **Grounding Validation**: LLM output is parsed and validated against actual catalog data
- **Response Sanitization**: Recommendations with invalid URLs or unknown test types are filtered out

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                     │
│  ┌─────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Chat UI │  │ Context Side │  │ Recommendation Cards    │ │
│  │ (React) │  │ bar          │  │ with Test Type Badges   │ │
│  └────┬────┘  └──────────────┘  └─────────────────────────┘ │
│       │ POST /api/chat                                        │
└───────┼──────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────┐
│       ▼              Backend (Next.js API Routes)             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Chat API Route                         │ │
│  │  1. Validate request                                     │ │
│  │  2. Extract conversation state                           │ │
│  │  3. Classify intent                                      │ │
│  │  4. Retrieve & rank assessments (BM25)                   │ │
│  │  5. Generate LLM response with catalog grounding         │ │
│  │  6. Parse & validate recommendations                     │ │
│  │  7. Return structured response                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ State        │  │ Intent       │  │ BM25 Retrieval       ││
│  │ Extractor    │  │ Classifier   │  │ Engine               ││
│  │              │  │              │  │                      ││
│  │ - Role       │  │ - clarify    │  │ - Multi-field BM25  ││
│  │ - Seniority  │  │ - recommend  │  │ - Metadata filter   ││
│  │ - Skills     │  │ - refine     │  │ - Diversity inject  ││
│  │ - Behavioral │  │ - compare    │  │ - Progressive widen ││
│  │ - Duration   │  │ - refuse     │  │                      ││
│  │ - Language   │  │ - greeting   │  │                      ││
│  └──────────────┘  └──────────────┘  └──────────────────────┘│
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │ LLM          │  │ Rec Parser   │  │ Guardrails           ││
│  │ (z-ai-sdk)   │  │ & Validator  │  │                      ││
│  │              │  │              │  │ - Injection detect   ││
│  │ - Prompt     │  │ - Extract    │  │ - Off-topic refuse   ││
│  │   engineering│  │   recs from  │  │ - URL validation     ││
│  │ - Catalog    │  │   LLM output │  │ - Schema compliance  ││
│  │   grounding  │  │ - Validate   │  │                      ││
│  │ - Intent-    │  │   against DB │  │                      ││
│  │   aware      │  │ - Sanitize   │  │                      ││
│  └──────────────┘  └──────────────┘  └──────────────────────┘│
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Prisma ORM → SQLite Database                │ │
│  │              (150+ SHL Assessments)                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User Message
    │
    ▼
┌─────────────────────┐
│ 1. State Extraction  │  Extract role, seniority, skills, behavioral,
│    (regex + fuzzy)   │  preferences, constraints from ALL messages
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. Intent Router     │  Classify: clarify | recommend | refine |
│    (pattern-based)   │  compare | refuse | greeting
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. Retrieval Engine  │  1. Broad DB query with OR conditions
│    (BM25 + filters)  │  2. Metadata filtering (remote, adaptive, duration)
│                      │  3. Multi-field BM25 scoring with boost weights
│                      │  4. Bonus signals (seniority, language, etc.)
│                      │  5. Diversity injection across test types
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. LLM Generation    │  Build intent-specific system prompt with
│    (catalog-grounded)│  catalog data. Generate response with
│                      │  <<RECOMMENDATIONS>> block format.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Parse & Validate  │  Extract recommendations from LLM output.
│    (grounding check) │  Validate each against catalog DB.
│                      │  Filter out hallucinated assessments.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Response          │  Return structured ChatResponse with
│    (schema-compliant)│  reply, recommendations[], end_of_conversation
└─────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework with API routes |
| **Language** | TypeScript 5 | Type-safe development throughout |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Utility-first CSS with pre-built accessible components |
| **Database** | Prisma ORM + SQLite | Type-safe database access with embedded database |
| **State Management** | Zustand | Lightweight client-side state with localStorage persistence |
| **Animations** | Framer Motion | Smooth UI transitions and micro-interactions |
| **LLM Integration** | z-ai-web-dev-sdk | Backend LLM API for chat completions |
| **Markdown** | ReactMarkdown | Rich text rendering for assistant responses |
| **Theme** | next-themes | Dark/light mode with system preference detection |
| **Notifications** | Sonner | Toast notifications for user feedback |
| **Icons** | Lucide React | Consistent icon set across the UI |

---

## Project Structure

```
shl-assessment-recommender/
├── prisma/
│   ├── schema.prisma              # Database schema (Assessment model)
│   └── seed.ts                    # 150+ SHL assessment records (2305 lines)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with ThemeProvider
│   │   ├── page.tsx               # Main page (chat interface)
│   │   ├── globals.css            # Global styles
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts       # POST /api/chat - Main chat endpoint
│   │       ├── health/
│   │       │   └── route.ts       # GET /api/health - Health check
│   │       └── assessments/
│   │           └── search/
│   │               └── route.ts   # GET /api/assessments/search - Search endpoint
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── chat-input.tsx         # Auto-resizing textarea with send button
│   │   │   ├── chat-messages.tsx      # Message list with scroll & animations
│   │   │   ├── context-sidebar.tsx    # Live conversation context display
│   │   │   ├── feedback-buttons.tsx   # Thumbs up/down for each response
│   │   │   ├── recommendation-card.tsx # Rich assessment cards with badges
│   │   │   ├── typing-indicator.tsx   # Animated "Searching catalog..." dots
│   │   │   └── welcome-screen.tsx     # Landing screen with feature cards & suggestions
│   │   ├── theme-toggle.tsx           # Dark/light mode toggle
│   │   └── ui/                        # 40+ shadcn/ui components
│   │
│   ├── lib/
│   │   ├── assessment-engine.ts   # Core engine: state, intent, BM25, LLM, validation
│   │   ├── chat-store.ts          # Zustand store with localStorage persistence
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── utils.ts               # Utility functions (cn, etc.)
│   │
│   └── hooks/
│       ├── use-mobile.ts          # Mobile detection hook
│       └── use-toast.ts           # Toast notification hook
│
├── public/
│   ├── shl-logo.png               # SHL logo
│   └── robots.txt                 # Search engine directives
│
├── scripts/
│   ├── scrape_catalog.mjs         # SHL catalog scraping script
│   ├── scrape_products.mjs        # Product page scraping script
│   └── scrape_all.mjs             # Combined scraping pipeline
│
├── upload/                        # Raw scraped data (JSON)
│   ├── catalog_main.json
│   ├── individual_products.json
│   ├── prepackaged_products.json
│   └── product_pages/             # Individual product page data
│
├── db/
│   └── custom.db                  # SQLite database file
│
├── package.json                   # Dependencies and scripts
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── Caddyfile                      # Reverse proxy gateway config
└── README.md                      # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Bun** >= 1.0 (recommended package manager)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/yashrao2607/SHL-.git
cd SHL-

# Install dependencies
bun install

# Generate Prisma client
bun run db:generate
```

### Database Setup

```bash
# Push the Prisma schema to create the database
bun run db:push

# Seed the database with 150+ SHL assessments
bunx prisma db seed
```

The seed script (`prisma/seed.ts`) populates the database with a comprehensive catalog of SHL assessments across 8 categories:

| Category | Code | Count | Examples |
|----------|------|-------|---------|
| Cognitive Ability | C | 14+ | Verify Numerical/Verbal/Inductive Reasoning, Verify G+ |
| Personality | P | 10+ | OPQ32r, OPQ32n, MQ Profile, OPQ Leadership/Sales Reports |
| Technical (Knowledge) | K | 80+ | Java, Python, C#, JavaScript, React, Docker, Kubernetes, AWS |
| Behavioral | B | 5+ | Situational Judgment, Behavioral Assessment |
| Simulation | S | 5+ | Simulation exercises, In-basket exercises |
| Ability | A | 5+ | General Ability, Comprehensive Ability |
| Emotional Intelligence | E | 3+ | EQ-i 2.0, Emotional Intelligence Assessment |
| Development | D | 3+ | Development Indicator, Career Development |

### Running the Application

```bash
# Start the development server
bun run dev

# The application will be available at http://localhost:3000
```

### Linting

```bash
# Run ESLint to check code quality
bun run lint
```

---

## API Reference

### POST /api/chat

The primary conversational endpoint. Accepts a list of chat messages and returns an AI-generated reply with optional assessment recommendations.

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "I need assessments for a senior Java developer" },
    { "role": "assistant", "content": "I'd recommend the following..." },
    { "role": "user", "content": "Also add a cognitive test" }
  ]
}
```

**Response:**

```json
{
  "reply": "I've added a cognitive assessment to complement the Java knowledge test...",
  "recommendations": [
    {
      "name": "Java 8 (New)",
      "url": "https://www.shl.com/products/product-catalog/view/java-8-new/",
      "test_type": "K",
      "duration": "30 minutes",
      "remote_testing": true,
      "adaptive": true,
      "category": "Technical"
    },
    {
      "name": "Verify - Numerical Reasoning",
      "url": "https://www.shl.com/products/product-catalog/view/verify-numerical-reasoning/",
      "test_type": "C",
      "duration": "25 minutes",
      "remote_testing": true,
      "adaptive": false,
      "category": "Cognitive"
    }
  ],
  "end_of_conversation": false,
  "context": {
    "role": "senior Java developer",
    "seniority": "Senior",
    "technical_skills": ["Java"],
    "behavioral_requirements": [],
    "assessment_preferences": ["cognitive"],
    "must_have_constraints": [],
    "excluded_constraints": []
  }
}
```

**Request Validation:**
- `messages` array is required and must contain at least one message
- Each message must have `role` ("user" or "assistant") and `content` (string)
- Message content is capped at 2,000 characters
- Conversation is limited to the last 30 messages to prevent abuse
- Invalid requests return a 400 status with a descriptive error message

**Error Responses:**
- `400` — Invalid request format or missing fields
- `500` — Internal server error (LLM timeout, network issues, etc.)

---

### GET /api/health

Simple health check endpoint for monitoring and load balancer configuration.

**Response:**

```json
{
  "status": "ok"
}
```

---

### GET /api/assessments/search

Direct assessment search endpoint with filtering capabilities. Useful for programmatic access and testing.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | "" | Free-text search across name, description, skills, category, job levels |
| `category` | string | "" | Filter by category (e.g., "Technical", "Cognitive", "Personality") |
| `testType` | string | "" | Filter by test type code (K, C, P, B, S, A, E, D) |
| `remote` | string | "" | Filter by remote testing support ("true" / "false") |
| `adaptive` | string | "" | Filter by adaptive testing support ("true" / "false") |
| `limit` | number | 20 | Maximum results to return (1-100) |

**Example Request:**

```
GET /api/assessments/search?q=Java&category=Technical&remote=true&limit=10
```

**Response:**

```json
{
  "assessments": [
    {
      "id": "clx...",
      "name": "Java 8 (New)",
      "slug": "java-8-new",
      "url": "https://www.shl.com/products/product-catalog/view/java-8-new/",
      "description": "Evaluates proficiency in Java 8...",
      "testType": "K",
      "category": "Technical",
      "remoteTesting": true,
      "adaptive": true,
      "duration": "30 minutes",
      "jobLevels": "Mid-Level,Senior",
      "languages": "English",
      "skills": "Java 8,Lambda Expressions,Streams API"
    }
  ],
  "total": 5,
  "limit": 10,
  "query": {
    "q": "Java",
    "category": "Technical",
    "testType": "",
    "remote": "true",
    "adaptive": ""
  }
}
```

---

## Core Engine Deep Dive

The heart of the application is `src/lib/assessment-engine.ts` — a ~1,400-line module that orchestrates the entire recommendation pipeline.

### 1. Conversational State Extraction

The `extractState()` function processes all user messages in the conversation to build a structured `ConversationState` object:

```typescript
interface ConversationState {
  role: string;                    // e.g., "full-stack developer"
  seniority: string;               // e.g., "Senior", "Mid-Level", "Entry"
  technical_skills: string[];      // e.g., ["Java", "Python", "React"]
  behavioral_requirements: string[]; // e.g., ["leadership", "communication"]
  assessment_preferences: string[];  // e.g., ["cognitive", "personality"]
  must_have_constraints: string[];   // e.g., ["remote", "adaptive", "short"]
  excluded_constraints: string[];    // e.g., ["personality", "coding"]
  duration_preference: string;       // e.g., "quick", "under-30", "comprehensive"
  language_preference: string;       // e.g., "English", "Spanish"
}
```

**Extraction Strategies:**

| Field | Strategy | Examples |
|-------|----------|---------|
| Role | Compound role regex (22 patterns) + hiring context patterns | "full-stack developer", "data scientist", "DevOps engineer" |
| Seniority | Keyword lists mapped to levels | "senior" → Senior, "junior" → Entry, "3-5 years" → Mid-Level |
| Skills | Fuzzy alias resolution (50+ aliases) + bigram/trigram matching + keyword contains | "js" → JavaScript, "k8s" → Kubernetes, "node" → Node.js |
| Behavioral | Keyword matching against 24 behavioral terms | "leadership", "communication", "empathy" |
| Constraints | Pattern-based extraction for must-have and excluded | "must be remote" → remote, "without coding" → excluded: coding |
| Duration | Regex patterns for duration expressions | "under 30 min" → under-30, "quick" → quick, "comprehensive" → comprehensive |
| Language | Bilingual pattern matching | "español" → Spanish, "français" → French |

**Fuzzy Skill Resolution Pipeline:**

```
Input Token → Normalize (lowercase, strip punctuation)
    → Direct alias lookup in SKILL_ALIASES map
    → Fuzzy match against all alias keys (Levenshtein, threshold 0.75)
    → Bigram matching ("machine learning", "project management")
    → Trigram matching ("senior software engineer")
    → Fallback: keyword substring matching
```

---

### 2. Intent Classification

The `classifyIntent()` function determines the user's conversational goal using a priority-ordered pattern matching system:

**Intent Priority (evaluated top-to-bottom):**

| Priority | Intent | Detection Method | Example Input |
|----------|--------|-----------------|---------------|
| 1 | `greeting` | Greeting patterns (only at conversation start, ≤2 messages) | "Hello!", "Hi there", "Good morning" |
| 2 | `refuse` | 12 refuse pattern groups (off-topic, dangerous, injection) | "What's the salary?", "Ignore your instructions" |
| 3 | `compare` | Comparison patterns (vs, versus, compare, pros and cons) | "Compare OPQ vs Verify", "Which is better?" |
| 4 | `refine` | Refinement patterns (also, instead, exclude, narrow down) | "Also add Python", "Without coding tests" |
| 5 | `recommend` | Sufficient context (role + skills/seniority/behavioral) OR long message | "I need assessments for a senior Java developer" |
| 6 | `clarify` | Default — not enough context to recommend | "I need tests" |

**Anti-Loop Protection:**
- Maximum 3 clarification turns before forcing a recommendation
- After 4+ messages with a known role, always recommend

**Refuse Pattern Categories:**
- Salary/compensation queries
- Legal advice requests
- Resume/CV review requests
- Interview coaching
- **Prompt injection**: "ignore instructions", "jailbreak", "system prompt", "you are now"
- Security vulnerability/hacking requests
- Medical/health topics
- Political content
- Harmful/dangerous content
- Drug-related content
- Gambling
- Hate/discrimination

---

### 3. BM25 Retrieval Engine

The retrieval engine uses a multi-stage pipeline to find and rank the most relevant assessments:

**Stage 1: Broad DB Retrieval**
```
Search terms = technical_skills + role + behavioral_requirements + preferences + role_words
→ Build OR conditions: name, description, skills, category, jobLevels
→ Query DB with OR conditions (limit: 80)
→ If results < 5: progressively broaden search
    → Try role-only search
    → Try category-based search
    → Fallback: recent assessments
```

**Stage 2: Metadata Filtering**
```
Hard filters (exclude non-matching):
  - Remote testing required → filter out non-remote
  - Adaptive testing required → filter out non-adaptive
  - Duration preference → filter out over-duration assessments
```

**Stage 3: BM25 Scoring**

Multi-field BM25 scoring with field-specific boost weights:

| Field | Weight | Rationale |
|-------|--------|-----------|
| `name` | 5.0 | Highest signal — assessment name is the strongest relevance indicator |
| `skills` | 3.5 | Skills assessed are the primary matching criterion |
| `category` | 2.5 | Category alignment is important for broad relevance |
| `jobLevels` | 2.0 | Seniority matching improves precision |
| `testType` | 2.0 | Test type alignment with preferences |
| `description` | 1.5 | Lowest weight — descriptions are verbose and noisy |

**BM25 Parameters:**
- `k1 = 1.5` (term frequency saturation)
- `b = 0.75` (document length normalization)

**Additional Scoring Signals:**

| Signal | Points | Description |
|--------|--------|-------------|
| Seniority match | +6 | Assessment job levels include extracted seniority |
| Remote constraint match | +4 | Assessment supports remote testing |
| Adaptive constraint match | +4 | Assessment is adaptive |
| Behavioral skill match | +5 | Assessment skills include behavioral requirement |
| Assessment preference match | +4 | Category or test type matches preference |
| Language match | +3 | Assessment supports preferred language |
| Duration match | +3 | Assessment duration fits preference |
| Excluded constraint penalty | -10/-8 | Category or test type matches excluded constraint |
| Metadata filter demotion | -15 | Assessment failed hard metadata filter |
| Recency bonus | +0 to +2 | Newer assessments get a small boost |
| Partial word match | +1.5 to +2 | Stemmed term appears in field tokens |

**Stage 4: Diversity Injection**

Ensures recommendations span different test types:
1. **First pass**: Take top results, but only one per test type until 5 slots are filled
2. **Second pass**: Fill remaining slots (up to 20) with best remaining scores

---

### 4. LLM Response Generation

The system uses the z-ai-web-dev-sdk to generate natural language responses grounded in catalog data.

**Prompt Engineering Strategy:**

Each intent type has a specialized system prompt:

- **`greeting`**: Warm welcome + offer to help, no recommendations
- **`clarify`**: Ask the single most important missing question, no recommendations
- **`recommend`**: Think step-by-step, output `<<RECOMMENDATIONS>>` block, explain picks
- **`refine`**: Adjust based on new input, output updated `<<RECOMMENDATIONS>>` block
- **`compare`**: Output `<<RECOMMENDATIONS>>` block + markdown comparison table
- **`refuse`**: Polite decline + redirect to assessments

**Grounding Enforcement:**

The system prompt includes:
1. **Core Rules**: "You MUST only recommend assessments from the CATALOG DATA below. NEVER invent or hallucinate assessments."
2. **Catalog Data**: Top 20 scored assessments are injected as structured catalog data
3. **State Context**: Current extracted state is provided for contextual responses
4. **Output Format**: Mandatory `<<RECOMMENDATIONS>>` block with pipe-delimited format for reliable parsing

**Structured Output Format:**

```
<<RECOMMENDATIONS>>
AssessmentName|URL|TestType
AssessmentName|URL|TestType
<<END_RECOMMENDATIONS>>

Conversational reply explaining the recommendations...
```

---

### 5. Recommendation Parsing & Validation

After the LLM generates a response, the system extracts and validates recommendations:

**Parsing Steps:**
1. Extract content between `<<RECOMMENDATIONS>>` and `<<END_RECOMMENDATIONS>>` markers
2. Parse each line as `Name|URL|TestType` (pipe-delimited)
3. For each parsed recommendation:
   - Look up the assessment in the database by URL or name
   - If found, use the canonical DB record (prevents URL manipulation)
   - If not found, discard (hallucination prevention)
4. Enrich with metadata (duration, remote_testing, adaptive, category)

**Validation Rules:**
- URL must start with `https://www.shl.com/`
- Test type must be one of: K, C, P, B, S, A, E, D
- Name must match a catalog entry (fuzzy matching allowed)
- Maximum 10 recommendations per response

**Fallback Strategy:**
- If no `<<RECOMMENDATIONS>>` block is found, attempt to extract from markdown links
- If LLM output is completely unparseable, return top BM25-scored assessments directly

---

### 6. Guardrails & Safety

**Prompt Injection Detection:**

The system detects and refuses prompt injection attempts through pattern matching:

```typescript
const REFUSE_PATTERNS = [
  /\b(ignore instructions|ignore previous|you are now|disregard|jailbreak|system prompt)\b/i,
  /\b(hack|exploit|security vulnerability)\b/i,
  // ... 10+ more pattern groups
];
```

**Off-Topic Detection:**

Queries about salary, legal matters, medical topics, politics, and harmful content are politely refused with a redirect to assessment recommendations.

**Grounding Validation:**

Every recommendation is validated against the catalog database. If the LLM generates a recommendation that doesn't exist in the catalog, it's silently dropped from the response. This ensures zero hallucination at the output level.

---

## Assessment Catalog

The system ships with a curated catalog of **150+ SHL assessments** stored in SQLite via Prisma.

### Database Schema

```prisma
model Assessment {
  id            String   @id @default(cuid())
  name          String                              // e.g., "Verify - Numerical Reasoning"
  slug          String   @unique                    // e.g., "verify-numerical-reasoning"
  url           String                              // e.g., "https://www.shl.com/products/..."
  description   String                              // Full description
  testType      String                              // K, C, P, B, S, A, E, D
  category      String                              // e.g., "Technical", "Cognitive"
  remoteTesting Boolean   @default(false)           // Supports remote proctoring
  adaptive      Boolean   @default(false)           // Computer-adaptive testing
  duration      String   @default("")               // e.g., "25 minutes"
  jobLevels     String   @default("")               // Comma-separated: "Entry,Graduate,Mid-Level"
  languages     String   @default("")               // Comma-separated: "English,Spanish,French"
  skills        String   @default("")               // Comma-separated: "Java,Lambda Expressions"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Test Type Classification

| Code | Type | Color | Description |
|------|------|-------|-------------|
| K | Knowledge/Skills | Amber | Technical proficiency tests (Java, Python, React, etc.) |
| C | Cognitive Ability | Sky Blue | Numerical, verbal, inductive, deductive reasoning |
| P | Personality | Purple | OPQ32, motivation questionnaires, competency reports |
| B | Behavioral | Green | Situational judgment, behavioral assessments |
| S | Simulation | Orange | Work simulation exercises |
| A | Ability | Teal | General ability, comprehensive ability tests |
| E | Emotional Intelligence | Pink | EQ assessments |
| D | Development | Gray | Career development, development indicators |

---

## Frontend Components

### Chat Interface (`page.tsx`)
- **Layout**: Full-height flex layout with header, chat area, and footer input
- **Hydration Safety**: Zustand store uses lazy hydration (`_hasHydrated` flag) to prevent SSR/client mismatch
- **Conditional Rendering**: Shows WelcomeScreen when no messages exist, ChatMessages otherwise
- **Sidebar Toggle**: Context sidebar slides in from the right with spring animation

### Welcome Screen (`welcome-screen.tsx`)
- **Feature Cards**: 4 animated feature cards (Find, Compare, Personalize, Multiple Types)
- **Suggestion Chips**: Pre-built conversation starters with category labels (Technical, Cognitive, Leadership, Compare)
- **Animated Background**: Subtle pulsing gradient mesh
- **Staggered Animations**: Container/child variants with 80ms stagger

### Chat Messages (`chat-messages.tsx`)
- **Message Bubbles**: Different styles for user (emerald gradient) and assistant (muted with border)
- **Markdown Rendering**: Full ReactMarkdown support for assistant messages with custom prose styling
- **Auto-scroll**: Smooth scroll to bottom on new messages
- **Copy Button**: Copy message content to clipboard
- **Relative Timestamps**: "just now", "5m ago", "3h ago" with `suppressHydrationWarning` for SSR safety

### Recommendation Cards (`recommendation-card.tsx`)
- **Rich Metadata**: Test type badge, duration, remote/adaptive indicators, category tag
- **Ranked Display**: Numbered rank indicator with gradient background
- **External Link**: Direct link to SHL product page
- **Compare Toggle**: Checkbox for future comparison feature
- **Hover Effects**: Gradient border reveal, shadow elevation

### Context Sidebar (`context-sidebar.tsx`)
- **Live Context**: Displays extracted role, seniority, skills, behavioral requirements, preferences, and constraints
- **Tag Badges**: Skills and behavioral requirements shown as animated badges
- **Empty State**: Centered "Start a conversation" message with icon
- **Mobile Responsive**: Overlay with backdrop blur on mobile, relative positioning on desktop

### Chat Input (`chat-input.tsx`)
- **Auto-resize**: Textarea grows with content up to 160px
- **Character Limit**: 2,000 character limit with visual indicator
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for newline
- **Focus Ring**: Emerald-colored focus ring animation
- **Disabled State**: Input disabled during loading with visual feedback

---

## Design Decisions & Tradeoffs

### Why Deterministic Orchestration Over Autonomous Agents?

The system uses explicit, deterministic pipeline stages (extract → classify → retrieve → generate → validate) rather than autonomous agent loops. This was a deliberate choice:

| Consideration | Deterministic Pipeline | Autonomous Agent |
|--------------|----------------------|------------------|
| Predictability | High — same input always produces same flow | Low — agent may take unexpected paths |
| Debuggability | Easy — log each stage independently | Hard — agent decisions are opaque |
| Latency | Controlled — fixed number of stages | Variable — agent may loop multiple times |
| Hallucination risk | Lower — pipeline validates at each stage | Higher — agent may bypass validation |
| Cost | Bounded — one LLM call per request | Unbounded — agent may make many calls |

### Why BM25 Over Vector Embeddings?

| Consideration | BM25 + DB Search | Vector Embeddings (FAISS/ChromaDB) |
|--------------|------------------|-----------------------------------|
| Setup complexity | Low — no embedding model needed | High — need embedding pipeline |
| Cold start | Instant — works on raw text | Slow — must pre-compute embeddings |
| Exact match | Excellent — BM25 excels at keyword matching | Variable — may miss exact terms |
| Semantic match | Moderate — relies on fuzzy matching + aliases | Excellent — captures semantic similarity |
| Infrastructure | None — runs on SQLite | Additional — vector store needed |
| Maintenance | Low — update DB and done | Medium — must re-index on changes |

### Why SQLite Over PostgreSQL?

- **Simplicity**: Zero setup — database is a single file
- **Portability**: Easy to deploy, backup, and version
- **Performance**: Sufficient for 150-500 assessments with read-heavy workload
- **Cost**: Free — no database server needed
- **Tradeoff**: Not suitable for high-concurrency write scenarios (not a concern for this use case)

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# The z-ai-web-dev-sdk uses its own configuration
# No additional API keys are required when running in the sandbox environment
```

---

## Deployment

### Docker Deployment (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install -g bun && bun install --frozen-lockfile
COPY . .
RUN bun run db:generate
EXPOSE 3000
CMD ["bun", "run", "dev"]
```

### Render / Railway Deployment

1. Connect your GitHub repository
2. Set build command: `bun install && bun run db:generate && bun run db:push`
3. Set start command: `bun run dev`
4. Add environment variable: `DATABASE_URL=file:./db/custom.db`

### Cold Start Strategy

- The Prisma client is initialized as a singleton to avoid re-creation on each request
- The SQLite database is pre-seeded with assessment data
- No external vector store to warm up — BM25 scoring is computed on-the-fly

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `bun run dev` | Start Next.js dev server on port 3000 |
| Build | `bun run build` | Create production build (standalone output) |
| Lint | `bun run lint` | Run ESLint for code quality |
| DB Push | `bun run db:push` | Push schema changes to SQLite |
| DB Generate | `bun run db:generate` | Generate Prisma client |
| DB Migrate | `bun run db:migrate` | Run Prisma migrations |
| DB Reset | `bun run db:reset` | Reset database and re-seed |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Adding New Assessments

To add new assessments to the catalog, edit `prisma/seed.ts` and add entries to the `assessments` array:

```typescript
{
  name: "New Assessment Name",
  slug: "new-assessment-slug",
  url: "https://www.shl.com/products/product-catalog/view/new-assessment/",
  description: "Description of the assessment...",
  testType: "K",  // K, C, P, B, S, A, E, D
  category: "Technical",
  remoteTesting: true,
  adaptive: false,
  duration: "30 minutes",
  jobLevels: "Mid-Level,Senior",
  languages: "English",
  skills: "Skill1,Skill2,Skill3"
}
```

Then run:
```bash
bun run db:push
bunx prisma db seed
```

---

## License

This project is part of the SHL AI Intern Assignment. All rights reserved.

---

## Acknowledgments

- **SHL** for the comprehensive assessment catalog that powers the recommendations
- **Next.js** team for the excellent full-stack React framework
- **shadcn/ui** for the beautiful, accessible component library
- **Prisma** for the type-safe ORM that makes database access a pleasure
- **Framer Motion** for the smooth animations that bring the UI to life
