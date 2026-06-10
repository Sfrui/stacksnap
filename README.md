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

StackSnap is a CLI tool that **reads predefined full-stack scenes** (authentication, user profiles, etc.) and uses **AI to generate** models, API routes, frontend pages, and hooks — then **safely injects** them into your existing project with automatic Git branching and rollback.

```
$ stacksnap add email-auth

Using scene: email-auth
Created branch: stacksnap/email-auth
- Generating code with AI...
- Generated 2 file(s)
- Injecting files...
  Created: src/models/VerificationToken.js
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

# Custom provider (e.g. mimo, DeepSeek, etc.)
export OPENAI_API_KEY="your-key"
export OPENAI_BASE_URL="https://your-api-endpoint/v1"
export OPENAI_MODEL="your-model-name"
```

### Initialize & Add

```bash
# Detect project config (framework, ORM, package manager)
stacksnap init

# Add a full-stack scene
stacksnap add <scene-name>
```

---

## How It Works

```
stacksnap init          stacksnap add email-auth
     |                        |
     v                        v
 Detect project          Load scene YAML
 framework, ORM,             |
 directories                  v
     |                  AI generates code
     v                  (models, routes, pages)
 .stacksnap.json              |
                              v
                        Git branch created
                        (stacksnap/email-auth)
                              |
                              v
                        Files injected
                        Dependencies installed
                        Changes committed
                              |
                        (auto-rollback on failure)
```

---

## Available Scenes

<table>
<tr>
<td width="50%">

### email-auth

Email-based authentication system with:

- **Models:** User, VerificationToken
- **API:** register, login, logout, forgot-password, reset-password, verify-email
- **Pages:** login, register, forgot-password, reset-password, verify-email
- **Hooks:** useAuth, useRequireAuth

</td>
<td width="50%">

### user-profile

User profile management with:

- **Models:** reuses existing User
- **API:** GET/PUT /api/user/profile
- **Pages:** profile view & edit
- **Hooks:** useProfile

</td>
</tr>
</table>

---

## Supported Stacks

| Framework | ORM | Package Manager |
|-----------|-----|-----------------|
| Next.js | Prisma | pnpm |
| Express + React | Drizzle | yarn |
| Express + Vue | Sequelize | npm |

---

## Project Structure

```
stacksnap/
├── bin/cli.ts                    # CLI entry (commander)
├── src/
│   ├── commands/
│   │   ├── init.ts               # Project detection & config
│   │   └── add.ts                # Scene injection flow
│   ├── core/
│   │   ├── detector.ts           # Framework/ORM detection
│   │   ├── scene-loader.ts       # YAML scene loading
│   │   ├── prompt-factory.ts     # AI prompt construction
│   │   ├── code-generator.ts     # OpenAI-compatible API calls
│   │   └── injector/
│   │       ├── file-injector.ts  # File create/modify
│   │       └── dependency-installer.ts
│   ├── types/index.ts
│   └── utils/git.ts              # Git branch/commit/rollback
└── scenes/
    ├── email-auth.yml
    └── user-profile.yml
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
```

---

## CLI Reference

```bash
stacksnap init                    # Initialize project config
stacksnap add                     # Interactive scene selection
stacksnap add email-auth          # Add specific scene directly
stacksnap --version               # Show version
stacksnap --help                  # Show help
```

---

## License

MIT

---

<div align="center">

**[Back to Top](#stacksnap)** &nbsp; | &nbsp; Built with AI, by [Sfrui](https://github.com/Sfrui)

</div>
