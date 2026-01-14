# Feature Specification: Skill Script Execution

## Spec ID: 012
## Status: Draft
## Priority: P1
## Created: 2025-01-14
## Dependencies: 001, 003, 004, 005

---

## Overview

Enable skills to include executable scripts in a `scripts/` directory that the AI can run on demand. Scripts can be written in any language installed on the user's machine (Python, Bash, Node.js, etc.). This spec leverages the existing terminal toolset (`mcp-desktopcommander`) for execution.

---

## User Stories

- As a skill author, I want to include scripts so that the AI can perform complex actions
- As an AI, I want to discover and run skill scripts so that I can complete tasks effectively
- As a user, I want control over script execution so that I maintain security

---

## Acceptance Criteria

- [ ] Skills can include a `scripts/` directory with executable files
- [ ] Script files are discovered and listed when skill loads
- [ ] AI can see available scripts for active skills
- [ ] AI can execute scripts via a dedicated tool
- [ ] Scripts run with the skill folder as working directory
- [ ] Script stdout/stderr returned to AI
- [ ] Interpreter auto-detected from file extension
- [ ] User can configure which interpreters are allowed
- [ ] Script execution respects tool permission settings

---

## Technical Requirements

### Functional Requirements

| ID   | Requirement                                              | Notes |
| ---- | -------------------------------------------------------- | ----- |
| FR-1 | Scan `scripts/` directory when skill loads               | |
| FR-2 | Track available scripts per skill in SkillManager        | |
| FR-3 | Create `skills_run_script` tool                          | |
| FR-4 | Auto-detect interpreter from extension                   | .py → python3, .sh → bash, .js → node |
| FR-5 | Execute via existing terminal toolset                    | Uses mcp-desktopcommander |
| FR-6 | Set working directory to skill folder                    | |
| FR-7 | Capture and return stdout/stderr                         | |
| FR-8 | Configurable allowed interpreters                        | Default: python3, bash, node |
| FR-9 | Inherit tool permissions from terminal toolset           | |

---

## Skill Structure with Scripts

```
.chorus/skills/deploy/
├── SKILL.md
├── scripts/
│   ├── deploy.sh           # Bash script
│   ├── validate.py         # Python script
│   ├── build.js            # Node script
│   └── helpers/
│       └── utils.py        # Nested scripts supported
└── references/
    └── deployment-guide.md
```

---

## Implementation Notes

### Script Discovery (extends SkillManager)

```typescript
interface ISkillScript {
    name: string;           // "deploy.sh"
    relativePath: string;   // "scripts/deploy.sh"
    absolutePath: string;   // "/path/to/skill/scripts/deploy.sh"
    interpreter: string;    // "bash"
    description?: string;   // From optional frontmatter or filename
}

// Add to ISkill interface
interface ISkill {
    // ... existing fields
    scripts: ISkillScript[];
}

// Interpreter mapping
const INTERPRETER_MAP: Record<string, string> = {
    '.py': 'python3',
    '.sh': 'bash',
    '.bash': 'bash',
    '.js': 'node',
    '.ts': 'npx ts-node',
    '.rb': 'ruby',
    '.pl': 'perl',
};

function detectInterpreter(filename: string): string | undefined {
    const ext = path.extname(filename).toLowerCase();
    return INTERPRETER_MAP[ext];
}
```

### Script Execution Tool

```typescript
// Tool definition exposed to AI
const runScriptTool: UserTool = {
    toolsetName: 'skills',
    displayNameSuffix: 'run_script',
    description: 'Execute a script from an active skill. Scripts run in the skill\'s directory.',
    inputSchema: {
        type: 'object',
        properties: {
            skill_name: {
                type: 'string',
                description: 'Name of the skill containing the script'
            },
            script: {
                type: 'string',
                description: 'Script filename (e.g., "deploy.sh", "validate.py")'
            },
            args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Arguments to pass to the script'
            }
        },
        required: ['skill_name', 'script']
    }
};

// Execution function
async function runSkillScript(
    skillName: string,
    scriptName: string,
    args: string[] = []
): Promise<string> {
    const manager = SkillManager.getInstance();
    const skill = manager.getSkill(skillName);

    if (!skill) {
        return `Error: Skill "${skillName}" not found`;
    }

    const script = skill.scripts.find(s =>
        s.name === scriptName || s.relativePath === scriptName
    );

    if (!script) {
        return `Error: Script "${scriptName}" not found in skill "${skillName}".\nAvailable scripts: ${skill.scripts.map(s => s.name).join(', ')}`;
    }

    if (!script.interpreter) {
        return `Error: Unknown script type. Supported: .py, .sh, .js`;
    }

    // Check if interpreter is allowed
    const settings = await SkillManager.getInstance().getSettings();
    if (!settings.allowedInterpreters.includes(script.interpreter)) {
        return `Error: Interpreter "${script.interpreter}" is not allowed. Allowed: ${settings.allowedInterpreters.join(', ')}`;
    }

    // Build command
    const command = `cd "${skill.folderPath}" && ${script.interpreter} "${script.relativePath}" ${args.map(a => `"${a}"`).join(' ')}`;

    // Execute via terminal toolset
    const terminal = ToolsetsManager.getInstance().getToolset('terminal');
    const result = await terminal.executeTool('execute_command', { command });

    return result;
}
```

### What AI Sees When Skill Loads

When a skill with scripts is invoked, the AI sees:

```
## Deploy Skill (Active)

### Instructions
[Content from SKILL.md]

### Available Scripts
Execute these with the `skills_run_script` tool:

| Script | Description |
|--------|-------------|
| deploy.sh | Main deployment script |
| validate.py | Validate configuration before deploy |
| build.js | Build the application |

Example: `skills_run_script(skill_name="deploy", script="deploy.sh", args=["--env", "staging"])`
```

### Settings for Script Execution

```typescript
interface ISkillSettings {
    // ... existing fields

    // Script execution settings
    allowedInterpreters: string[];  // Default: ['python3', 'bash', 'node']
    scriptTimeout: number;          // Default: 300000 (5 minutes)
    requireScriptApproval: boolean; // Default: true (first-time execution needs approval)
}
```

---

## Security Considerations

1. **Interpreter whitelist**: Only allowed interpreters can run
2. **Working directory isolation**: Scripts run in skill folder, not project root
3. **Permission inheritance**: Uses existing tool permission system
4. **First-run approval**: Can require user approval for new scripts
5. **Timeout**: Scripts have execution timeout
6. **No environment inheritance**: Scripts don't get all env vars (configurable)

---

## Files to Modify/Create

| File Path | Action | Description |
| --------- | ------ | ----------- |
| `src/core/chorus/skills/SkillTypes.ts` | Modify | Add ISkillScript interface |
| `src/core/chorus/skills/SkillDiscovery.ts` | Modify | Scan scripts/ directory |
| `src/core/chorus/skills/SkillManager.ts` | Modify | Track scripts per skill |
| `src/core/chorus/skills/SkillExecution.ts` | Modify | Add runSkillScript function |
| `src/core/chorus/toolsets/skills.ts` | Modify | Add run_script tool |

---

## Test Plan

### Unit Tests
- [ ] Script discovery finds all scripts in scripts/ directory
- [ ] Interpreter detection works for .py, .sh, .js
- [ ] Unknown extensions return undefined interpreter
- [ ] Script execution builds correct command

### Integration Tests
- [ ] Create skill with scripts/, verify scripts discovered
- [ ] Execute Python script, verify output returned
- [ ] Execute Bash script, verify output returned
- [ ] Non-allowed interpreter rejected
- [ ] Missing script returns helpful error

### Manual Verification
- [ ] AI can list available scripts for active skill
- [ ] AI can successfully run a skill script
- [ ] Script output appears in chat
- [ ] Permission prompt appears (if enabled)

---

## Example Skill with Scripts

```
.chorus/skills/code-quality/
├── SKILL.md
└── scripts/
    ├── lint.sh
    ├── test.py
    └── coverage.js
```

**SKILL.md:**
```markdown
---
name: code-quality
description: Code quality checks including linting, testing, and coverage. Invoke when reviewing code or before commits.
---

# Code Quality Skill

## Available Actions

1. **Lint**: Run `lint.sh` to check code style
2. **Test**: Run `test.py` to execute test suite
3. **Coverage**: Run `coverage.js` to generate coverage report

## Workflow

1. First run lint to catch style issues
2. Then run tests to verify functionality
3. Finally check coverage for gaps
```

**scripts/lint.sh:**
```bash
#!/bin/bash
cd "$(dirname "$0")/.." # Go to project root
pnpm lint
```

---

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Script discovery works
- [ ] Script execution works
- [ ] Permissions respected
- [ ] Unit tests pass
- [ ] Code committed and pushed

---

## Completion Signal

Upon successful validation of all requirements, output:

```
<promise>DONE</promise>
```
