## ADDED Requirements

### Requirement: User data files are excluded from git
The repository `.gitignore` SHALL include patterns that prevent user-generated data files (JSON exports, CSV exports, and a `/data/` directory) from being committed to git.

#### Scenario: Data export file is not staged by git
- **WHEN** a file matching `*.export.json`, `*.export.csv`, or any file inside `/data/` exists in the project root
- **THEN** `git status` SHALL NOT list that file as untracked or staged

#### Scenario: Existing tracked data files are documented for removal
- **WHEN** the `.gitignore` update is applied
- **THEN** any previously tracked data files SHALL be noted in the change instructions for manual `git rm --cached` removal

### Requirement: No user data is present in the repository by default
The repository SHALL NOT contain any pre-existing task, project, or team member data files committed to source control.

#### Scenario: Fresh clone contains no user data
- **WHEN** a developer clones the repository
- **THEN** the `data/` directory SHALL NOT exist and no `*.export.json` or `*.export.csv` files SHALL be present
