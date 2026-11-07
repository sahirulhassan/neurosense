## Summary of Changes
Provide a clear, clinical, and architectural summary of the modifications made.

## Type of Change
- [ ] Bug fix (non-breaking change fixing clinical rule or DSP issue)
- [ ] New feature (non-breaking addition to montages, spectral filters, or reporting)
- [ ] UI / Design refinement adhering to `antislop-ui` standards
- [ ] Documentation / Citation update

## Quality & Verification Checklist
- [ ] **Strict 1-Page PDF Constraint**: Verified ReportLab output generates exactly 1 page (`len(reader.pages) == 1`).
- [ ] **Offline Operation**: Core processing remains 100% offline without mandatory network access.
- [ ] **Accessibility**: Motion changes respect `@media (prefers-reduced-motion: reduce)`.
- [ ] **Antislop Compliance**: Zero unnecessary icons, emojis, or neon gradient tropes.
- [ ] **Automated Tests**: Ran `uv run python eeg_cli.py analyze src.jpg` with 0 errors.
