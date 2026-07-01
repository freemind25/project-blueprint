---
Task ID: 1
Agent: main
Task: Investigate and fix problematic commit 7a7450b

Work Log:
- Analyzed commit 7a7450b diff on GitHub vs local HEAD
- Found typo bug: line 60 had `const ybrid, setHybrid]` (missing `[h`)
- Found additional local-only bugs: `setHhybrid` (double H), prop `hhybrid={hhybrid}`
- Found `skills/` directory tracked in git (internal tooling files)
- Found all files with 100755 executable permissions
- Fixed all 4 hybrid typos in TextCleaner/index.tsx
- Added skills/, tool-results/, scripts/gen-icons.py to .gitignore
- Removed skills/ from git tracking (git rm -r --cached)
- Set core.fileMode false to prevent future permission noise
- Fixed file permissions (chmod 644 on all non-script files)

Stage Summary:
- All 26/26 tests passing
- TypeScript compiles with no errors
- Build successful (529KB main + 107KB ONNX chunk)
- Committed and pushed fix to GitHub
