"""Portable, compressed database seed for teammates. Official-source data only."""
import argparse
import gzip
import shutil
import sqlite3
import tempfile
from pathlib import Path

from .db import connect, data_dir


def export_snapshot(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        snapshot = Path(directory) / 'snapshot.sqlite'
        with connect() as source:
            destination = sqlite3.connect(snapshot)
            try:
                source.backup(destination)
                if destination.execute("SELECT count(*) FROM documents WHERE provenance!='official'").fetchone()[0]:
                    raise ValueError('Export requires an official-only database. User uploads cannot be bundled in the seed.')
            finally:
                destination.close()
        with snapshot.open('rb') as source, gzip.open(path, 'wb') as target:
            shutil.copyfileobj(source, target)
    print(f'Exported {path} ({path.stat().st_size:,} bytes)')


def import_snapshot(path):
    destination = data_dir() / 'citirep.sqlite'
    if destination.exists():
        raise ValueError('Database already exists. Use a fresh CITIREP_DATA directory to import a seed.')
    temporary = destination.with_suffix('.importing')
    try:
        with gzip.open(path, 'rb') as source, temporary.open('xb') as target:
            shutil.copyfileobj(source, target)
        db = sqlite3.connect(temporary)
        try:
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise ValueError('Seed database failed integrity validation')
        finally:
            db.close()
        temporary.rename(destination)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'Imported {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['export', 'import'])
    parser.add_argument('path', type=Path)
    args = parser.parse_args()
    if args.action == 'export':
        export_snapshot(args.path)
    else:
        import_snapshot(args.path)
