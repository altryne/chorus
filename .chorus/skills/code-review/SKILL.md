---
name: code-review
description: Systematic code review guidelines. Invoke when reviewing pull requests or code changes.
---

# Code Review Skill

Use this skill when reviewing code changes, pull requests, or helping users improve their code quality.

## Review Checklist

### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled appropriately
- [ ] Error handling is present and meaningful
- [ ] Happy path and error paths are both tested

### Code Quality
- [ ] Clear and descriptive naming conventions
- [ ] No unnecessary complexity - simple solutions preferred
- [ ] DRY principle followed - no excessive duplication
- [ ] Single responsibility - functions/classes do one thing well
- [ ] Appropriate abstraction level

### Security
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Input validation on user-provided data
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Authentication/authorization checks where needed

### Performance
- [ ] No obvious N+1 query problems
- [ ] Appropriate caching strategies
- [ ] Memory leaks avoided (cleanup handlers, etc.)
- [ ] No blocking operations in critical paths
- [ ] Reasonable algorithmic complexity

### Maintainability
- [ ] Code is self-documenting where possible
- [ ] Comments explain "why" not "what"
- [ ] Consistent code style with the codebase
- [ ] Tests are included for new functionality
- [ ] No commented-out dead code

## Review Feedback Format

Structure your review feedback as follows:

1. **Summary**: One sentence overview of the changes
2. **Strengths**: What's done well (always find something positive)
3. **Required Changes**: Issues that must be addressed before merge
4. **Suggestions**: Optional improvements for consideration
5. **Questions**: Clarifications needed to complete the review

## Tone Guidelines

- Be specific about issues and include code examples
- Explain the "why" behind suggestions
- Offer alternatives, not just criticisms
- Acknowledge good decisions and patterns
- Use "we" language to indicate collaborative improvement
