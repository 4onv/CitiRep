import os
import tempfile
import unittest
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from docx import Document
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from citirep.api import app, process_upload
from citirep.db import connect, save
from citirep.parse import enrich, parse


class BackendTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.environment = patch.dict(os.environ, {"CITIREP_DATA": self.folder.name})
        self.environment.start()
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.environment.stop()
        self.folder.cleanup()

    def test_upload_search_dedup_filters_and_isolation(self):
        content = b"Protected cycling lanes are proposed for 10 King Street North in Ward 2. Residents can review the plans."
        first = self.client.post('/api/documents/upload', files={'file': ('plan.txt', content)})
        self.assertEqual(first.status_code, 200)
        duplicate = self.client.post('/api/documents/upload', files={'file': ('plan.txt', content)})
        self.assertFalse(duplicate.json()['created'])
        result = self.client.get('/api/search', params={'q': 'bike', 'location': 'King Street', 'tag': 'transportation'}).json()
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['items'][0]['provenance'], 'user_upload')
        self.assertIn('cycling', result['items'][0]['excerpt'])
        self.assertEqual(self.client.get('/api/search', params={'q': 'bike', 'provenance': 'official'}).json()['total'], 0)
        self.assertEqual(self.client.get('/api/search', params={'q': '" OR * --'}).status_code, 200)
        with ThreadPoolExecutor(max_workers=3) as pool:
            uploads = list(pool.map(lambda _: process_upload(content, 'plan.txt', 'Concurrent plan', None), range(3)))
        self.assertEqual(len({item['id'] for item in uploads}), 1)
        self.assertEqual(sum(item['created'] for item in uploads), 1)

    def test_revisions_and_related_sources(self):
        text = b"Parking rules apply to all city parking lots and overnight parking permits."
        parsed, chunks = parse(text, 'parking.txt')
        record = enrich(parsed, 'https://www.waterloo.ca/example', 'official', 'bylaw', 'https://www.waterloo.ca/example', title='Parking bylaw')
        document_id, _ = save(record, chunks)
        self.assertFalse(save(record, chunks)[1])
        changed, chunks2 = parse(text + b' New parking fees take effect in January.', 'parking.txt')
        save(enrich(changed, record['identity'], 'official', 'bylaw', record['source_url'], title='Parking bylaw'), chunks2)
        self.assertEqual(len(self.client.get(f'/api/documents/{document_id}/revisions').json()), 2)
        original = self.client.get(f'/api/documents/{document_id}/revisions/1').json()
        self.assertNotIn('January', original['body'])
        upload = self.client.post('/api/documents/upload', files={'file': ('notice.txt', text)}).json()
        related = self.client.get(f"/api/documents/{upload['id']}").json()['related_bylaws']
        self.assertEqual(related[0]['relationship'], 'topic_match')

    def test_formats_and_rejections(self):
        document = Document()
        document.add_paragraph('A new housing development is proposed at King Street in Waterloo for public review.')
        buffer = BytesIO()
        document.save(buffer)
        self.assertEqual(self.client.post('/api/documents/upload', files={'file': ('plan.docx', buffer.getvalue())}).status_code, 200)
        self.assertEqual(self.client.post('/api/documents/upload', files={'file': ('bad.html', b'<html>bad</html>')}).status_code, 415)
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        buffer = BytesIO()
        writer.write(buffer)
        self.assertEqual(self.client.post('/api/documents/upload', files={'file': ('scan.pdf', buffer.getvalue())}).status_code, 422)
        self.assertEqual(self.client.post('/api/documents/upload', files={'file': ('big.txt', b'x' * (10 * 1024 * 1024 + 1))}).status_code, 413)

    def test_publication_date_and_navigation_removed(self):
        html = b'<h1>Notice</h1><main><span class="gs-news-details-date">Nov 02, 2026</span><section class="usn_cmp_text">New park construction will start on King Street. Read the public report.</section><nav>Unrelated noise parking fees</nav></main>'
        parsed, _ = parse(html, 'page', 'https://www.waterloo.ca/news/posts/example/')
        self.assertEqual(parsed['published_at'], '2026-11-02')
        self.assertNotIn('Unrelated', parsed['body'])
        parsed, _ = parse(b'<title>Project</title><h1></h1><h1>Waterloo Park Plan</h1><main>The City is updating the park plan and invites residents to share their ideas.</main>', 'page')
        self.assertEqual(parsed['title'], 'Waterloo Park Plan')

    def test_transaction_rolls_back_partial_index_write(self):
        parsed, chunks = parse(b'Council is considering a new cycling plan for Waterloo streets this year.', 'plan.txt')
        record = enrich(parsed, 'test', 'user_upload', 'document')
        with self.assertRaises(KeyError):
            save(record, [chunks[0], {}])
        with connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM documents').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM search_index').fetchone()[0], 0)


if __name__ == '__main__':
    unittest.main()
