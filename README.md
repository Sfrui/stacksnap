<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=30&pause=1000&color=00E0FF&center=true&vCenter=true&multiline=true&repeat=true&width=600&height=80&lines=StackSnap+%F0%9F%92%BB;AI-Powered+Full-Stack+Code+Generator" alt="Typing SVG" />

<br/>

<p><strong>One command. Full-stack features. AI-generated and injected into your project.</strong></p>

<br/>

[![npm version](https://img.shields.io/npm/v/create-ai-stack?color=00E0FF&style=flat-square&logo=npm)](https://www.npmjs.com/package/create-ai-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-00E0FF?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## What is StackSnap?

StackSnap is an AI-powered CLI tool that reads predefined **scene definitions** (YAML files describing full-stack features like authentication or user profiles), uses an **OpenAI-compatible API** to generate backend models, services, API routes, frontend pages, components, hooks, and TypeScript types, then **safely injects** the generated code into your existing project with automatic Git branching and rollback on failure.

```
$ stacksnap add email-auth

Using scene: email-auth
Created branch: stacksnap/email-auth
- Generating code with AI... (9 batches)
- Generated 12 file(s)
- Injecting files...
  Created: src/models/User.js, src/models/VerificationToken.js, ...
  Modified: src/routes/index.js, prisma/schema.prisma, ...
- Installing dependencies...
  bcryptjs, jsonwebtoken, nodemailer, zod
- Changes committed.

Scene "email-auth" added successfully!
```

---

## Quick Start

### Install

```bash
npm install -g create-ai-stack
```

Or use directly:

```bash
npx create-ai-stack init
```

### Configure AI Provider

StackSnap supports any OpenAI-compatible API:

```bash
# OpenAI
export OPENAI_API_KEY="sk-your-key"

# Custom provider (e.g. DeepSeek, SiliconFlow, etc.)
export OPENAI_API_KEY="your-key"
export OPENAI_BASE_URL="https://your-api-endpoint/v1"
export OPENAI_MODEL="your-model-name"
```

> On Windows PowerShell: `$env:OPENAI_API_KEY="your-key"`

### Initialize & Add

```bash
# Detect project config (framework, ORM, package manager)
stacksnap init

# Add a full-stack scene (interactive selection)
stacksnap add

# Add a specific scene directly
stacksnap add email-auth
```

---

## How It Works

```
stacksnap init                stacksnap add email-auth
     |                              |
     v                              v
 Detect project                Load scene YAML
 framework, ORM,                    |
 package manager                    v
     |                        Create Git branch
     v                        stacksnap/email-auth
 .stacksnap.json                    |
                                    v
                              AI generates code in 9 batches
                              (models, index, services, routes,
                               API modules, pages, hooks,
                               components, router registration)
                                    |
                                    v
                              User confirms file list
                                    |
                                    v
                              Smart file injection
                              (new files, deduplication, merge)
                                    |
                                    v
                              Install dependencies
                              Git commit
                                    |
                              (auto-rollback on failure)
```

---

## AI Code Generation Pipeline

When you run `stacksnap add`, StackSnap executes a **9-batch sequential generation pipeline**:

| Batch | Output | Description |
|-------|--------|-------------|
| 1 | Backend Models | Prisma schema models or Sequelize model files |
| 2 | Model Index | Sequelize model index registration (skipped for Prisma) |
| 3 | Backend Services | Service layer with business logic functions |
| 4 | Backend Routes | API route handlers + route registration |
| 5 | Frontend API | Frontend API request modules |
| 6 | Frontend Pages | Vue 3 SFCs / React components |
| 7 | Frontend Hooks | Composables / custom hooks |
| 8 | Frontend Components | UI components |
| 9 | Router Registration | Frontend route configuration |

Each batch uses AI prompts that include:
- Role-specific instructions (e.g. "You are a Prisma schema expert")
- Reference files from your project (for code style matching)
- Previously generated code from earlier batches (for consistency)
- Existing StackSnap code (to avoid duplicates across multiple scene additions)

---

## Available Scenes

<table>
<tr>
<td width="50%">

### email-auth

Full email-based authentication system:

- **Dependencies:** bcryptjs, jsonwebtoken, nodemailer, zod
- **Models:** User (email, password, name, emailVerified), VerificationToken
- **API:** register, login, logout, forgot-password, reset-password, verify-email, me
- **Pages:** login, register, forgot-password, reset-password, verify-email
- **Components:** LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, AuthGuard
- **Hooks:** useAuth, useRequireAuth
- **Types:** auth (User, LoginInput, RegisterInput, AuthResponse, ResetPasswordInput)

</td>
<td width="50%">

### user-profile

User profile management:

- **Dependencies:** zod
- **Models:** reuses existing User
- **API:** GET/PUT /api/user/profile
- **Pages:** profile view & edit
- **Components:** ProfileForm
- **Hooks:** useProfile
- **Types:** user-profile (UserProfile, UpdateProfileInput)

</td>
</tr>
</table>

---

## Supported Stacks

| Framework | ORM | Package Manager |
|-----------|-----|-----------------|
| Next.js | Prisma | npm |
| Express + React | Drizzle | yarn |
| Express + Vue | Sequelize | pnpm |

---

## Smart Injection

StackSnap doesn't just create files — it intelligently merges into your existing codebase:

- **New files**: Created with proper directory structure
- **Prisma schemas**: Model blocks injected at the correct position
- **Index files**: Smart insertion after last require, before module.exports
- **Service files**: Deduplication by function name, only appends unique functions
- **Route files**: Deduplication by HTTP method + path
- **Marker-based**: All modifications use `@stacksnap added` / `@stacksnap end` markers for traceability

---

## Project Structure

```
stacksnap/
├── bin/
│   └── cli.ts                    # CLI entry point (commander)
├── src/
│   ├── commands/
│   │   ├── init.ts               # Project detection & config generation
│   │   └── add.ts                # Main scene injection workflow
│   ├── core/
│   │   ├── detector.ts           # Framework/ORM/package-manager detection
│   │   ├── scene-loader.ts       # YAML scene file loading & caching
│   │   ├── prompt-factory.ts     # AI prompt construction per batch
│   │   ├── code-generator.ts     # AI API calls & multi-file output parsing
│   │   └── injector/
│   │       ├── file-injector.ts  # Smart file create/modify with deduplication
│   │       ├── schema-injector.ts # Prisma schema model injection
│   │       └── dependency-installer.ts # npm/yarn/pnpm dependency installation
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces for all core types
│   └── utils/
│       └── git.ts                # Git branch/commit/rollback operations
├── scenes/
│   ├── email-auth.yml            # Email authentication scene definition
│   └── user-profile.yml          # User profile scene definition
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## Create Custom Scenes

Add a `.yml` file to `scenes/`:

```yaml
name: my-feature
description: What this scene generates
version: 1.0.0
stackCompatibility:
  - nextjs
  - express-react
  - express-vue

dependencies:
  - package: some-package
    version: "^1.0.0"

entities:
  - name: MyModel
    fields:
      id: String @id @default(uuid())
      name: String
      createdAt: DateTime @default(now())

api:
  - method: GET
    path: /api/my-endpoint
    description: Returns my data

frontend:
  pages:
    - path: my-page
      description: My page
  components:
    - path: MyComponent
      description: My component
  hooks:
    - path: useMyHook
      description: My hook

types:
  - path: my-feature
    description: MyModel types (MyModel, CreateMyModelInput)
```

---

## CLI Reference

```bash
stacksnap init                    # Initialize project config (.stacksnap.json)
stacksnap add                     # Interactive scene selection
stacksnap add <scene-name>        # Add specific scene directly
stacksnap --version               # Show version
stacksnap --help                  # Show help
```

---

## Step-by-Step Usage Guide

### Step 1 — Install

```bash
npm install -g create-ai-stack
```

### Step 2 — Configure AI

StackSnap supports any OpenAI-compatible API. Set environment variables:

```bash
# OpenAI
export OPENAI_API_KEY="sk-your-key"

# Custom provider (e.g. DeepSeek, SiliconFlow)
export OPENAI_API_KEY="your-key"
export OPENAI_BASE_URL="https://your-api-endpoint/v1"
export OPENAI_MODEL="your-model-name"
```

> On Windows PowerShell: `$env:OPENAI_API_KEY="your-key"`

### Step 3 — Initialize in your project

```bash
cd your-project
stacksnap init
```

This detects your framework, ORM, TypeScript usage, directory structure, and package manager, then writes `.stacksnap.json`.

### Step 4 — Add a scene

```bash
# Interactive — choose from the list
stacksnap add

# Direct — specify the scene name
stacksnap add email-auth
```

What happens automatically:

| Step | Action |
|------|--------|
| 1 | Create Git branch `stacksnap/<scene>` |
| 2 | AI generates code in 9 batches (models, services, routes, pages, hooks, components, types) |
| 3 | Show generated file list for confirmation |
| 4 | Inject files with smart merging and deduplication |
| 5 | Install required npm dependencies |
| 6 | Commit changes to Git |
| - | Auto-rollback if anything fails (branch deleted, switch back) |

### Step 5 — Review & integrate

After injection, review the generated code and merge the branch:

```bash
git checkout master
git merge stacksnap/email-auth
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | API key for the AI provider |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Custom API endpoint |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | AI model to use |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.6 (strict mode, ES2020, CommonJS) |
| CLI Framework | commander 12.x |
| Interactive Prompts | inquirer 9.x |
| Terminal Styling | chalk 4.x, ora 5.x |
| AI Integration | openai 4.x SDK (OpenAI-compatible) |
| YAML Parsing | js-yaml 4.x |
| File Operations | fs-extra 11.x |
| Git Operations | simple-git 3.x |

---

## License

MIT

---

<div align="center">

**[Back to Top](#stacksnap)** &nbsp; | &nbsp; Built with AI, by [Sfrui](https://github.com/Sfrui)

</div>
