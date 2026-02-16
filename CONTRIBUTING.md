# Contributing to Billarr

First off, thanks for taking the time to contribute! ⚓🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** - Descriptive summary of the issue
- **Steps to reproduce** - Exact steps to reproduce the problem
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Screenshots** - If applicable
- **Environment** - OS, Docker version, browser
- **Logs** - Relevant logs from `docker compose logs`

### Suggesting Features

Feature requests are welcome! Please:

- **Check existing issues** - Someone might have already suggested it
- **Describe the feature** - Clear description of what you want
- **Explain the use case** - Why would this be useful?
- **Consider alternatives** - Any alternative solutions you've considered?

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** - Follow the coding standards below
3. **Test thoroughly** - Ensure everything works
4. **Update documentation** - If you changed functionality
5. **Commit with clear messages** - Describe what and why
6. **Open a Pull Request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/billarr.git
cd billarr

# Run locally (without Docker)
cd backend && npm install && npm start
cd ../frontend && npm install && npm start
```

## Coding Standards

### JavaScript/React
- Use modern ES6+ syntax
- Functional components with hooks (no class components)
- Meaningful variable and function names
- Comments for complex logic
- Keep components focused and small

### CSS
- Use CSS variables for theming
- Mobile-first responsive design
- Consistent naming conventions
- Avoid inline styles (use CSS files)

### Backend
- RESTful API conventions
- Proper error handling
- Input validation
- Clear endpoint naming

### Git Commits
- Use present tense ("Add feature" not "Added feature")
- Keep commits focused and atomic
- Reference issues in commit messages (#123)

## Project Structure

```
billarr/
├── backend/          # Express API
├── frontend/         # React app
├── docs/            # Documentation
└── docker/          # Docker configs
```

## Testing

Before submitting:

1. **Test the UI** - Try all features manually
2. **Test notifications** - Verify Telegram and Calendar
3. **Check mobile** - Test responsive design
4. **Check logs** - Ensure no errors in console
5. **Test deployment** - `docker compose up -d --build`

## Documentation

If you add features:

- Update README.md with new features
- Add setup instructions if needed
- Update relevant guides (TELEGRAM_SETUP.md, etc.)
- Include inline code comments

## Questions?

Feel free to:
- Open an issue for discussion
- Ask in GitHub Discussions
- Mention @sovereignalmida in issues

## Code of Conduct

Be kind, respectful, and constructive. We're all here to make Billarr better!

---

Thank you for contributing to Billarr! ⚓💰
