import os, subprocess, time, tempfile
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = "http://localhost:3000"
DB_PATH = os.path.join(tempfile.gettempdir(), 'attendance_test.db')

@pytest.fixture(scope="session")
def server():
    for f in (DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm'):
        try: os.remove(f)
        except FileNotFoundError: pass
    env = dict(os.environ)
    env['DB_PATH'] = DB_PATH
    env['PORT'] = '3000'
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(4)
    yield
    proc.terminate()
    proc.wait()
    for f in (DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm'):
        try: os.remove(f)
        except FileNotFoundError: pass

@pytest.fixture
def driver(server):
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    d = webdriver.Chrome(options=opts)
    d.implicitly_wait(5)
    yield d
    d.quit()

@pytest.fixture
def base_url():
    return BASE
