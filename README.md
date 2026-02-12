<div align="center">

# FitWeekly Blueprint

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/codekilid/fitness-bot)
[![Tests](https://github.com/codekilid/fitness-bot/actions/workflows/test.yml/badge.svg)](https://github.com/codekilid/fitness-bot/actions/workflows/test.yml)
[![Deploy](https://github.com/codekilid/fitness-bot/actions/workflows/deploy.yml/badge.svg)](https://github.com/codekilid/fitness-bot/actions/workflows/deploy.yml)

**AI-powered personalized weekly diet and exercise plans**

</div>

# ⚠️ DISCLAIMER — READ THIS FIRST ⚠️

> **THIS IS NOT MEDICAL OR PROFESSIONAL ADVICE.**
> 
> This project provides AI-generated fitness and nutrition suggestions for **healthy adults only**. AI can make mistakes. Results may be inaccurate, incomplete, or harmful. 
> 
> **Always consult a qualified healthcare professional, registered dietitian, or certified trainer before starting any diet or exercise program.**
> 
> **By using this project, you agree that:**
> - You are solely responsible for your health decisions
> - The creator is not liable for any harm, injury, or consequences
> - This software is provided "AS IS" without any warranty
> 
> **This project is for EDUCATIONAL and RESEARCH purposes only. Do not rely on it for real health decisions.**

---

<details>
<summary><h2>1. What Is It?</h2></summary>

**fitness-bot** is a Cloudflare Workers-based AI bot that generates personalized weekly diet and exercise plans.

### What It Does

Given your profile data (height, weight, age, sex, **fitness goal**, activity level), the bot:

1. **Analyzes** your profile and calculates nutritional needs
2. **Generates** critical nutrition and training guidance (constraints)
3. **Produces** a complete weekly plan with:
   - Daily meal recommendations (3 meals/day)
   - Exercise sessions (3-4 sessions/week)

### Supported Languages

The bot can generate plans in multiple languages:

| Code | Language |
|------|----------|
| `fa` | Persian (Farsi) — Default |
| `en` | English |
| `ar` | Arabic |
| `tr` | Turkish |
| `zh` | Chinese |
| `es` | Spanish |
| `fr` | French |
| `de` | German |

Specify the language in your request using the `language` field.

</details>

---

<details>
<summary><h2>2. How to Use It</h2></summary>

### Endpoint

```
POST https://<your-worker>.<your-subdomain>.workers.dev
```

### Input Schema

| Field | Type | Required | Range/Options | Description |
|-------|------|----------|---------------|-------------|
| `heightCm` | number | Yes | 120–230 | Height in centimeters |
| `weightKg` | number | Yes | 30–250 | Weight in kilograms |
| `age` | number | Yes | 12–80 | Age in years |
| `sex` | string | Yes | `"male"`, `"female"` | Biological sex |
| `goal` | string | Yes | `"build_muscle"`, `"lose_weight"`, `"get_fit"`, `"maintain_weight"` | Fitness objective |
| `activity` | string | Yes | `"low"`, `"medium"`, `"high"` | Daily activity level |
| `medicalCondition` | string | No | any | Medical conditions (rejects request) |
| `practicePlace` | string | No | `"home"`, `"gym"`, `"both"` | Preferred workout location |
| `language` | string | No | `fa`, `en`, `ar`, `tr`, `zh`, `es`, `fr`, `de` | Response language (default: `fa`) |

### Example Request

```json
{
  "heightCm": 175,
  "weightKg": 70,
  "age": 30,
  "sex": "male",
  "goal": "build_muscle",
  "activity": "medium",
  "practicePlace": "gym",
  "language": "en"
}
```

### Output Schema

#### Success Response

```json
{
  "status": "success",
  "guidance": {
    "diet_rules": ["Rule 1", "Rule 2", "Rule 3"],
    "exercise_rules": ["Rule 1", "Rule 2"]
  },
  "plans": {
    "diet": {
      "sat": [
        { "when": "breakfast", "what": "Food description", "why": "Reason" },
        { "when": "lunch", "what": "Food description", "why": "Reason" },
        { "when": "dinner", "what": "Food description", "why": "Reason" }
      ],
      "sun": [...],
      "mon": [...],
      "tue": [...],
      "wed": [...],
      "thu": [...],
      "fri": [...]
    },
    "exercise": [
      {
        "day": "sat",
        "when": "morning",
        "goal": "Session goal",
        "what": "Exercise description",
        "duration_minutes": 45,
        "intensity_or_rest": "moderate"
      }
    ]
  }
}
```

#### Rejected Response (Medical Condition)

```json
{
  "status": "rejected",
  "reason": "Please consult with a qualified healthcare professional."
}
```

#### Error Response

```json
{
  "status": "error",
  "reason": "Model request timed out. Please try again."
}
```

</details>

---

<details>
<summary><h2>3. How to Deploy</h2></summary>

### 🚀 Option 1: 1-Click Deploy to Cloudflare

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/codekilid/fitness-bot)

> **Note:** After deployment, you must enable Workers AI in your Cloudflare dashboard.

**Steps:**
1. Click the button above
2. Connect your Cloudflare account
3. Review and confirm the settings
4. Click **Deploy**

---

### ⚡ Option 2: Deploy via GitHub Actions

[![Deploy to Cloudflare](https://github.com/codekilid/fitness-bot/actions/workflows/deploy.yml/badge.svg)](https://github.com/codekilid/fitness-bot/actions/workflows/deploy.yml)

**Setup:**
1. Go to **GitHub Settings → Secrets and variables → Actions**
2. Add `CLOUDFLARE_API_TOKEN` secret
3. Go to **Actions → Deploy to Cloudflare → Run workflow**

---

### 💻 Option 3: Manual Deploy

```bash
# Clone the repository
git clone https://github.com/codekilid/fitness-bot.git
cd fitness-bot

# Install dependencies
pnpm install

# Login to Cloudflare
npx wrangler login

# Deploy
pnpm deploy
```

### Required Cloudflare Setup

#### Workers AI Access
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **AI**
3. Enable Workers AI

#### API Token for GitHub Actions
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Select **Edit Cloudflare Workers** template
4. Copy the token

#### Get Your Account ID
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. You'll see your **Account ID** in the right sidebar (example: `1234567890abcdef...`)
3. Or go to **Workers & Pages** → **Overview** → Account ID is shown at the top

#### Add Secrets to GitHub
1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. Add `CLOUDFLARE_API_TOKEN` - paste your API token
3. Add `CLOUDFLARE_ACCOUNT_ID` - paste your account ID

#### AI Model
The bot uses `@cf/qwen/qwen3-30b-a3b-fp8` (enabled by default with Workers AI)

</details>

---

<details>
<summary><h2>4. How to Contribute</h2></summary>

### 4.1 Current Status & Potential Advances

#### Current Capabilities
- Generates personalized weekly diet and exercise plans
- Supports 8 languages
- Runs on serverless Cloudflare Workers
- Uses Cloudflare Workers AI (Qwen 30B model)

#### Potential Advances

| Area | Description |
|------|-------------|
| **More Languages** | Add support for Japanese, Korean, Portuguese, Russian, Hindi, etc. |
| **Dietary Restrictions** | Vegetarian, vegan, halal, kosher, allergy support |
| **Meal Macros** | Include calorie/macro details in output |
| **Exercise Variations** | Yoga, swimming, cycling, sports-specific plans |
| **Multi-turn Chat** | Conversational interface for follow-up questions |
| **Progress Tracking** | Store and analyze user progress over time |
| **Web Interface** | Add a web UI for easier access |
| **Mobile App** | React Native or Flutter companion app |

#### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 4.2 Architecture & How It Works

```
┌─────────────┐     POST      ┌─────────────────────┐
│   Client    │ ───────────► │   Cloudflare Worker │
└─────────────┘              └─────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
            │ Input Valid.│    │   Guidance  │    │ Plan Gen    │
            │  Schema     │    │   AI Call   │    │   AI Call   │
            └─────────────┘    └─────────────┘    └─────────────┘
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
            │  Reject if  │    │  Extract    │    │  Extract    │
            │ Medical Cond│    │ Constraints │    │ Weekly Plan │
            └─────────────┘    └─────────────┘    └─────────────┘
                                       │                  │
                                       └────────┬─────────┘
                                                ▼
                                       ┌─────────────────────┐
                                       │   Normalize &       │
                                       │   Validate Output   │
                                       └─────────────────────┘
                                                │
                                                ▼
                                       ┌─────────────────────┐
                                       │   Return JSON       │
                                       │   Response          │
                                       └─────────────────────┘
```

#### Key Components

| File | Purpose |
|------|---------|
| `src/index.ts` | Main worker entry point, request handling |
| `src/schemas/input.ts` | Input validation with Zod |
| `src/schemas/output.ts` | Output schema definitions |
| `src/prompt.ts` | Language-aware prompt templates |
| `src/utils/guidance.ts` | Guidance generation with retry logic |
| `src/utils/normalization.ts` | Normalize AI output to schema |

#### Data Flow

1. **Request** arrives with user profile
2. **Validate** input schema (reject medical conditions)
3. **Calculate** BMR, TDEE, daily calories
4. **Generate Guidance** (constraints) via AI
5. **Generate Plan** (weekly diet + exercise) via AI
6. **Normalize & Validate** AI output
7. **Return** structured JSON response

</details>

---

<details>
<summary><h2>5. License & Credits</h2></summary>

### License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Open Source & Free

This project is **free and open source**. You can use, modify, and distribute it freely under the MIT license.

### Credits

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Qwen 3 30B](https://huggingface.co/Qwen/Qwen3-30B-A3B)
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/)

### Acknowledgments

Thanks to all contributors and users who make this project better!

</details>
