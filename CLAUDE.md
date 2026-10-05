<!-- ripwire:start -->

# ripwire — Code Intelligence

This repo uses [ripwire](https://github.com/redhat-et/ripwire) for ranked call-graph navigation: who
calls what, what a change breaks, which tests to run. It is a single binary — no server, no daemon, and
nothing is written into the repo.

## Always Do

- **Always pass `--legend=compact`.** Every XML verb ships a self-describing legend, and the full posture
  costs ~2–3K tokens _per call_ — enough to erase the savings the tool exists to provide. The prose verbs
  (`--situ`, `--doctor`, `--help-task`) take no `--legend` flag at all.
- **Before editing a function or method, run `ripwire . --impact=SYM --legend=compact`** and report the
  blast radius. Add `--uses=SYM` when you need individual call sites rather than counts.
- **Before committing, run `ripwire . --situ`** for the changed files' blast radius and covering tests.
- When exploring unfamiliar code, use `ripwire . --for="concept" --legend=compact` rather than grepping —
  it returns a ranked, token-budgeted bundle instead of raw matches.
- **Read every count as a floor, never a total.** ripwire says so in-band (`counts_floor="1"`): edges are
  extracted from source text by name, so dynamic dispatch, callback tables and reassigned function
  pointers are missed by construction.

## Commands

| Task                                     | Command                                             |
| ---------------------------------------- | --------------------------------------------------- |
| Orient in a repo or directory            | `ripwire . --legend=compact --max-tokens=3000`      |
| Where is X handled?                      | `ripwire . --for="…" --legend=compact`              |
| Who calls this?                          | `ripwire . --callers=SYM --legend=compact`          |
| What does it call?                       | `ripwire . --callees=SYM --legend=compact`          |
| Every use site, with roles               | `ripwire . --uses=SYM --legend=compact`             |
| Is it safe to change?                    | `ripwire . --impact=SYM --legend=compact`           |
| I changed files — tests and blast radius | `ripwire . --situ`                                  |
| Show one symbol's body                   | `ripwire . --expand=SYM --top-k=0 --legend=compact` |
| Which command do I want?                 | `ripwire . --help-task="<task in words>"`           |
| Is the setup healthy?                    | `ripwire . --doctor`                                |

`--format=rows` or `--format=columnar` shrink the flat list verbs (`--callers`, `--callees`, `--uses`,
`--impact`) further. Selectors accept `path/to/file.ts:symbolName` to disambiguate an overloaded name.

## Reflexes (CLI-first; OpenCode, Codex and Pi read this file automatically)

- One task, one call: `ripwire . --pack-task="<task>" --legend=compact` (ranking + bodies + callers + tests).
- Before writing a new fn/class/helper: `ripwire . --exemplar="<what you're writing>" --legend=compact`.
- Before calling work done: `ripwire . --quality-delta --legend=compact`, then `ripwire . --test-gate --legend=compact`.
- Have a stack trace / build error: `ripwire . --from-trace=FILE --legend=compact` (`-` = stdin) — paste verbatim.
- MCP alternative (warm in-memory index, project `.mcp.json` / `opencode.json` already register it): 31 verbs —
  read (`for`, `find_symbol`, `grep`, `explore`, `fetch_body`, `batch`, …), flagship reflexes (`impact`,
  `uses`, `exemplar`, `quality_delta`, `edit_check`, `from_trace`, …), edits (`replace_symbol_body`, …).

<!-- ripwire:end -->
