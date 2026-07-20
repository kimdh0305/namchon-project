# OCR Writer Index Spec

## Goal

`tools/ocr/build_writers_from_ocr.py` now supports assignment-based writer correction, manual overrides, and unmatched reporting while keeping `data/writers.json` compatible with the existing Reader.

## Inputs

### OCR input

- Required: JSONL file from `tools/ocr/ocr_extract.py`
- Required fields per row:
  - `book_id`
  - `page`
  - `name_raw`
- Optional fields used for reporting:
  - `source_path`

### Assignment input

- Optional: `.json`, `.csv`, or `.xlsx`
- Purpose: use assignment rows as a soft constraint for OCR name correction
- Supported logical columns:
  - writer name
  - book id or book name column already normalized to `book_id`
  - page start / page end
  - single page
  - chapter
  - group
- Column detection is keyword-based using `tools/ocr/config.py`

### Override input

- Optional: JSON
- Top-level keys:
  - `page_overrides`
  - `name_alias_overrides`
  - `assignment_overrides`

Example:

```json
{
  "page_overrides": [
    {
      "book_id": "genesis",
      "page": 12,
      "canonical_name": "홍길동"
    }
  ],
  "name_alias_overrides": [
    {
      "raw_name": "홍 길동",
      "canonical_name": "홍길동",
      "scope": {
        "book_id": "genesis"
      }
    }
  ],
  "assignment_overrides": [
    {
      "book_id": "genesis",
      "assignment_name": "홍길동",
      "assign_start": 1,
      "assign_end": 3,
      "canonical_name": "홍길동"
    }
  ]
}
```

## Matching rules

Priority order:

1. `page_overrides`
2. `name_alias_overrides`
3. assignment fuzzy match within the same book
4. raw OCR name fallback when no assignment candidates exist

Notes:

- Assignment page ranges are reference metadata only and are not written into `writers.json` entries.
- Final `start_page` and `end_page` values come only from OCR-observed pages.
- Fuzzy matching uses whitespace-insensitive normalized names.
- Final writer `name` values are normalized to Hangul-only text with spaces, digits, and special characters removed.
- Threshold is controlled by `ASSIGNMENT_NAME_FUZZY_CUTOFF` in `tools/ocr/config.py`.

## Outputs

### Writer index

- Output path: `--out`
- Default: `data/writers.json`
- Schema remains Reader-compatible:

```json
[
  {
    "writer_id": "홍길동A",
    "name": "홍길동",
    "entries": [
      {
        "book_id": "genesis",
        "page": 12,
        "start_page": 12,
        "end_page": 14,
        "line_hint": "center"
      }
    ]
  }
]
```

### Unmatched report

- Output path: `--report-out`
- Contains:
  - `unmatched_records`: OCR rows that had assignment candidates but no accepted name match
  - `unmatched_assignments`: assignment rows whose range had OCR pages but never produced a writer match

## CLI

Example:

```bash
python tools/ocr/build_writers_from_ocr.py \
  --input data/ocr_names.jsonl \
  --assignment data/assignment.csv \
  --overrides data/manual_writer_overrides.json \
  --out data/writers.json \
  --report-out data/writer_unmatched_report.json
```

Arguments:

- `--input`: OCR JSONL path
- `--assignment`: optional assignment table path (`.json`, `.csv`, or `.xlsx`)
- `--overrides`: optional manual override JSON path
- `--out`: writer index output path
- `--report-out`: optional unmatched report output path

## Operational flow

1. Run OCR extraction to produce JSONL.
2. Run `build_writers_from_ocr.py` with assignment and override inputs.
3. Review `writer_unmatched_report.json`.
4. Update `manual_writer_overrides.json` if needed.
5. Re-run `build_writers_from_ocr.py`.
6. Rebuild or redeploy the site if the deployment path uses generated static assets.

## Reader search behavior

- Reader search now ignores whitespace by default.
- Example: `홍 길 동` matches `홍길동`.