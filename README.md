# StackSnap

AI-powered CLI tool that reads predefined full-stack scenes and generates frontend, backend, database schema, and type code — then safely injects them into your existing project.

## Installation

```bash
npm install -g create-ai-stack
```

Or use directly with npx:

```bash
npx create-ai-stack <command>
```

## Setup

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

## Usage

### Initialize a project

Detects your project's framework, ORM, TypeScript setup, and package manager, then writes `.stacksnap.json`:

```bash
stacksnap init
```

### Add a scene

Lists available scenes, generates code with AI, and injects it into your project:

```bash
stacksnap add
```

The tool will:

1. Detect your project configuration (or load existing `.stacksnap.json`)
2. Let you select a scene from the list
3. Create a Git branch (`stacksnap/<scene-name>`)
4. Generate Prisma schema models via AI
5. Show you the files that will be affected and ask for confirmation
6. Inject the generated code into your project
7. Install any required dependencies
8. Commit the changes to Git

If anything fails, it automatically rolls back the Git branch.

## Available Scenes

### email-auth

Email-based authentication with login, registration, password reset, and session management.

- Entities: User, VerificationToken
- API routes: register, login, logout, forgot-password, reset-password, verify-email, me
- Frontend: login/register/forgot-password/reset-password/verify-email pages, form components, auth hooks

### user-profile

User profile page with view and edit functionality.

- Entities: none (reuses existing User model)
- API routes: GET/PUT /api/user/profile
- Frontend: profile page, ProfileForm component, useProfile hook

## Project Structure

```
stacksnap/
├── bin/cli.ts              # CLI entry point (commander)
├── src/
│   ├── commands/
│   │   ├── init.ts         # Project detection and config generation
│   │   └── add.ts          # Full scene injection flow
│   ├── core/
│   │   ├── detector.ts     # Project framework/ORM/directory detection
│   │   ├── scene-loader.ts # YAML scene file loading
│   │   ├── prompt-factory.ts # AI prompt construction with entity dedup
│   │   ├── code-generator.ts # OpenAI API integration
│   │   └── injector/
│   │       ├── schema-injector.ts  # Prisma schema merge logic
│   │       ├── file-injector.ts    # File create/modify dispatcher
│   │       └── dependency-installer.ts # Package manager abstraction
│   ├── types/index.ts      # TypeScript interfaces
│   └── utils/git.ts        # Git branch/commit/rollback
├── scenes/
│   ├── email-auth.yml
│   └── user-profile.yml
├── package.json
└── tsconfig.json
```

## Supported Stacks

| Framework       | Detection                      |
| --------------- | ------------------------------ |
| Next.js         | `next` in dependencies         |
| Express + React | `express` + `react` in deps    |

| ORM      | Detection                         |
| -------- | --------------------------------- |
| Prisma   | `@prisma/client` in dependencies  |
| Drizzle  | `drizzle-orm` in dependencies     |

| Package Manager | Detection         |
| --------------- | ----------------- |
| pnpm            | `pnpm-lock.yaml`  |
| yarn            | `yarn.lock`       |
| npm             | default fallback  |

## Creating Custom Scenes

Add a `.yml` file to the `scenes/` directory:

```yaml
name: my-scene
description: A short description of what this scene does
version: 1.0.0
stackCompatibility:
  - nextjs
  - express-react

dependencies:
  - package: some-package
    version: "^1.0.0"

entities:
  - name: MyModel
    fields:
      id: String @id @default(uuid())
      name: String

api:
  - method: GET
    path: /api/my-endpoint
    description: Returns my data

frontend:
  pages:
    - path: my-page
      description: My page description
  components:
    - path: my-component
      description: My component description
  hooks:
    - path: useMyHook
      description: My hook description

types:
  - path: my-types
    description: My type definitions
```

## License

MIT
