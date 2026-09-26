# statement-filing Specification (Delta)

## ADDED Requirements

### Requirement: Statement filing is a fixed, allow-listed job with no client-supplied input
The statement-filing job SHALL be fixed server-side code reachable only through `GET /api/statement-filing/preview` and `POST /api/statement-filing/run`, both of which SHALL accept no input from the client: a run body carrying any key SHALL be rejected with HTTP 400, a preview carrying any query parameter SHALL be rejected with HTTP 400, and the Box root and the two destination roots SHALL come from server-side configuration, never from request data. No client value SHALL ever reach a subprocess argument or a filesystem path.

#### Scenario: A run request carrying a field is rejected
- **WHEN** the client sends `POST /api/statement-filing/run` with a body containing any key (for example `{"cmd":"rm -rf"}`)
- **THEN** the server SHALL respond with HTTP 400 and SHALL NOT touch any file

#### Scenario: A preview carrying parameters is rejected
- **WHEN** the client sends `GET /api/statement-filing/preview?box=C:\`
- **THEN** the server SHALL respond with HTTP 400 and SHALL NOT read the path it was given

#### Scenario: The job's folders are server-side configuration
- **WHEN** the job resolves the Box and the two destination roots
- **THEN** they SHALL come from server constants (optionally overridden by process environment variables set by the operator), and no request value SHALL influence them

#### Scenario: External tools are invoked without a shell
- **WHEN** the job runs the PDF text extractor
- **THEN** it SHALL call an absolute binary path with an argument array and SHALL NOT build a shell command string

### Requirement: The filing plan is previewable without modifying anything
The system SHALL provide a preview that reports what a filing run would do, and producing that preview SHALL NOT create, move, rename or delete any file, nor create a directory.

#### Scenario: Preview leaves the filesystem untouched
- **WHEN** the client requests the preview twice over an unchanged Box
- **THEN** both responses SHALL describe the same actions and the filesystem SHALL be byte-identical after both calls

#### Scenario: Preview reports every candidate
- **WHEN** the Box contains files that will be filed and files that will not
- **THEN** the preview SHALL list each action with its source name, target name and destination folder, and SHALL list each excluded file with the reason it was excluded

### Requirement: Only PDF files are filed
The job SHALL act only on files whose name ends `.pdf` (case-insensitive) and whose first 1024 bytes contain the `%PDF-` signature; every other file in the Box SHALL be left untouched and reported with a reason.

#### Scenario: A non-PDF file is never moved
- **WHEN** the Box contains an installer such as `UpNote Setup.exe`, a `*.gp` file or an `.html` file
- **THEN** the run SHALL leave each of them in the Box and report it with reason `not_pdf`

#### Scenario: A mislabelled file is never moved
- **WHEN** a file whose name ends `.pdf` does not carry the `%PDF-` signature
- **THEN** the run SHALL leave it in the Box and report it with reason `unreadable_pdf`

### Requirement: The routing rule sends only CLP, Towngas and MM Power statements to the A&E Family folder
A filed statement SHALL go to `A-A & E Family\Statement\<YEAR>\` if and only if its series is CLP, Towngas or MM Power (Hang Seng M Power); every other statement SHALL go to `A-Finance\statement\<YEAR>\`. The `<YEAR>` directory SHALL be the year of the statement's own month, not the year the run happens, and SHALL be created if it does not exist.

#### Scenario: A utility statement goes to A&E
- **WHEN** a CLP, Towngas or MM Power statement is filed
- **THEN** it SHALL be written into `A-A & E Family\Statement\<YEAR>\`

#### Scenario: Every other statement goes to A-Finance
- **WHEN** a bank, credit-card, payslip, tithe or demand-note statement is filed
- **THEN** it SHALL be written into `A-Finance\statement\<YEAR>\`

#### Scenario: The year folder follows the statement month
- **WHEN** a statement whose month falls in a previous year is filed
- **THEN** it SHALL be written into that previous year's folder, and the folder SHALL be created when missing

### Requirement: A filing run never overwrites an existing destination file
Before writing, the job SHALL compare the intended destination with the source. If the destination exists with identical bytes the job SHALL leave the destination untouched and remove the Box copy; if the destination exists with different bytes the job SHALL write nothing and delete nothing, and SHALL report a name conflict.

#### Scenario: Identical destination is left alone
- **WHEN** the intended destination already holds a byte-identical copy of the Box file
- **THEN** the destination SHALL NOT be written, the Box copy SHALL be removed, and the entry SHALL be reported as an already-filed cleanup

#### Scenario: Different destination is a conflict, not an overwrite
- **WHEN** the intended destination exists but its bytes differ from the Box file
- **THEN** both files SHALL remain in place and the file SHALL be reported with reason `name_conflict`

### Requirement: A Box source is removed only after a byte-identical copy exists in the destination
The job SHALL compute the source hash before acting and the destination hash after writing, and SHALL remove the Box source only when the two hashes are equal. When the hashes differ, the copy it wrote SHALL be removed and the Box source SHALL be kept.

#### Scenario: Verified copy is removed from the Box
- **WHEN** a file is copied and the destination hash equals the source hash
- **THEN** the Box source SHALL be deleted

#### Scenario: A copy that does not verify keeps both sides honest
- **WHEN** the destination hash differs from the source hash after copying
- **THEN** the copied destination file SHALL be removed, the Box source SHALL be kept, and the file SHALL be reported with reason `copy_mismatch`

### Requirement: A OneDrive lock is rescheduled, never reported as a failure
When the source cannot be removed because the file is held by OneDrive or the operating system, the job SHALL retry a bounded number of times and then report the entry as pending removal with the lock as the reason, SHALL keep the verified destination copy, and SHALL NOT describe the copy as failed. The summary SHALL state that the scheduled cleaner finishes the removal.

#### Scenario: Locked Box copy is reported as pending, not failed
- **WHEN** a copied file cannot be removed from the Box because it is locked
- **THEN** the run SHALL report it under pending removals with reason `onedrive_locked` and the summary SHALL NOT contain the word failed for that entry

#### Scenario: A read lock on the source is a skip, not a destructive retry
- **WHEN** the Box source cannot be read at all
- **THEN** nothing SHALL be written or deleted for that file and it SHALL be reported with reason `read_error`

### Requirement: A PDF that is not identified as a statement stays in the Box and is reported
The job SHALL identify a statement by its series — from the file name when the name matches a known series, otherwise from the document's own text — and SHALL file nothing it cannot identify. An unrecognised PDF, and a PDF whose issuer is recognised but whose statement month cannot be read, SHALL remain in the Box and SHALL be reported with a reason.

#### Scenario: A non-statement PDF is not filed
- **WHEN** the Box contains a product manual or any other PDF that matches no known statement series
- **THEN** it SHALL remain in the Box and be reported with reason `unclassified`

#### Scenario: A generically named statement is identified from its text
- **WHEN** a PDF's name identifies no series but its text matches exactly one known series and its statement month can be read
- **THEN** it SHALL be filed under that series' canonical name for that month, and the plan SHALL record that it was identified from content

#### Scenario: A recognised issuer with no readable month is not guessed
- **WHEN** a PDF's text matches a known series but no statement month can be read from it
- **THEN** it SHALL remain in the Box and be reported with reason `unclassified`

#### Scenario: A missing text extractor degrades instead of guessing
- **WHEN** the PDF text extractor is unavailable
- **THEN** files that need it SHALL be reported with reason `needs_text_tool` and every file identified by name SHALL still be filed

### Requirement: Filing is idempotent and every run is journalled
Re-running the job over an unchanged Box SHALL move nothing and SHALL report no filed or cleaned entries. Each run SHALL persist a record of what it filed, cleaned, left pending and skipped, together with the counts, and that record SHALL be readable after a page reload.

#### Scenario: A second run over an unchanged Box is a no-op
- **WHEN** the job runs twice in a row with no intervening change to the Box
- **THEN** the second run SHALL report zero filed and zero cleaned entries and SHALL NOT change the filesystem

#### Scenario: The last run survives a reload
- **WHEN** a run has completed and the user reloads the Finance view
- **THEN** the last run's timestamp and counts SHALL still be shown

#### Scenario: Every skipped file carries a reason
- **WHEN** a run leaves one or more files in the Box
- **THEN** each of them SHALL appear in the run record with a machine-readable reason

### Requirement: Misfiled, oddly named and unknown statements are reported, never silently changed
The job SHALL report — without moving or renaming anything — a statement found in the destination folder that the routing rule says belongs to the other destination, a file whose name does not match its series' canonical form, and a PDF in a destination folder that matches no known series.

#### Scenario: A misfiled statement is reported
- **WHEN** an MM Power statement is found in the A-Finance statement folder
- **THEN** it SHALL be reported as misfiled with its expected folder, and SHALL NOT be moved

#### Scenario: A name variant is reported
- **WHEN** a filed file matches a series but not that series' canonical name (for example a month written as `jul_26` instead of `jul26`)
- **THEN** it SHALL be reported as a name variant and SHALL NOT be renamed

#### Scenario: An unknown file name in a destination folder is reported
- **WHEN** a PDF in a destination folder matches no known series
- **THEN** it SHALL be reported under unknown names

### Requirement: The step reports which months are missing per series
For the current Hong Kong year, the job SHALL report, for every series that has at least one file in that year's destination folder, which of the twelve months are present and which are missing.

#### Scenario: A gapped series shows its missing months
- **WHEN** a series has files for some months of the current year and none for others
- **THEN** the report SHALL list the present months and the missing months for that series in the same year

#### Scenario: A series with no files in the year is not listed
- **WHEN** a known series has no file in the current year's destination folder
- **THEN** it SHALL NOT appear in the coverage report

### Requirement: The filing job is local only
The job SHALL read and write only the configured Box and destination roots, and SHALL make no network request and no upload of any kind.

#### Scenario: No external call is made
- **WHEN** a preview or a run executes
- **THEN** no HTTP, DNS or cloud-storage call SHALL be made by the job
