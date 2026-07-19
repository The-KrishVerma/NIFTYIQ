# NIFTYIQ Qualitative Extraction Plan

## Goal
- Process NIFTY 500 companies in batches of 50 per day.
- For each company, run:
  1. Scraper (download 2 annual reports per company)
  2. Unzip cleanup
  3. Quantitative yfinance metrics extraction
  4. Qualitative Gemini extraction (one API call per PDF + quant JSON per company)
- Track progress in `data/progress.json` with fields:
  - scraper, scraping_done, unzip_done
  - quantitative_done, quantitative_completed, quantitative_pending
  - ai_extraction_started, ai_extraction_done, ai_extraction_completed, ai_extraction_pending

## Files
- `scraper/symbols.py` → NIFTY 500 symbols
- `scraper/scraper.py` → downloads 2 records via NSE API
- `scraper/unzip.py` → unzip and flatten PDFs
- `scraper/quantitative_fetcher.py` → fetch yfinance quant metrics, return completed/failed, callback
- `scraper/ai_extractor.py` → read prompt + schema, run Gemini model per file, save to JSON/PDF
- `scraper/pipeline.py` → orchestrate all steps and progress updates

## Daily run behavior
- Each run loads `data/progress.json`.
- If pipeline runs for AI, process up to `max_per_day=50` companies.
- Use callback updates to save progress after each company.
- For AI, include `ai_system_prompt.md` and `ai_schema.json` as context.

## Output
- Scraped PDFs in `data/reports/{symbol}`
- Quant JSON in `data/quantitative/{symbol}_quant.json`
- AI outputs in `data/qualitative_insights/{symbol}`
- Progress JSON as above

## Notes
- Keep API output tokens low via short prompts and targeted schema.
- Ensure one API call per company for qualitative extraction.
- If a company fails, it stays pending for retries.
