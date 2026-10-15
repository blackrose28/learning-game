"""Regression tests for advisory-only routing; uses the real hook stdin/stdout."""
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

HOOK = Path(__file__).with_name('route-code-reads.py')


class RouteCodeReadsTests(unittest.TestCase):
    def invoke(
        self,
        response=None,
        *,
        tool='Bash',
        tool_input=None,
        event='PostToolUse',
        disabled=False,
        raw=None,
    ):
        payload = (
            raw
            if raw is not None
            else json.dumps(
                {
                    'hook_event_name': event,
                    'tool_name': tool,
                    'tool_input': tool_input or {},
                    'tool_response': response,
                }
            )
        )
        env = {
            **os.environ,
            'ROUTE_HOOK': 'off' if disabled else 'on',
            'HAPI_ROUTE_HOOK': 'off' if disabled else 'on',
        }
        result = subprocess.run(
            [sys.executable, str(HOOK)],
            input=payload,
            capture_output=True,
            text=True,
            env=env,
            timeout=5,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, '')
        if not result.stdout:
            return None
        output = json.loads(result.stdout)
        self.assertEqual(set(output), {'hookSpecificOutput'})
        hook = output['hookSpecificOutput']
        self.assertEqual(set(hook), {'hookEventName', 'additionalContext'})
        self.assertEqual(hook['hookEventName'], 'PostToolUse')
        self.assertIn('Advisory only', hook['additionalContext'])
        return hook['additionalContext']

    def test_small_actual_output_is_quiet_regardless_of_command(self):
        for command in (
            'cat huge.ts',
            'rg -n needle .',
            'grep -r needle .',
            'sed -n "1,12p" src/code.ts',
            'head src/code.ts',
            'cat src/code.ts > /tmp/output',
            'echo "cat huge.ts"',
            'python3 - <<EOF\nprint("cat huge.ts")\nEOF',
        ):
            with self.subTest(command=command):
                self.assertIsNone(
                    self.invoke(
                        {'stdout': 'small\n', 'stderr': ''},
                        tool_input={'command': command},
                    )
                )

    def test_limits_measure_returned_text_not_source_or_metadata(self):
        for text in ('x\n' * 300, 'x' * 16384, 'é' * 8192):
            with self.subTest(length=len(text)):
                self.assertIsNone(self.invoke(text))
        self.assertIsNone(
            self.invoke(
                {
                    'type': 'text',
                    'file': {
                        'content': 'a small bounded read',
                        'numLines': 10,
                        'totalLines': 100000,
                        'filePath': 'x' * 20000,
                    },
                },
                tool='Read',
                tool_input={'file_path': 'big.ts', 'offset': 1, 'limit': 10},
            )
        )
        for text in ('x\n' * 301, 'x' * 16385, 'é' * 8193):
            with self.subTest(length=len(text)):
                self.assertIsNotNone(self.invoke(text))

    def test_supported_response_shapes_and_combined_streams(self):
        for response in (
            {'stdout': 'x\n' * 301},
            {'stderr': 'x\n' * 301},
            {'stdout': 'x\n' * 150, 'stderr': 'x\n' * 151},
            {'output': 'x\n' * 301},
            {'content': [{'type': 'text', 'text': 'x\n' * 301}]},
            {'type': 'text', 'file': {'content': 'x\n' * 301}},
        ):
            with self.subTest(shape=list(response)):
                self.assertIn('301 lines', self.invoke(response))
        self.assertIn('16386 UTF-8 bytes', self.invoke('é' * 8193))

    def test_large_plan_output_gets_focused_hint(self):
        for tool, tool_input in (
            ('Read', {'file_path': '/repo/docs/reasoning-missions-plan.md'}),
            ('Bash', {'command': 'cat math-archer-plan.md'}),
        ):
            with self.subTest(tool=tool):
                hint = self.invoke('x\n' * 301, tool=tool, tool_input=tool_input)
                self.assertIn('--recall=', hint)

    def test_fail_open_and_never_interferes_with_pretooluse(self):
        for raw in ('', '{bad json', '[]', 'null', '{"tool_input":42}'):
            with self.subTest(raw=raw):
                self.assertIsNone(self.invoke(raw=raw))
        self.assertIsNone(self.invoke('x' * 20000, event='PreToolUse'))
        self.assertIsNone(self.invoke('x' * 20000, disabled=True))
        self.assertIsNone(self.invoke('x' * 20000, tool='Edit'))
        self.assertIsNone(self.invoke({'image': 'x' * 20000}))
        self.assertIsNone(self.invoke())

    def test_project_registration_is_posttooluse_only(self):
        settings = json.loads(HOOK.parent.parent.joinpath('settings.json').read_text())
        registrations = [
            (event, entry)
            for event, entries in settings['hooks'].items()
            for entry in entries
            for hook in entry['hooks']
            if 'route-code-reads.py' in hook['command']
        ]
        self.assertEqual(len(registrations), 1)
        self.assertEqual(registrations[0][0], 'PostToolUse')
        self.assertEqual(registrations[0][1]['matcher'], 'Bash|Read')


if __name__ == '__main__':
    unittest.main()

