# Contributing to Zero Calendar

Thank you for your interest in contributing to Zero Calendar! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/zero-calendar.git
   cd zero-calendar
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Zero-Calendar/zero-calendar.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required environment variables as described in the README.md

6. **Start the development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Development Workflow

1. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. **Make your changes** and commit them following our [commit guidelines](#commit-guidelines)

3. **Keep your fork in sync** with the upstream repository:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

4. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** from your fork to the main repository

## Pull Request Process

1. Ensure your PR addresses a specific issue or feature
2. Update the README.md with details of changes if applicable
3. Include screenshots or animated GIFs in your PR if it includes UI changes
4. Make sure all tests pass and add new tests for new functionality
5. The PR should work in all modern browsers (Chrome, Firefox, Safari, Edge)
6. Your PR needs approval from at least one maintainer before merging

## Coding Standards

We follow these coding standards:

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: We use Prettier for code formatting
- **Linting**: ESLint is configured for the project
- **Component Structure**: Follow the existing component structure
- **CSS**: Use Tailwind CSS for styling
- **Naming**:
  - Use kebab-case for filenames
  - Use PascalCase for React components
  - Use camelCase for variables and functions
  - Use UPPER_CASE for constants

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(calendar): add recurring event support

- Added daily, weekly, monthly, yearly recurrence
- Added exception handling for recurring events
- Updated UI to support recurrence options

Closes #123
```

## Testing

- Write tests for all new features and bug fixes
- Run existing tests before submitting a PR:
  ```bash
  npm run test
  # or
  pnpm test
  ```
- Aim for good test coverage of your code

## Documentation

- Update documentation for any new features or changes
- Document all public APIs, components, and functions
- Include JSDoc comments for functions and components
- Update the README.md if necessary

## Issue Reporting

When reporting issues, please use one of our issue templates and include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: Browser, OS, screen size, etc.
6. **Screenshots**: If applicable
7. **Possible Solution**: If you have suggestions on how to fix the issue

## Feature Requests

For feature requests, please provide:

1. **Description**: Clear description of the feature
2. **Use Case**: Why this feature would be useful
3. **Proposed Implementation**: If you have ideas on how to implement it
4. **Alternatives**: Any alternative solutions you've considered

---

Thank you for contributing to Zero Calendar! Your efforts help make this project better for everyone.
