---
name: documentation
description: Best practices for writing technical documentation. Use when creating READMEs, API docs, or guides.
---

# Documentation Writing Skill

Use this skill when creating or improving technical documentation, including READMEs, API documentation, guides, and tutorials.

## Document Structure

Follow this structure for comprehensive documentation:

1. **Title**: Clear and descriptive, indicating what the doc covers
2. **Overview**: What it is and why it exists (1-2 paragraphs)
3. **Quick Start**: Get running in under 5 minutes
4. **Installation**: Prerequisites and setup steps
5. **Detailed Usage**: Comprehensive feature guide
6. **API Reference**: If applicable, full API documentation
7. **Examples**: Real-world use cases with code
8. **Configuration**: All configurable options
9. **Troubleshooting**: Common issues and solutions
10. **Contributing**: How to contribute (for open source)

## Writing Style

### Clarity
- Use active voice ("Run the command" not "The command should be run")
- Keep sentences short - aim for under 25 words
- One idea per paragraph
- Use simple words over jargon when possible

### Audience
- Define your audience at the start
- Don't assume prior knowledge without stating it
- Provide context for domain-specific terms
- Link to prerequisites and related docs

### Examples
- Include runnable code examples
- Show both input and expected output
- Cover common use cases first
- Add edge cases for completeness

## Formatting Guidelines

### Structure
- Use headings (H1-H4) for clear navigation
- Keep heading hierarchy logical
- Use bullet points for lists of items
- Use numbered lists for sequential steps

### Code
- Use code blocks with language syntax highlighting
- Keep code examples focused and minimal
- Include comments explaining non-obvious parts
- Ensure all code examples are tested and work

### Visual Elements
- Use tables for structured data comparisons
- Add diagrams for architecture/flow concepts
- Use admonitions for tips, warnings, and notes
- Include screenshots for UI-related docs

## Templates

### README Template
```markdown
# Project Name

Brief description of what the project does.

## Features
- Feature 1
- Feature 2

## Quick Start
\`\`\`bash
npm install project-name
\`\`\`

## Documentation
Link to full docs.

## License
MIT
```

### API Endpoint Template
```markdown
## Endpoint Name

Brief description.

**URL**: `/api/endpoint`
**Method**: `GET`
**Auth**: Required

### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id   | string | Yes    | Resource ID |

### Response
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`
```
