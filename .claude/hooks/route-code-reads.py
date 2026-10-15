#!/usr/bin/env python3
"""PostToolUse advisory for actual large Bash/Read output; never gates a call.

No command execution, file inspection, or predictions from command syntax.
Fail open on unsupported payloads/errors. Disable: ROUTE_HOOK=off.
"""
import json
import os
import sys

MAX_LINES = 300
MAX_BYTES = 16 * 1024


def output_text(response):
    """Extract returned text, ignoring metadata (paths, commands, line counts)."""
    if isinstance(response, str):
        yield response
    elif isinstance(response, list):
        for item in response:
            yield from output_text(item)
    elif isinstance(response, dict):
        for key in ('stdout', 'stderr', 'output', 'text', 'content', 'file'):
            if key in response:
                yield from output_text(response[key])


def is_plan_target(target):
    return (
        'math-archer-plan.md' in target
        or 'SYNC_CHECKLIST.md' in target
        or 'docs/' in target
    )


def main():
    if os.environ.get('ROUTE_HOOK') == 'off' or os.environ.get('HAPI_ROUTE_HOOK') == 'off':
        return
    data = json.load(sys.stdin)
    if data.get('hook_event_name') != 'PostToolUse':
        return
    if data.get('tool_name') not in ('Bash', 'Read'):
        return
    lines = size = 0
    for text in output_text(data.get('tool_response')):
        lines += text.count('\n') + int(bool(text) and not text.endswith('\n'))
        size += len(text.encode('utf-8'))
    if lines <= MAX_LINES and size <= MAX_BYTES:
        return
    tool_input = data.get('tool_input') or {}
    target = tool_input.get('file_path', '') + tool_input.get('command', '')
    hint = (
        'Consider `ripwire . --recall="<topic>"` for plan/spec sections.'
        if is_plan_target(target)
        else 'For code, consider `ripwire . --expand=SYM --top-k=0` or a focused search.'
    )
    print(
        json.dumps(
            {
                'hookSpecificOutput': {
                    'hookEventName': 'PostToolUse',
                    'additionalContext': (
                        f'Output advisory: this call returned {lines} lines / {size} UTF-8 bytes. '
                        f'{hint} For logs/tests/data, summarize or bound output; exact editing '
                        'bytes are fine. Advisory only; choose the tool/read scope you need.'
                    ),
                }
            }
        )
    )


if __name__ == '__main__':
    try:
        main()
    except Exception:
        pass

