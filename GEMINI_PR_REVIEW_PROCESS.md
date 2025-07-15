# Gemini PR Review Process

This document outlines the process I will follow when asked to review a Pull Request.

### My Process for Reviewing Pull Requests

1.  **Gather Context:** To understand the *purpose* of the PR, I will first ask you for the GitHub Pull Request URL or the link to the corresponding issue. This context is crucial for a meaningful review.

2.  **Identify Branches:** I will determine the source and target branches from the PR information or from your instructions.

3.  **Analyze Code Changes:** I will run the command `git diff origin/target...origin/source` to isolate the specific changes introduced in the PR. My analysis will include:
    *   A high-level summary of the changes.
    *   A detailed review of the modified files, paying special attention to how the application code and test cases have been updated. I will use the tests to understand the intended behavior.

4.  **Synthesize and Verify:** I will connect the code changes back to the stated goal from the GitHub issue to confirm that the implementation correctly solves the problem.

5.  **Score the PR:** Using the project's scoring rubric, I will provide a score and a brief justification for it.

---

### What I Need From You

To start a review, please provide me with:

**Ideally:**
*   The Pull Request URL or ID.

**If a URL isn't available:**
*   The source branch name (the one to be merged).
*   The target branch name (e.g., `staging`, `main`).

---

### PR Scoring Rubric

| Score | Description                                                     |
|-------|-----------------------------------------------------------------|
| 0     | Exclude - Comma fix, trivial with no added value                |
| 1     | Small non-priority feature                                      |
| 2     | Medium non-priority feature, small bug-fix                      |
| 3     | Small prioritized feature, bug-fix, major improvement           |
| 5     | Medium prioritized feature, small security vulnerability fix, a time-consuming trivial task |
| 8     | Critical feature, medium vulnerability fix                    |
| 13    | Significant vulnerability fix, game-changer contribution        |
