Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use `gh issue view <issue> --json` with the issue id and json parameters to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Create a plan if not already present in the issue
5. Checkout a branch from `main` 
6. Write and run tests (Red)
7. Implement the necessary changes to fix the issue and check new tests pass (Green)
8. Improve code by refactoring, while keeping new tests passing (Refactor)
9. Ensure code passes type checking
10. Create a descriptive commit message
11. Push and create a PR

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.