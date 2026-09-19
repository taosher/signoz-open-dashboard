---
name: signoz-searching-docs
description: >
  Look up information in SigNoz documentation. Make sure to use this skill
  whenever the user asks "how do I", "where in the docs", "what does the
  docs say about", "find docs for", or otherwise needs reference material
  on SigNoz instrumentation, OpenTelemetry setup, self-hosted deployment,
  API endpoints, auth headers, or troubleshooting steps, even if they
  don't say the word "docs" explicitly. Docs lookup only; for actions
  inside SigNoz, the agent will pick the matching `signoz-*` action skill.
---

# SigNoz Docs

Use official `signoz.io` documentation and API references only. Ground every answer in fetched docs content and cite the canonical docs URL.

## Access Docs

Prefer the SigNoz MCP server tools when available; fall back to direct HTTP fetch.

### Preferred: MCP tools

- `signoz_search_docs`: keyword search over the indexed docs corpus. Pass 2 to 6 keywords for one topic as `searchText`, for example `Kubernetes pod logs`; keep product and technology names as the user wrote them and drop filler such as "how do I" or "please". Do not pass the whole question sentence. When the question contains only one usable term, such as `Retention?`, send that term alone rather than padding or inventing keywords. Split a question with two intents into two calls. Narrow with `section_slug` when the question maps cleanly to a single docs section; reuse a `section_slug` from an earlier result rather than guessing one, and defer to the tool's parameter descriptions for slug and ranking behavior. If the top result is off-topic, retry once with fewer or different terms before answering; for a single-term question, retry with a synonym or one added contextual term, such as `data retention` for `Retention?`.
- `signoz_fetch_doc`: markdown for one indexed page. Pass the canonical URL or `/docs/...` path; optionally narrow to a section with `heading`. Inspect `truncation_reason` and `available_headings` in every response rather than assuming the returned `content` is complete.

Never call `signoz_search_docs` with empty `searchText`; pass keywords taken from the user's question, adding a synonym or contextual term only for the retry described above.
Never call `signoz_fetch_doc` without a URL; neither tool guesses missing input.
`signoz://...` URIs are MCP resources: read them through the MCP resource API,
never `signoz_fetch_doc`, which accepts only `https://signoz.io/docs/...` URLs
or `/docs/...` paths and rejects other scopes.

Never construct `/docs/...` URLs from memory. Only pass URLs returned by
`signoz_search_docs` to `signoz_fetch_doc`; if you think you already know the
page path, search first and fetch the canonical URL from the result.

### Fallback: direct HTTP fetch

If the MCP tools are unavailable, SigNoz docs support `Accept: text/markdown` natively.

Discover via the sitemap:

```
GET https://signoz.io/docs/sitemap.md
```

Fetch a specific page:

```
GET https://signoz.io/docs/<path>/
Accept: text/markdown
```

## Workflow

1. **Identify the domain** from the user's question: instrumentation, OpenTelemetry setup, querying, dashboards, alerts, troubleshooting, deployment, or API docs.
2. **Check the heuristics table below**. If a heuristic matches, read it before answering: heuristics encode product decisions (which path/method fits the user's environment), useful in both paths.
3. **Search and fetch**: pick the path based on tool availability:
   - **With MCP tools**: call `signoz_search_docs` with 2 to 6 keywords from the user's question (or the single term when that is all it contains); pass `section_slug` if the domain maps cleanly to one. Read the top 1-3 results and call `signoz_fetch_doc` on the chosen URL (use `heading` to narrow if the page is large and the question is sub-section-specific). If the top result is off-topic, retry once with fewer or different terms (or a synonym for a single-term question).
   - **Without MCP tools**: grep `sitemap.md` for candidate pages, rank the best 2-5 by how directly they answer the task, and `GET` only URLs discovered in the sitemap with `Accept: text/markdown`. Heuristic coverage is sparse; for topics without a heuristic row, skim the sitemap by section path and prefer setup/troubleshooting/API-reference pages over overviews.
   - Fetch **one page** for narrow questions; fetch **multiple pages** when the task spans setup + troubleshooting, or method-selection + language guide. Keep the set small.
4. **Handle truncated fetches before answering.** When `signoz_fetch_doc` returns `truncation_reason: "size"`, treat `content` as an incomplete prefix. Select the most relevant entry from `available_headings` and refetch the same search-result URL with that `heading`. If no heading covers the question, or the narrowed response is still truncated before the needed material, disclose that the fetched documentation is incomplete and do not infer that omitted content or a setting does not exist.
5. **Answer from the fetched docs** and cite canonical `https://signoz.io/docs/...` URLs.
6. **Handle ambiguity deliberately**: if multiple pages are plausible, prefer the one that completes the task most directly; mention alternates only when they materially change the answer.

## Message Actions

On the terminal answer, emit FE-handoff actions per the SigNoz Skills & MCP spec:

- **`open_docs`**: include with the canonical URL of the primary cited page. Docs lookups are precisely the case where deep-linking to the source page helps the user read in context and verify the answer.
- **`follow_up`**: 1-2 next-step prompts that build on a docs answer. After a setup guide: *"walk me through the first command"* or *"what's a common gotcha here?"*. After a concept page: *"show me a worked example."*
- **Do NOT emit `apply_filter`.** Docs answers do not produce a query for an explorer page; emitting `apply_filter` would overwrite the user's working query.

Verbatim guardrail: *When answering a SigNoz docs question, include an `open_docs` action on the final message with the canonical URL of the primary cited page.*

## Domain Heuristics

Read the matching heuristic file **before** fetching docs. Each file contains decision logic to route the user to the right guide.

| Topic | Trigger keywords | Heuristic file |
|---|---|---|
| Sending Logs | logs, log collection, logging, send logs | [sending-logs.md](./heuristics/sending-logs.md) |
