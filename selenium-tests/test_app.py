import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

def test_login_and_dashboard(driver, base_url):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys("admin")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    assert "Dashboard" in driver.page_source or "Students" in driver.page_source

def test_add_student(driver, base_url):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys("admin")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    driver.get(base_url + "/students/new")
    time.sleep(1)
    driver.find_element(By.NAME, "roll_no").send_keys("R001")
    driver.find_element(By.NAME, "name").send_keys("Test Student")
    driver.find_element(By.NAME, "department").send_keys("CSE")
    driver.find_element(By.NAME, "semester").send_keys("3")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    assert "R001" in driver.page_source

def test_mark_attendance(driver, base_url):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys("admin")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    driver.get(base_url + "/attendance")
    time.sleep(1)
    sel = Select(driver.find_element(By.CSS_SELECTOR, "select[name^=status_]"))
    sel.select_by_value("present")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    assert "attendance" in driver.current_url or "Attendance" in driver.page_source

def test_attendance_percentage(driver, base_url):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys("admin")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    driver.get(base_url + "/attendance/percentage")
    time.sleep(1)
    assert "Percentage" in driver.page_source

def test_enter_marks_and_report(driver, base_url):
    driver.get(base_url + "/login")
    driver.find_element(By.NAME, "username").send_keys("admin")
    driver.find_element(By.NAME, "password").send_keys("admin123")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    driver.get(base_url + "/marks/new")
    time.sleep(1)
    Select(driver.find_element(By.NAME, "student_id")).select_by_index(1)
    driver.find_element(By.NAME, "subject").send_keys("Maths")
    driver.find_element(By.NAME, "marks").send_keys("85")
    driver.find_element(By.NAME, "semester").send_keys("3")
    driver.find_element(By.CSS_SELECTOR, "button[type=submit]").click()
    time.sleep(2)
    driver.get(base_url + "/reports")
    time.sleep(1)
    assert "Avg Marks" in driver.page_source or "Maths" in driver.page_source or "85" in driver.page_source
