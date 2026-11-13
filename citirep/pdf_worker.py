"""Isolate CPU-heavy PDF extraction so the parent can enforce a time limit."""
import json
import sys

from .parse import parse_direct


def main():
    try:
        parsed, chunks = parse_direct(sys.stdin.buffer.read(), sys.argv[1], sys.argv[2])
        output = {'parsed': parsed, 'chunks': chunks}
    except Exception as error:
        output = {'error': str(error)}
    sys.stdout.buffer.write(json.dumps(output, ensure_ascii=False).encode('utf-8'))


if __name__ == '__main__':
    main()
